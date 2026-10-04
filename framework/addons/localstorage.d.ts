import type { Signal } from 'nodula-framework';

export interface CookieOptions {
  /** Cookie path. Use `/` to make it available throughout the site. */
  path?: string;
  /** Cookie domain; omit to keep it host-only. */
  domain?: string;
  /** Absolute expiration date. */
  expires?: Date | string;
  /** Lifetime in seconds; zero or a negative value expires the cookie. */
  maxAge?: number;
  /** Cross-site cookie policy. `None` generally requires `secure: true` in browsers. */
  sameSite?: 'Strict' | 'Lax' | 'None';
  /** Restrict the cookie to secure HTTPS connections. */
  secure?: boolean;
}

/** Read and URI-decode a cookie, returning undefined when it is not present. */
export function getCookie(name: string): string | undefined;
/** Set a URI-encoded cookie. HttpOnly cookies must be created by a server. */
export function setCookie(name: string, value: string | number | boolean, options?: CookieOptions): void;
/** Expire a cookie using the supplied path/domain scope. */
export function deleteCookie(name: string, options?: Omit<CookieOptions, 'expires' | 'maxAge'>): void;

export interface StorageSignalOptions {
  /** Storage implementation to use. Defaults to window.localStorage when available. */
  storage?: Storage | null;
}

export interface IndexedDBSignalOptions {
  /** IndexedDB factory to use. Defaults to globalThis.indexedDB when available. */
  indexedDB?: IDBFactory | null;
  /** Database name. Defaults to `nodula-framework`. */
  databaseName?: string;
}

export type IndexedDBSignal<T> = Signal<T> & { ready: Promise<void>; readonly available: boolean };

/** Create a reactive signal initialized from and persisted to localStorage as JSON. */
export function createLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: StorageSignalOptions,
): Signal<T>;
/** @deprecated Use `createLocalStorage` instead. */
export const createStorageSignal: typeof createLocalStorage;

/** Create a reactive signal hydrated from and persisted to IndexedDB. Await `ready` before reading `available` or relying on persisted hydration. */
export function createIndexedDB<T>(
  key: string,
  initialValue: T,
  options?: IndexedDBSignalOptions,
): IndexedDBSignal<T>;
/** @deprecated Use `createIndexedDB` instead. */
export const createIndexedDBSignal: typeof createIndexedDB;