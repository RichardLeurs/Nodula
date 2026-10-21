// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { createDataClient } from "nodula-framework/data";

/**
 * Check that a value is a non-empty string.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
const isFilled = (value) => typeof value === "string" && value.trim() !== "";

/**
 * Merge header sets; later sets win.
 *
 * @param {...HeadersInit|undefined} sets
 * @returns {Headers}
 */
function mergeHeaders(...sets) {
  const merged = new Headers();
  for (const set of sets) new Headers(set).forEach((value, key) => merged.set(key, value));
  return merged;
}

/**
 * Merge query parameters; `forced` wins over `params`, which wins over `defaults`.
 *
 * @param {object|URLSearchParams|undefined} params Caller parameters.
 * @param {object} defaults
 * @param {object} [forced]
 * @returns {object|URLSearchParams}
 */
function mergeParams(params, defaults, forced = {}) {
  if (params instanceof URLSearchParams) {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(defaults))
      if (!merged.has(key)) merged.set(key, value);
    for (const [key, value] of Object.entries(forced)) merged.set(key, value);
    return merged;
  }
  return { ...defaults, ...params, ...forced };
}

/**
 * Check that a value is a positive integer.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

/**
 * Read the total row count from a PostgREST `Content-Range` header such as `0-29/123`.
 *
 * @param {Headers|undefined} headers
 * @returns {number|undefined} The total, or undefined when absent or unknown (`*`).
 */
function readTotal(headers) {
  const match = /\/(\d+)$/.exec(headers?.get?.("content-range") ?? "");
  return match ? Number(match[1]) : undefined;
}

/**
 * Create a REST adapter for one Supabase table (PostgREST), built on the data add-on.
 *
 * Every request sends `apikey` and, unless you pass your own `Authorization` header in `headers`,
 * `Authorization: Bearer <apiKey>`. A missing or row-level-security-filtered row makes
 * `get` and `update` reject with a `DataError` (HTTP 406).
 *
 * `getToken` runs before every request and its result is never cached. A non-empty string is sent as
 * `Authorization: Bearer <token>` (`apikey` is still sent); null, undefined or "" fall back to the default
 * `Bearer <apiKey>`. Precedence: per-call `headers.Authorization`, then `getToken`, then the adapter
 * `headers`, then the default. If `getToken` throws or rejects, no request is sent and the error propagates.
 * With the auth add-on: `getToken: () => auth.session()?.access_token` (the session shape is app-defined).
 *
 * @param {object} config
 * @param {string} config.baseURL PostgREST root, ending in `/rest/v1`.
 * @param {string} config.apiKey Project API key (anon or user-scoped).
 * @param {string} config.table Table name.
 * @param {string} [config.idColumn="id"] Column used to find one row.
 * @param {HeadersInit} [config.headers] Headers sent with every request; they override the defaults.
 * @param {typeof fetch} [config.fetcher] Fetch-compatible transport.
 * @param {() => string|null|undefined|Promise<string|null|undefined>} [config.getToken] Current user token.
 * @returns {{list: Function, listPage: Function, get: Function, create: Function, update: Function, delete: Function}}
 * @throws {TypeError} When baseURL, apiKey or table is not a non-empty string.
 */
export function createSupabaseAdapter({
  baseURL,
  apiKey,
  table,
  idColumn = "id",
  headers,
  fetcher,
  getToken,
} = {}) {
  if (!isFilled(baseURL))
    throw new TypeError("createSupabaseAdapter expects baseURL to be a non-empty string.");
  if (!isFilled(apiKey))
    throw new TypeError("createSupabaseAdapter expects apiKey to be a non-empty string.");
  if (!isFilled(table))
    throw new TypeError("createSupabaseAdapter expects table to be a non-empty string.");
  if (getToken !== undefined && typeof getToken !== "function")
    throw new TypeError("createSupabaseAdapter expects getToken to be a function.");
  const defaults = { apikey: apiKey };
  if (!new Headers(headers).has("authorization")) defaults.authorization = `Bearer ${apiKey}`;
  const client = createDataClient({ baseURL, headers: mergeHeaders(defaults, headers), fetcher });
  const root = `/${encodeURIComponent(table)}`;
  const one = { accept: "application/vnd.pgrst.object+json" };
  const representation = { prefer: "return=representation" };
  /**
   * Add the current token as a per-call Authorization header; the caller's own headers still win.
   *
   * @param {object} [options] Caller options.
   * @returns {Promise<object>}
   */
  const authed = async (options = {}) => {
    const token = await getToken?.();
    if (!isFilled(token)) return options;
    return {
      ...options,
      headers: mergeHeaders({ authorization: `Bearer ${token}` }, options.headers),
    };
  };
  /**
   * Request options that select one row by id and add per-call headers.
   *
   * @param {string|number} id
   * @param {object|undefined} options Caller options.
   * @param {object} [extraHeaders] Defaults the caller may override.
   * @returns {object}
   */
  const target = (id, options = {}, extraHeaders) => ({
    ...options,
    headers: mergeHeaders(extraHeaders, options.headers),
    params: mergeParams(options.params, {}, { [idColumn]: `eq.${id}` }),
  });
  /**
   * Request options with per-call headers added.
   *
   * @param {object|undefined} options Caller options.
   * @param {object} extraHeaders Defaults the caller may override.
   * @returns {object}
   */
  const withHeaders = (options = {}, extraHeaders) => ({
    ...options,
    headers: mergeHeaders(extraHeaders, options.headers),
  });

  return {
    /**
     * Fetch rows. `select=*` is sent unless `params.select` is given.
     *
     * @param {object} [options] `params` (PostgREST filters), `signal` and `headers`.
     * @returns {Promise<unknown[]>}
     */
    list: async (options) => {
      const call = await authed(options);
      return client.get(root, { ...call, params: mergeParams(call.params, { select: "*" }) });
    },
    /**
     * Fetch one page of rows with paging metadata, using `limit`, `offset` and `Prefer: count=exact`.
     *
     * A `Prefer` header from the call (or the adapter `headers`) is kept; only its `count=` token is replaced.
     *
     * @param {object} [options] `page` (1-based, default 1), `perPage` (default 30), `params`, `signal` and `headers`.
     * @returns {Promise<{items: unknown[], page: number, perPage: number, totalItems: number, totalPages: number}>}
     * @throws {TypeError} When page or perPage is not a positive integer.
     * @throws {Error} When the response carries no total count.
     */
    async listPage({ page = 1, perPage = 30, params, headers: givenHeaders, ...options } = {}) {
      if (!isPositiveInteger(page))
        throw new TypeError(
          "createSupabaseAdapter: listPage expects page to be a positive integer.",
        );
      if (!isPositiveInteger(perPage))
        throw new TypeError(
          "createSupabaseAdapter: listPage expects perPage to be a positive integer.",
        );
      const { headers: callHeaders } = await authed({ headers: givenHeaders });
      const prefer = (
        new Headers(callHeaders).get("prefer") ??
        new Headers(headers).get("prefer") ??
        ""
      )
        .split(",")
        .map((token) => token.trim())
        .filter((token) => token && !token.startsWith("count="))
        .concat("count=exact")
        .join(", ");
      // Headers are captured per call so concurrent calls cannot see each other's Content-Range.
      let responseHeaders;
      const base = fetcher ?? globalThis.fetch;
      const pageClient = createDataClient({
        baseURL,
        headers: mergeHeaders(defaults, headers),
        fetcher: async (url, init) => {
          const response = await base(url, init);
          responseHeaders = response.headers;
          return response;
        },
      });
      const items = await pageClient.get(root, {
        ...options,
        headers: mergeHeaders(callHeaders, { prefer }),
        params: mergeParams(
          params,
          { select: "*" },
          { limit: perPage, offset: (page - 1) * perPage },
        ),
      });
      const totalItems = readTotal(responseHeaders);
      if (totalItems === undefined)
        throw new Error("createSupabaseAdapter: listPage response has no total count.");
      return { items, page, perPage, totalItems, totalPages: Math.ceil(totalItems / perPage) };
    },
    /**
     * Fetch one row.
     *
     * @param {string|number} id
     * @param {object} [options]
     * @returns {Promise<unknown>}
     */
    get: async (id, options) => client.get(root, target(id, await authed(options), one)),
    /**
     * Insert a row.
     *
     * @param {object} data
     * @param {object} [options]
     * @returns {Promise<unknown>} The created row.
     */
    create: async (data, options) =>
      client.post(root, data, withHeaders(await authed(options), { ...one, ...representation })),
    /**
     * Update a row with a partial change.
     *
     * @param {string|number} id
     * @param {object} patch
     * @param {object} [options]
     * @returns {Promise<unknown>} The updated row.
     */
    update: async (id, patch, options) =>
      client.patch(root, patch, target(id, await authed(options), { ...one, ...representation })),
    /**
     * Delete a row.
     *
     * @param {string|number} id
     * @param {object} [options]
     * @returns {Promise<undefined>}
     */
    async delete(id, options) {
      await client.delete(root, target(id, await authed(options)));
    },
  };
}
