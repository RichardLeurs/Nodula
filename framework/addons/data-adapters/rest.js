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
 * Merge query parameters; `forced` wins over `params`.
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
 * Create an adapter for one resource of a conventional REST API, built on the data add-on.
 *
 * Expected API shape: `GET /{resource}` returns a plain JSON array; `GET`, `PATCH` and `DELETE`
 * on `/{resource}/{id}` act on one record; `POST /{resource}` creates one and returns it. There is
 * no response envelope handling: `list` returns whatever array the server sends. Failed requests
 * reject with a `DataError` whose `data` is the response body. There is no `getToken`; use
 * `headers` or `fetcher` for authentication.
 * The demo's small PHP and SQLite API is one example of such a server.
 *
 * Paging is optional because REST has no paging standard. Without `paging` there is no `listPage`.
 * With `paging` you describe your API and `listPage` is added. The array body is the page; the
 * total comes from a response header (default `X-Total-Count`). Two request styles:
 *
 * - Page style (default): sends `?page=2&perPage=10`.
 *   `createRestAdapter({ baseURL, resource, paging: {} })`
 * - Offset style (set `offsetParam`): sends `?limit=10&offset=10` for page 2.
 *   `createRestAdapter({ baseURL, resource, paging: { perPageParam: "limit", offsetParam: "offset" } })`
 *
 * Cross-origin browsers can only read the total header when the server lists it in
 * `Access-Control-Expose-Headers` (the same caveat as the Supabase adapter's `Content-Range`).
 *
 * @param {object} config
 * @param {string} config.baseURL API root, for example `/api` or `https://example.com/api`.
 * @param {string} config.resource Resource name for example `ideas`.
 * @param {HeadersInit} [config.headers] Headers sent with every request.
 * @param {typeof fetch} [config.fetcher] Fetch-compatible transport.
 * @param {object} [config.paging] Enables `listPage`; unknown keys are ignored.
 * @param {string} [config.paging.pageParam="page"] Query parameter for the 1-based page number (page style).
 * @param {string} [config.paging.perPageParam="perPage"] Query parameter for the page size (use "limit" for offset style).
 * @param {string} [config.paging.offsetParam] When set, offset style: sends `(page - 1) * perPage` under this name instead of the page number.
 * @param {string} [config.paging.totalHeader="X-Total-Count"] Response header holding the total row count (case-insensitive).
 * @returns {{list: Function, get: Function, create: Function, update: Function, delete: Function, listPage?: Function}}
 * @throws {TypeError} When baseURL or resource is not a non-empty string, or paging is not a plain object with non-empty string fields.
 */
export function createRestAdapter({ baseURL, resource, headers, fetcher, paging } = {}) {
  if (!isFilled(baseURL))
    throw new TypeError("createRestAdapter expects baseURL to be a non-empty string.");
  if (!isFilled(resource))
    throw new TypeError("createRestAdapter expects resource to be a non-empty string.");
  if (paging !== undefined) {
    if (typeof paging !== "object" || paging === null || Array.isArray(paging))
      throw new TypeError("createRestAdapter expects paging to be an object.");
    for (const field of ["pageParam", "perPageParam", "offsetParam", "totalHeader"])
      if (paging[field] !== undefined && !isFilled(paging[field]))
        throw new TypeError(`createRestAdapter expects paging.${field} to be a non-empty string.`);
  }
  const client = createDataClient({ baseURL, headers, fetcher });
  const root = `/${encodeURIComponent(resource)}`;
  /**
   * Build the path of one row.
   *
   * @param {string|number} id
   * @returns {string}
   */
  const row = (id) => `${root}/${encodeURIComponent(id)}`;

  const api = {
    /**
     * Fetch every row as the plain array the server sends.
     *
     * @param {object} [options] `params`, `signal` and `headers`.
     * @returns {Promise<unknown[]>}
     */
    list: (options) => client.get(root, options),
    /**
     * Fetch one row.
     *
     * @param {string|number} id
     * @param {object} [options]
     * @returns {Promise<unknown>}
     */
    get: (id, options) => client.get(row(id), options),
    /**
     * Create a row.
     *
     * @param {object} data
     * @param {object} [options]
     * @returns {Promise<unknown>} The created row.
     */
    create: (data, options) => client.post(root, data, options),
    /**
     * Update a row with a partial change.
     *
     * @param {string|number} id
     * @param {object} patch
     * @param {object} [options]
     * @returns {Promise<unknown>} The updated row.
     */
    update: (id, patch, options) => client.patch(row(id), patch, options),
    /**
     * Delete a row.
     *
     * @param {string|number} id
     * @param {object} [options]
     * @returns {Promise<undefined>}
     */
    async delete(id, options) {
      await client.delete(row(id), options);
    },
  };
  if (!paging) return api;

  const {
    pageParam = "page",
    perPageParam = "perPage",
    offsetParam,
    totalHeader = "X-Total-Count",
  } = paging;
  const base = fetcher ?? globalThis.fetch;
  /**
   * Fetch one page of rows with paging metadata; the total is read from the `totalHeader` response header.
   *
   * @param {object} [options] `page` (1-based, default 1), `perPage` (default 30), `params`, `signal` and `headers`.
   * @returns {Promise<{items: unknown[], page: number, perPage: number, totalItems: number, totalPages: number}>}
   * @throws {TypeError} When page or perPage is not a positive integer.
   * @throws {Error} When the body is not an array or the response carries no valid total count.
   */
  api.listPage = async ({ page = 1, perPage = 30, params, ...options } = {}) => {
    if (!isPositiveInteger(page))
      throw new TypeError("createRestAdapter: listPage expects page to be a positive integer.");
    if (!isPositiveInteger(perPage))
      throw new TypeError("createRestAdapter: listPage expects perPage to be a positive integer.");
    // Headers are captured per call so concurrent calls cannot see each other's total.
    let responseHeaders;
    const pageClient = createDataClient({
      baseURL,
      headers,
      fetcher: async (url, init) => {
        const response = await base(url, init);
        responseHeaders = response.headers;
        return response;
      },
    });
    const forced = offsetParam
      ? { [perPageParam]: perPage, [offsetParam]: (page - 1) * perPage }
      : { [pageParam]: page, [perPageParam]: perPage };
    const items = await pageClient.get(root, { ...options, params: mergeParams(params, forced) });
    if (!Array.isArray(items)) throw new Error("createRestAdapter: list response is not an array.");
    const raw = responseHeaders?.get?.(totalHeader)?.trim() ?? "";
    if (!/^\d+$/.test(raw))
      throw new Error("createRestAdapter: listPage response has no total count.");
    const totalItems = Number(raw);
    return { items, page, perPage, totalItems, totalPages: Math.ceil(totalItems / perPage) };
  };
  return api;
}
