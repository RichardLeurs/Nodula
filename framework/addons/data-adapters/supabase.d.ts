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
  /** Fetch rows. `select=*` is sent unless `params.select` is given; other params are PostgREST filters. */
  list(options?: DataAdapterRequestOptions): Promise<T[]>;
  /** Fetch one page with `totalItems` and `totalPages` from the `Content-Range` header (`Prefer: count=exact`). Rejects with `Error` when the server sends no total. */
  listPage(options?: DataPageOptions): Promise<DataPage<T>>;
  /** Fetch one row by id. A missing or row-level-security-filtered row rejects with `DataError` (HTTP 406). */
  get(id: string | number, options?: DataAdapterRequestOptions): Promise<T>;
  /** Insert a row and return it as the server sends it. */
  create(
    data: Partial<T> | Record<string, unknown>,
    options?: DataAdapterRequestOptions,
  ): Promise<T>;
  /** Apply a partial change and return the updated row. */
  update(
    id: string | number,
    patch: Partial<T> | Record<string, unknown>,
    options?: DataAdapterRequestOptions,
  ): Promise<T>;
  /** Delete a row. */
  delete(id: string | number, options?: DataAdapterRequestOptions): Promise<undefined>;
}

export interface SupabaseAdapterOptions extends Pick<DataClientOptions, "headers" | "fetcher"> {
  /** PostgREST root, ending in `/rest/v1`, for example `https://abc.supabase.co/rest/v1`. Required. */
  baseURL: string;
  /** Project API key, sent as `apikey` and as `Authorization: Bearer` unless `headers` sets Authorization. Required. */
  apiKey: string;
  /** Table name. Required. */
  table: string;
  /** Column used to find one row. Default `"id"`. */
  idColumn?: string;
  /**
   * Called before every request (also each `listPage` request); the result is not cached. A non-empty string
   * is sent as `Authorization: Bearer <token>`; `apikey` is always sent. null, undefined or "" fall back to
   * `Bearer <apiKey>`. Precedence: per-call `headers.Authorization`, then `getToken`, then the adapter `headers`,
   * then the default. If it throws or rejects, no request is sent and the error propagates.
   * Not a function: `TypeError`. With the auth add-on (session shape is app-defined):
   * `getToken: () => auth.session()?.access_token`.
   */
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
}

/**
 * Create a REST adapter for one Supabase table (PostgREST) without the Supabase SDK.
 *
 * Failed requests reject with `DataError`; the Supabase error body is in `error.data`.
 *
 * @throws {TypeError} When `baseURL`, `apiKey` or `table` is not a non-empty string, or `getToken` is given but not a function.
 */
export function createSupabaseAdapter<T = Record<string, unknown>>(
  options: SupabaseAdapterOptions,
): DataAdapter<T>;
