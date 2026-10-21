// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { createDataClient } from "nodula-framework/data";

/** Largest number of documents `list` collects, so one call stays predictable. */
const LIST_LIMIT = 1000;
/** Documents requested per page while `list` follows `nextPageToken`. */
const LIST_PAGE_SIZE = 300;
/** Most requests one `list` makes, so a server that keeps returning empty pages still ends. */
const LIST_MAX_REQUESTS = Math.ceil(LIST_LIMIT / LIST_PAGE_SIZE) + 1;

/**
 * Check that a value is a non-empty string.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
const isFilled = (value) => typeof value === "string" && value.trim() !== "";

/**
 * Check that a value is a positive integer.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

/**
 * Convert a plain JavaScript value to a Firestore typed value.
 *
 * @param {unknown} value
 * @returns {object}
 * @throws {TypeError} For NaN, Infinity, an invalid Date, or an array directly inside an array.
 */
function toValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime()))
      throw new TypeError("createFirebaseAdapter: cannot store an invalid Date.");
    return { timestampValue: value.toISOString() };
  }
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new TypeError(`createFirebaseAdapter: cannot store ${value}; numbers must be finite.`);
    // Integral numbers beyond 2**53 would stringify as "1e+21", which integerValue rejects.
    return Number.isSafeInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => {
          if (Array.isArray(item))
            throw new TypeError(
              "createFirebaseAdapter: Firestore does not allow an array nested directly in an array; wrap it in an object.",
            );
          return toValue(item);
        }),
      },
    };
  }
  return { mapValue: { fields: toFields(value) } };
}

/**
 * Convert a plain object to Firestore `fields`. The `id` key is not stored and `undefined` values are
 * omitted, like JSON.
 *
 * @param {object} data
 * @returns {Record<string, object>}
 */
function toFields(data) {
  // fromEntries defines own keys, so a "__proto__" key is kept instead of hitting the setter.
  return Object.fromEntries(
    Object.entries(data ?? {})
      .filter(([key, value]) => key !== "id" && value !== undefined)
      .map(([key, value]) => [key, toValue(value)]),
  );
}

/**
 * Convert a Firestore typed value to a plain JavaScript value.
 *
 * Timestamps become `Date` objects; unsupported types (reference, geo point, bytes) are returned as sent.
 *
 * @param {object} value
 * @returns {unknown}
 */
function fromValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  // Firestore sends NaN and the infinities as strings.
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return new Date(value.timestampValue);
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(fromValue);
  if ("mapValue" in value) return fromFields(value.mapValue.fields);
  return value.referenceValue ?? value.geoPointValue ?? value.bytesValue;
}

/**
 * Convert Firestore `fields` to a plain object.
 *
 * @param {Record<string, object>|undefined} fields
 * @returns {Record<string, unknown>}
 */
function fromFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromValue(value)]));
}

/**
 * Convert a Firestore document to a plain record whose `id` is the last segment of the document name.
 *
 * @param {{name?: string, fields?: object}} doc
 * @returns {Record<string, unknown>}
 */
function toRecord(doc) {
  return {
    ...fromFields(doc?.fields),
    id: String(doc?.name ?? "")
      .split("/")
      .pop(),
  };
}

/**
 * Quote a field name for an update mask when it is not a simple identifier.
 *
 * @param {string} key
 * @returns {string}
 */
const fieldPath = (key) =>
  /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : `\`${key.replace(/[\\`]/g, "\\$&")}\``;

/**
 * Create a Firestore (REST API) adapter for one collection, built on the data add-on.
 *
 * Plain values are converted to and from Firestore typed values: integers, doubles, strings, booleans,
 * null, arrays and nested objects. `Date` objects are stored as timestamps and read back as `Date`;
 * ISO date strings stay strings. The record `id` is the last segment of the document name and is not
 * stored as a field. `list` follows `nextPageToken` and returns at most 1000 documents in Firestore's default order (document name ascending, as the list endpoint documents when `orderBy` is absent);
 * use `listPage` for larger collections.
 *
 * `getToken` runs before every request and its result is never cached. A non-empty string is sent as
 * `Authorization: Bearer <token>`; null, undefined or "" send none from the adapter. Precedence: per-call
 * `headers.Authorization`, then `getToken`, then the adapter `headers`. If `getToken` throws or rejects,
 * no request is sent and the error propagates.
 * With the auth add-on: `getToken: () => auth.session()?.token` (the session shape is app-defined).
 *
 * @param {object} config
 * @param {string} config.projectId Firebase project id.
 * @param {string} config.collection Collection id.
 * @param {string} [config.databaseId] Database id, default `(default)`.
 * @param {HeadersInit} [config.headers] Headers sent with every request.
 * @param {typeof fetch} [config.fetcher] Fetch-compatible transport.
 * @param {() => string|null|undefined|Promise<string|null|undefined>} [config.getToken] Current user token.
 * @returns {{list: Function, listPage: Function, get: Function, create: Function, update: Function, delete: Function}}
 * @throws {TypeError} When projectId, collection or databaseId is not a non-empty string, or getToken is not a function.
 */
export function createFirebaseAdapter({
  projectId,
  collection,
  databaseId = "(default)",
  getToken,
  headers,
  fetcher,
} = {}) {
  if (!isFilled(projectId))
    throw new TypeError("createFirebaseAdapter expects projectId to be a non-empty string.");
  if (!isFilled(collection))
    throw new TypeError("createFirebaseAdapter expects collection to be a non-empty string.");
  if (!isFilled(databaseId))
    throw new TypeError("createFirebaseAdapter expects databaseId to be a non-empty string.");
  if (getToken !== undefined && typeof getToken !== "function")
    throw new TypeError("createFirebaseAdapter expects getToken to be a function.");
  const documents = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents`;
  const client = createDataClient({ baseURL: documents, headers, fetcher });
  const root = `/${encodeURIComponent(collection)}`;
  /**
   * Build the path of one document.
   *
   * @param {string|number} id
   * @returns {string}
   */
  const docPath = (id) => `${root}/${encodeURIComponent(id)}`;
  /**
   * Add the current token as a per-call Authorization header; the caller's own headers still win.
   *
   * @param {object} [options] Caller options.
   * @returns {Promise<object>}
   */
  const authed = async (options = {}) => {
    const token = await getToken?.();
    if (!isFilled(token)) return options;
    const merged = new Headers({ authorization: `Bearer ${token}` });
    new Headers(options.headers).forEach((value, key) => merged.set(key, value));
    return { ...options, headers: merged };
  };
  /**
   * Run a structured query against the documents root.
   *
   * @param {string} method `runQuery` or `runAggregationQuery`.
   * @param {object} body
   * @param {object} options
   * @returns {Promise<unknown[]>}
   */
  const query = async (method, body, options) => {
    const result = await client.post(`${documents}:${method}`, body, await authed(options));
    if (!Array.isArray(result))
      throw new Error(`createFirebaseAdapter: ${method} response is not an array.`);
    return result;
  };

  return {
    /**
     * Fetch the documents of the collection, following `nextPageToken` up to 1000 documents.
     *
     * @param {object} [options] `params`, `signal` and `headers`.
     * @returns {Promise<Record<string, unknown>[]>} Plain records in Firestore's default order (document name ascending; no `orderBy` is sent).
     */
    async list({ params, ...options } = {}) {
      const records = [];
      let pageToken;
      let requests = 0;
      do {
        requests += 1;
        const body = await client.get(root, {
          ...(await authed(options)),
          params: { ...params, pageSize: LIST_PAGE_SIZE, ...(pageToken && { pageToken }) },
        });
        records.push(...(body?.documents ?? []).map(toRecord));
        pageToken = body?.nextPageToken;
      } while (pageToken && records.length < LIST_LIMIT && requests < LIST_MAX_REQUESTS);
      return records.slice(0, LIST_LIMIT);
    },
    /**
     * Fetch one page of records with paging metadata.
     *
     * @param {object} [options] `page` (1-based, default 1), `perPage` (default 30), `signal` and `headers`.
     * @returns {Promise<{items: Record<string, unknown>[], page: number, perPage: number, totalItems: number, totalPages: number}>}
     * @throws {TypeError} When page or perPage is not a positive integer.
     */
    async listPage({ page = 1, perPage = 30, ...options } = {}) {
      if (!isPositiveInteger(page))
        throw new TypeError(
          "createFirebaseAdapter: listPage expects page to be a positive integer.",
        );
      if (!isPositiveInteger(perPage))
        throw new TypeError(
          "createFirebaseAdapter: listPage expects perPage to be a positive integer.",
        );
      const from = [{ collectionId: collection }];
      const [rows, counts] = await Promise.all([
        query(
          "runQuery",
          {
            structuredQuery: {
              from,
              orderBy: [{ field: { fieldPath: "__name__" }, direction: "ASCENDING" }],
              offset: (page - 1) * perPage,
              limit: perPage,
            },
          },
          options,
        ),
        query(
          "runAggregationQuery",
          {
            structuredAggregationQuery: {
              structuredQuery: { from },
              aggregations: [{ alias: "count", count: {} }],
            },
          },
          options,
        ),
      ]);
      const totalItems = Number(counts[0]?.result?.aggregateFields?.count?.integerValue ?? 0);
      return {
        items: rows.filter((row) => row.document).map((row) => toRecord(row.document)),
        page,
        perPage,
        totalItems,
        totalPages: Math.ceil(totalItems / perPage),
      };
    },
    /**
     * Fetch one record.
     *
     * @param {string|number} id
     * @param {object} [options]
     * @returns {Promise<Record<string, unknown>>}
     */
    get: async (id, options) => toRecord(await client.get(docPath(id), await authed(options))),
    /**
     * Create a record; Firestore generates the id.
     *
     * @param {object} data
     * @param {object} [options]
     * @returns {Promise<Record<string, unknown>>} The created record.
     */
    create: async (data, options) =>
      toRecord(await client.post(root, { fields: toFields(data) }, await authed(options))),
    /**
     * Update the given fields of a record and leave the others untouched. A missing document rejects with the server's `DataError` (404).
     *
     * @param {string|number} id
     * @param {object} patch
     * @param {object} [options]
     * @returns {Promise<Record<string, unknown>>} The full updated record.
     */
    async update(id, patch, { params, ...options } = {}) {
      const fields = toFields(patch);
      const keys = Object.keys(fields);
      // Without a mask Firestore replaces the whole document, so an empty patch only reads it.
      if (keys.length === 0) return toRecord(await client.get(docPath(id), await authed(options)));
      const mask = new URLSearchParams(params);
      // Without this precondition PATCH creates a missing document; with it the server answers 404.
      mask.set("currentDocument.exists", "true");
      for (const key of keys) mask.append("updateMask.fieldPaths", fieldPath(key));
      return toRecord(
        await client.patch(docPath(id), { fields }, { ...(await authed(options)), params: mask }),
      );
    },
    /**
     * Delete a record.
     *
     * @param {string|number} id
     * @param {object} [options]
     * @returns {Promise<undefined>}
     */
    async delete(id, options) {
      await client.delete(docPath(id), await authed(options));
    },
  };
}
