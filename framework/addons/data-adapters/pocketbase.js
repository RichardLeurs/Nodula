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
 * Check that a value is a positive integer.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

/**
 * Merge query parameters; `forced` always wins over the caller's `params`.
 *
 * @param {object|URLSearchParams|undefined} params Caller parameters.
 * @param {object} forced
 * @returns {object|URLSearchParams}
 */
function mergeParams(params, forced) {
  if (params instanceof URLSearchParams) {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(forced)) merged.set(key, value);
    return merged;
  }
  return { ...params, ...forced };
}

/**
 * Create a REST adapter for one PocketBase collection, built on the data add-on.
 *
 * PocketBase returns 30 records per page by default. `list` returns the plain `items` array of one
 * page: pass `{ params: { perPage: 100, page: 2 } }` to choose it, or use `listPage` for paging metadata.
 *
 * `getToken` runs before every request and its result is never cached. A non-empty string is sent as
 * the raw `Authorization: <token>` header (PocketBase takes no `Bearer` prefix); null, undefined or "" send
 * none from the adapter. Precedence: per-call `headers.Authorization`, then `getToken`, then the adapter
 * `headers`. If `getToken` throws or rejects, no request is sent and the error propagates.
 * With the auth add-on: `getToken: () => auth.session()?.token`.
 *
 * @param {object} config
 * @param {string} config.baseURL PocketBase root URL, for example `https://pb.example.com`.
 * @param {string} config.collection Collection name or id.
 * @param {HeadersInit} [config.headers] Headers sent with every request.
 * @param {typeof fetch} [config.fetcher] Fetch-compatible transport.
 * @param {() => string|null|undefined|Promise<string|null|undefined>} [config.getToken] Current auth token.
 * @returns {{list: Function, listPage: Function, get: Function, create: Function, update: Function, delete: Function}}
 * @throws {TypeError} When baseURL or collection is not a non-empty string.
 */
export function createPocketBaseAdapter({ baseURL, collection, headers, fetcher, getToken } = {}) {
  if (!isFilled(baseURL))
    throw new TypeError("createPocketBaseAdapter expects baseURL to be a non-empty string.");
  if (!isFilled(collection))
    throw new TypeError("createPocketBaseAdapter expects collection to be a non-empty string.");
  if (getToken !== undefined && typeof getToken !== "function")
    throw new TypeError("createPocketBaseAdapter expects getToken to be a function.");
  const client = createDataClient({ baseURL, headers, fetcher });
  const root = `/api/collections/${encodeURIComponent(collection)}/records`;
  /**
   * Build the path of one record.
   *
   * @param {string|number} id
   * @returns {string}
   */
  const record = (id) => `${root}/${encodeURIComponent(id)}`;
  /**
   * Add the current token as a per-call Authorization header; the caller's own headers still win.
   *
   * @param {object} [options] Caller options.
   * @returns {Promise<object>}
   */
  const authed = async (options = {}) => {
    const token = await getToken?.();
    if (!isFilled(token)) return options;
    const merged = new Headers({ authorization: token });
    new Headers(options.headers).forEach((value, key) => merged.set(key, value));
    return { ...options, headers: merged };
  };

  return {
    /**
     * Fetch one page of records.
     *
     * @param {object} [options] `params`, `signal` and `headers`.
     * @returns {Promise<unknown[]>} The `items` array of the PocketBase response.
     * @throws {Error} When the response has no items array.
     */
    async list(options) {
      const page = await client.get(root, await authed(options));
      if (!Array.isArray(page?.items))
        throw new Error("createPocketBaseAdapter: list response has no items array.");
      return page.items;
    },
    /**
     * Fetch one page of records with paging metadata.
     *
     * @param {object} [options] `page` (1-based, default 1), `perPage` (default 30), `params`, `signal` and `headers`.
     * @returns {Promise<{items: unknown[], page: number, perPage: number, totalItems: number, totalPages: number}>}
     * @throws {TypeError} When page or perPage is not a positive integer.
     * @throws {Error} When the response has no items array.
     */
    async listPage({ page = 1, perPage = 30, params, ...options } = {}) {
      if (!isPositiveInteger(page))
        throw new TypeError(
          "createPocketBaseAdapter: listPage expects page to be a positive integer.",
        );
      if (!isPositiveInteger(perPage))
        throw new TypeError(
          "createPocketBaseAdapter: listPage expects perPage to be a positive integer.",
        );
      const body = await client.get(root, {
        ...(await authed(options)),
        params: mergeParams(params, { page, perPage }),
      });
      if (!Array.isArray(body?.items))
        throw new Error("createPocketBaseAdapter: list response has no items array.");
      return {
        items: body.items,
        page: body.page,
        perPage: body.perPage,
        totalItems: body.totalItems,
        totalPages: body.totalPages,
      };
    },
    /**
     * Fetch one record.
     *
     * @param {string|number} id
     * @param {object} [options]
     * @returns {Promise<unknown>}
     */
    get: async (id, options) => client.get(record(id), await authed(options)),
    /**
     * Create a record.
     *
     * @param {object} data
     * @param {object} [options]
     * @returns {Promise<unknown>} The created record.
     */
    create: async (data, options) => client.post(root, data, await authed(options)),
    /**
     * Update a record with a partial change.
     *
     * @param {string|number} id
     * @param {object} patch
     * @param {object} [options]
     * @returns {Promise<unknown>} The updated record.
     */
    update: async (id, patch, options) => client.patch(record(id), patch, await authed(options)),
    /**
     * Delete a record.
     *
     * @param {string|number} id
     * @param {object} [options]
     * @returns {Promise<undefined>}
     */
    async delete(id, options) {
      await client.delete(record(id), await authed(options));
    },
  };
}
