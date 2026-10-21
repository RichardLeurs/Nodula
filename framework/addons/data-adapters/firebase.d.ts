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
  /** Fetch the collection's documents, following `nextPageToken` up to 1000 documents (in Firestore's default order, document name ascending; no `orderBy` is sent). Use `listPage` for larger collections. */
  list(options?: DataAdapterRequestOptions): Promise<T[]>;
  /** Fetch one page with `totalItems` and `totalPages`. Rejects with `TypeError` for a non-positive-integer `page` or `perPage`. */
  listPage(options?: DataPageOptions): Promise<DataPage<T>>;
  /** Fetch one record by id. */
  get(id: string | number, options?: DataAdapterRequestOptions): Promise<T>;
  /** Create a record (Firestore generates the id) and return it as a plain record. */
  create(
    data: Partial<T> | Record<string, unknown>,
    options?: DataAdapterRequestOptions,
  ): Promise<T>;
  /** Update only the given fields and return the full updated record. */
  update(
    id: string | number,
    patch: Partial<T> | Record<string, unknown>,
    options?: DataAdapterRequestOptions,
  ): Promise<T>;
  /** Delete a record. */
  delete(id: string | number, options?: DataAdapterRequestOptions): Promise<undefined>;
}

export interface FirebaseAdapterOptions extends Pick<DataClientOptions, "headers" | "fetcher"> {
  /** Firebase project id. Required. */
  projectId: string;
  /** Collection id. Required. */
  collection: string;
  /** Firestore database id. Defaults to `(default)`. */
  databaseId?: string;
  /**
   * Called before every request (also each `listPage` request); the result is not cached. A non-empty string
   * is sent as `Authorization: Bearer <token>`. null, undefined or "" send no Authorization from the adapter.
   * Precedence: per-call `headers.Authorization`, then `getToken`, then the adapter `headers`. If it throws or
   * rejects, no request is sent and the error propagates. Not a function: `TypeError`.
   * With the auth add-on: `getToken: () => auth.session()?.token`.
   */
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
}

/**
 * Create a Firestore REST adapter for one collection.
 *
 * Plain values convert to and from Firestore typed values (`Date` objects become timestamps and are read back as
 * `Date`; ISO strings stay strings). The record `id` is the last segment of the document name and is not stored as
 * a field. `list` returns at most 1000 documents; use `listPage` for paging metadata. Failed requests reject with `DataError`.
 *
 * @throws {TypeError} When `projectId`, `collection` or `databaseId` is not a non-empty string, or `getToken` is given but not a function.
 */
export function createFirebaseAdapter<T = Record<string, unknown>>(
  options: FirebaseAdapterOptions,
): DataAdapter<T>;
