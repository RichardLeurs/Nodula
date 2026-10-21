import type { DataClientOptions, DataRequestOptions } from "nodula-framework/data";

/** Per-call options: query `params`, an abort `signal` and extra `headers`. */
export type DataAdapterRequestOptions = Omit<DataRequestOptions, "method" | "body">;

/** One page of records plus paging metadata. `page` is 1-based. */
export interface DataPage<T = Record<string, unknown>> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

/** Options for `listPage`: a 1-based `page` (default 1) and `perPage` (default 30), plus the usual call options. */
export interface DataPageOptions extends DataAdapterRequestOptions {
  page?: number;
  perPage?: number;
}

/**
 * Create, read, update and delete records of one resource of a conventional REST API.
 * Without the `paging` option there is no `listPage`.
 */
export interface DataAdapter<T = Record<string, unknown>> {
  /** Fetch every record: the plain array the server sends at `GET /{resource}`. No paging or envelope handling. */
  list(options?: DataAdapterRequestOptions): Promise<T[]>;
  /** Fetch one record by id (`GET /{resource}/{id}`). A missing record rejects with `DataError` (HTTP 404). */
  get(id: string | number, options?: DataAdapterRequestOptions): Promise<T>;
  /** Create a record (`POST /{resource}`) and return it as the server sends it. */
  create(
    data: Partial<T> | Record<string, unknown>,
    options?: DataAdapterRequestOptions,
  ): Promise<T>;
  /** Apply a partial change (`PATCH /{resource}/{id}`) and return the updated record. A missing record rejects with `DataError` (HTTP 404). */
  update(
    id: string | number,
    patch: Partial<T> | Record<string, unknown>,
    options?: DataAdapterRequestOptions,
  ): Promise<T>;
  /** Delete a record (`DELETE /{resource}/{id}`). Resolves to `undefined` whatever body the server sends; a missing record rejects with `DataError` (HTTP 404). */
  delete(id: string | number, options?: DataAdapterRequestOptions): Promise<undefined>;
}

/** A `DataAdapter` that also has `listPage`; returned when `paging` is configured. */
export type PagedDataAdapter<T = Record<string, unknown>> = DataAdapter<T> & {
  /** Fetch one page. The array body is the page; `totalItems` is read from the `totalHeader` response header. Rejects with `Error` when the header is missing or invalid, or the body is not an array. */
  listPage(options?: DataPageOptions): Promise<DataPage<T>>;
};

/** Describes how your API pages its list endpoint. Unknown keys are ignored. */
export interface RestPagingOptions {
  /** Query parameter for the 1-based page number (page style). Default `"page"`. */
  pageParam?: string;
  /** Query parameter for the page size. Default `"perPage"`; use `"limit"` for offset style. */
  perPageParam?: string;
  /** When set, offset style: sends `(page - 1) * perPage` under this name instead of the page number. */
  offsetParam?: string;
  /** Response header holding the total row count, matched case-insensitively. Default `"X-Total-Count"`. Cross-origin browsers can only read it if the server exposes it via `Access-Control-Expose-Headers`. */
  totalHeader?: string;
}

export interface RestAdapterOptions extends Pick<DataClientOptions, "headers" | "fetcher"> {
  /** API root, for example `/api` or `https://example.com/api`. Required. */
  baseURL: string;
  /** Resource name, for example `ideas`. Required. */
  resource: string;
  /** Enables `listPage` when given. */
  paging?: RestPagingOptions;
}

/** Options without `paging`: the adapter has no `listPage`. */
export interface UnpagedRestAdapterOptions extends RestAdapterOptions {
  paging?: undefined;
}

/** Options with `paging`: the adapter has `listPage`. */
export interface PagedRestAdapterOptions extends RestAdapterOptions {
  paging: RestPagingOptions;
}

/**
 * Create an adapter for one resource of a conventional REST API: `GET /{resource}` returns a plain array,
 * `GET`/`PATCH`/`DELETE /{resource}/{id}` act on one record, `POST /{resource}` creates one. No envelope
 * handling, no `getToken`; use `headers` or `fetcher` for authentication.
 * The demo's small PHP and SQLite API is one example server.
 *
 * Paging is optional. With `paging`, `listPage` exists and reads the total from a response header
 * (default `X-Total-Count`). Page style (default) sends `?page=2&perPage=10`:
 * `paging: {}`. Offset style sends `?limit=10&offset=10` for page 2:
 * `paging: { perPageParam: "limit", offsetParam: "offset" }`.
 *
 * Failed requests reject with `DataError`; the response body is in `error.data`.
 *
 * @throws {TypeError} When `baseURL` or `resource` is not a non-empty string, or `paging` is invalid.
 */
export function createRestAdapter<T = Record<string, unknown>>(
  options: PagedRestAdapterOptions,
): PagedDataAdapter<T>;
export function createRestAdapter<T = Record<string, unknown>>(
  options: UnpagedRestAdapterOptions,
): DataAdapter<T>;
