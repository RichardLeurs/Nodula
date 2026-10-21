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

/** Create, read, update and delete records of one remote collection or table. */
export interface DataAdapter<T = Record<string, unknown>> {
  /** Fetch the plain `items` array of one page (default 30 records). Pass `params: { perPage, page }` to choose the page, or use `listPage` for paging metadata. */
  list(options?: DataAdapterRequestOptions): Promise<T[]>;
  /** Fetch one page with `totalItems` and `totalPages`. Paging params in `params` are overridden. Rejects with `TypeError` for a non-positive-integer `page` or `perPage`. */
  listPage(options?: DataPageOptions): Promise<DataPage<T>>;
  /** Fetch one record by id. */
  get(id: string | number, options?: DataAdapterRequestOptions): Promise<T>;
  /** Create a record and return it as the server sends it. */
  create(
    data: Partial<T> | Record<string, unknown>,
    options?: DataAdapterRequestOptions,
  ): Promise<T>;
  /** Apply a partial change and return the updated record. */
  update(
    id: string | number,
    patch: Partial<T> | Record<string, unknown>,
    options?: DataAdapterRequestOptions,
  ): Promise<T>;
  /** Delete a record. */
  delete(id: string | number, options?: DataAdapterRequestOptions): Promise<undefined>;
}

export interface PocketBaseAdapterOptions extends Pick<DataClientOptions, "headers" | "fetcher"> {
  /** PocketBase root URL, for example `https://pb.example.com`. Required. */
  baseURL: string;
  /** Collection name or id. Required. */
  collection: string;
  /**
   * Called before every request (also each `listPage` request); the result is not cached. A non-empty string
   * is sent as the raw `Authorization: <token>` header (PocketBase takes no `Bearer` prefix). null, undefined
   * or "" send no Authorization from the adapter. Precedence: per-call `headers.Authorization`, then
   * `getToken`, then the adapter `headers`. If it throws or rejects, no request is sent and the error propagates.
   * Not a function: `TypeError`. With the auth add-on: `getToken: () => auth.session()?.token`.
   */
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
}

/**
 * Create a REST adapter for one PocketBase collection (`/api/collections/{collection}/records`).
 *
 * `list` returns the plain `items` array of one page; PocketBase pages hold 30 records by default, so pass
 * `{ params: { perPage: 100 } }` when you need more, or use `listPage` for paging metadata. Failed requests reject with `DataError`.
 *
 * @throws {TypeError} When `baseURL` or `collection` is not a non-empty string, or `getToken` is given but not a function.
 */
export function createPocketBaseAdapter<T = Record<string, unknown>>(
  options: PocketBaseAdapterOptions,
): DataAdapter<T>;
