import type { DataRequestOptions } from "nodula-framework/data";

/** Per-call options accepted for parity with the remote adapters; the IndexedDB adapter ignores them. */
export type DataAdapterRequestOptions = Omit<DataRequestOptions, "method" | "body">;

/** One page of records plus paging metadata. `page` is 1-based. */
export interface DataPage<T = Record<string, unknown>> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

/** Options for `listPage`: a 1-based `page` (default 1) and `perPage` (default 30). */
export interface DataPageOptions extends DataAdapterRequestOptions {
  page?: number;
  perPage?: number;
}

/** Create, read, update and delete records of one object store. */
export interface DataAdapter<T = Record<string, unknown>> {
  /** Read all records ordered by id. Call options are ignored. */
  list(options?: DataAdapterRequestOptions): Promise<T[]>;
  /** Read one page with `totalItems` and `totalPages`. Rejects with `TypeError` for a non-positive-integer `page` or `perPage`. */
  listPage(options?: DataPageOptions): Promise<DataPage<T>>;
  /** Read one record by numeric id. Rejects with `Error` when it does not exist. */
  get(id: number, options?: DataAdapterRequestOptions): Promise<T>;
  /** Store a record and return it including its generated `id`. An `id` in `data` is ignored; the key is always auto-generated. */
  create(
    data: Partial<T> | Record<string, unknown>,
    options?: DataAdapterRequestOptions,
  ): Promise<T>;
  /** Shallow-merge a patch into a record and return it. Rejects with `Error` when it does not exist. */
  update(
    id: number,
    patch: Partial<T> | Record<string, unknown>,
    options?: DataAdapterRequestOptions,
  ): Promise<T>;
  /** Delete a record. Resolves even when it does not exist. */
  delete(id: number, options?: DataAdapterRequestOptions): Promise<undefined>;
}

export interface IndexedDBAdapterOptions {
  /** Object store name. Required. One store per adapter, keyPath `id`, auto-incrementing. */
  store: string;
  /** Database name. Default `"nodula-data"`. Adapters with different stores can share a database. */
  database?: string;
  /** IndexedDB factory. Default `globalThis.indexedDB`; null or undefined-global makes operations reject. */
  indexedDB?: IDBFactory | null;
}

/** An IndexedDB-backed `DataAdapter` that can also close its connection. */
export interface IndexedDBAdapter<T = Record<string, unknown>> extends DataAdapter<T> {
  /** Close the connection; a later call reopens it. */
  close(): Promise<undefined>;
}

/**
 * Create a data adapter that stores records in one IndexedDB object store.
 *
 * The connection opens lazily. If the database lacks the store, it is reopened with a higher version to create it.
 * Operations reject with `Error` ("IndexedDB is unavailable.") when no IndexedDB exists; IndexedDB failures reject with
 * an `Error` whose `cause` is the original error.
 *
 * @throws {TypeError} When `store` or `database` is not a non-empty string.
 */
export function createIndexedDBAdapter<T = Record<string, unknown>>(
  options: IndexedDBAdapterOptions,
): IndexedDBAdapter<T>;
