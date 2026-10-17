// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Provide reactive localStorage, IndexedDB, and browser-cookie helpers. */
import { effect, onCleanup, signal } from "nodula-framework";

/**
 * Return the document used for cookies.
 *
 * @returns {Document}
 * @throws {Error} Outside a browser document.
 */
function cookieDocument() {
  if (typeof document === "undefined" || !document) {
    throw new Error("Cookie helpers are only available in a browser document.");
  }
  return document;
}

/**
 * Throw a TypeError unless a cookie name is a non-empty string.
 *
 * @param {unknown} name
 */
function validateCookieName(name) {
  if (typeof name !== "string" || !name.trim()) {
    throw new TypeError("Cookie names must be non-empty strings.");
  }
}

/**
 * Throw a TypeError unless a cookie attribute is a string without `;` or line breaks.
 *
 * @param {unknown} value
 * @param {string} attribute Attribute name, used in the message.
 */
function validateCookieAttribute(value, attribute) {
  if (typeof value !== "string" || /[;\r\n]/.test(value)) {
    throw new TypeError(`Cookie ${attribute} must be a string without semicolons or line breaks.`);
  }
}

/**
 * Build the attribute part of a Set-Cookie value from the options.
 *
 * @param {object} [options] Path, domain, expires, maxAge, sameSite, secure.
 * @returns {string} For example `; Path=/; Max-Age=3600`.
 * @throws {TypeError} For an invalid option.
 */
function serializeCookieOptions(options = {}) {
  const attributes = [];
  if (options.path !== undefined) {
    validateCookieAttribute(options.path, "path");
    attributes.push(`Path=${options.path}`);
  }
  if (options.domain !== undefined) {
    validateCookieAttribute(options.domain, "domain");
    attributes.push(`Domain=${options.domain}`);
  }
  if (options.expires !== undefined) {
    const expires = options.expires instanceof Date ? options.expires : new Date(options.expires);
    if (Number.isNaN(expires.getTime()))
      throw new TypeError("Cookie expires must be a valid date.");
    attributes.push(`Expires=${expires.toUTCString()}`);
  }
  if (options.maxAge !== undefined) {
    if (!Number.isInteger(options.maxAge))
      throw new TypeError("Cookie maxAge must be an integer number of seconds.");
    attributes.push(`Max-Age=${options.maxAge}`);
  }
  if (options.sameSite !== undefined) {
    const sameSite = String(options.sameSite).toLowerCase();
    if (!["strict", "lax", "none"].includes(sameSite)) {
      throw new TypeError("Cookie sameSite must be Strict, Lax, or None.");
    }
    attributes.push(`SameSite=${sameSite[0].toUpperCase()}${sameSite.slice(1)}`);
  }
  if (options.secure) attributes.push("Secure");
  return attributes.length ? `; ${attributes.join("; ")}` : "";
}

/** Read and URI-decode a cookie, returning undefined when it is not present. */
export function getCookie(name) {
  validateCookieName(name);
  const cookieString = cookieDocument().cookie;
  const encodedName = encodeURIComponent(name);
  for (const entry of cookieString.split(/;\s*/)) {
    const separator = entry.indexOf("=");
    if (separator < 0 || entry.slice(0, separator) !== encodedName) continue;
    const value = entry.slice(separator + 1);
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return undefined;
}

/** Set a URI-encoded cookie. HttpOnly cookies must be created by a server. */
export function setCookie(name, value, options = {}) {
  validateCookieName(name);
  cookieDocument().cookie = `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}${serializeCookieOptions(options)}`;
}

/** Expire a cookie using the supplied path/domain scope. */
export function deleteCookie(name, options = {}) {
  const { expires: _expires, maxAge: _maxAge, ...scopeOptions } = options;
  setCookie(name, "", { ...scopeOptions, expires: new Date(0) });
}

/**
 * Return `window.localStorage`, or undefined when it is blocked or unavailable.
 *
 * @returns {Storage | undefined}
 */
function defaultStorage() {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

// Returns the decoded value, or the fallback. `corrupt` is true only when an entry exists but its text cannot be parsed.
/**
 * Read and parse a stored JSON value.
 *
 * A missing key, storage that cannot be read, and text that cannot be parsed all fall back to the initial value. Only text that cannot be parsed counts as corrupt.
 *
 * @param {Storage | undefined} storage
 * @param {string} key
 * @param {unknown} fallback
 * @returns {{ value: unknown, corrupt: boolean }}
 */
function decodeStoredValue(storage, key, fallback) {
  if (!storage) return { value: fallback, corrupt: false };
  let stored;
  try {
    stored = storage.getItem(key);
  } catch {
    return { value: fallback, corrupt: false };
  }
  if (stored === null) return { value: fallback, corrupt: false };
  try {
    return { value: JSON.parse(stored), corrupt: false };
  } catch {
    return { value: fallback, corrupt: true };
  }
}

/** Create a reactive signal persisted as JSON in localStorage when it is available. */
export function createLocalStorage(key, initialValue, { storage = defaultStorage() } = {}) {
  if (typeof key !== "string" || !key.trim()) {
    throw new TypeError("createLocalStorage expects a non-empty storage key.");
  }

  const decoded = decodeStoredValue(storage, key, initialValue);
  const [read, write] = signal(decoded.value);
  // Creation must not replace an entry we could not decode; the first real change overwrites it.
  let keepCorruptEntry = decoded.corrupt;
  effect(() => {
    const value = read();
    if (!storage) return;
    if (keepCorruptEntry) {
      keepCorruptEntry = false;
      return;
    }
    try {
      const serialized = JSON.stringify(value);
      if (serialized !== undefined) storage.setItem(key, serialized);
    } catch (error) {
      // Storage can be blocked or full, or the value may not be JSON-serializable. The signal stays usable in memory.
      console.error(`Nodula: localStorage value "${key}" could not be saved.`, error);
    }
  });

  return [read, write];
}

/**
 * Return `globalThis.indexedDB`, or undefined when it is blocked or unavailable.
 *
 * @returns {IDBFactory | undefined}
 */
function defaultIndexedDB() {
  try {
    return globalThis.indexedDB;
  } catch {
    return undefined;
  }
}

// Browser IndexedDB errors have a numeric `code` that cannot be replaced, so the failure is wrapped:
// the message and name are kept, the original is the `cause`, and `code` is the nodula- code.
/**
 * Give a storage failure a `nodula-` code while keeping its message and name.
 *
 * A browser error keeps its message and becomes the `cause`. Errors that already carry a nodula code are returned unchanged.
 *
 * @param {unknown} error
 * @param {string} code
 * @param {string} fallback Message used when the error has none.
 * @returns {Error & { code: string }}
 */
function storageError(error, code, fallback) {
  if (typeof error?.code === "string" && error.code.startsWith("nodula-")) return error;
  const failure = new Error(error?.message || fallback);
  failure.name = error?.name ?? "Error";
  failure.code = code;
  if (error) failure.cause = error;
  return failure;
}

/**
 * Resolve with the result of an IDB request, or reject with a coded storage error.
 *
 * @param {IDBRequest} request
 * @returns {Promise<unknown>}
 */
function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(storageError(request.error, "nodula-storage-request-failed", "IndexedDB request failed."));
  });
}

/**
 * Resolve when an IDB transaction completes, or reject with a coded storage error when it aborts or fails.
 *
 * @param {IDBTransaction} transaction
 * @returns {Promise<void>}
 */
function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onabort = () =>
      reject(
        storageError(transaction.error, "nodula-storage-transaction-aborted", "IndexedDB transaction aborted."),
      );
    transaction.onerror = () =>
      reject(
        storageError(transaction.error, "nodula-storage-transaction-failed", "IndexedDB transaction failed."),
      );
  });
}

/**
 * Open the database, creating the object store on the first upgrade.
 *
 * A blocked open keeps waiting. `onBlocked` is called when that happens.
 *
 * @param {IDBFactory} indexedDB
 * @param {string} databaseName
 * @param {string} storeName
 * @param {() => void} [onBlocked]
 * @returns {Promise<IDBDatabase>}
 */
function openDatabase(indexedDB, databaseName, storeName, onBlocked) {
  return new Promise((resolve, reject) => {
    let request;
    try {
      request = indexedDB.open(databaseName, 1);
    } catch (error) {
      reject(error);
      return;
    }

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName);
    };
    // Another connection holds an older version. The request keeps waiting; the caller decides whether to continue.
    request.onblocked = () => onBlocked?.();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(storageError(request.error, "nodula-storage-open-failed", "Could not open IndexedDB."));
  });
}

/** Create a reactive signal persisted asynchronously in IndexedDB. */
export function createIndexedDB(
  key,
  initialValue,
  { indexedDB = defaultIndexedDB(), databaseName = "nodula-framework" } = {},
) {
  if (typeof key !== "string" || !key.trim()) {
    throw new TypeError("createIndexedDB expects a non-empty storage key.");
  }
  if (typeof databaseName !== "string" || !databaseName.trim()) {
    throw new TypeError("createIndexedDB expects a non-empty database name.");
  }
  const storeName = "signals";

  const [read, write] = signal(initialValue);
  let database;
  let ready = false;
  let available = false;
  let hydrating = false;
  let pendingWrite = false;
  let firstEffectRun = true;
  let disposed = false;
  // The most recent IndexedDB failure, or null after a successful open or write.
  const [lastError, setLastError] = signal(null);

  /**
   * Write a value to IndexedDB. Does nothing before a successful read, so an unreadable store is never overwritten.
   *
   * A failure is recorded in `lastError` and the signal stays usable in memory.
   *
   * @param {unknown} value
   */
  async function persist(value) {
    // Write only after a successful read, so a store we could not read is never overwritten.
    if (!database || !available || disposed) return;
    try {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put(value, key);
      // Attach the completion handler after issuing requests, so a synchronous throw cannot leave a dangling promise.
      await transactionComplete(transaction);
      setLastError(null);
    } catch (error) {
      // IndexedDB can be unavailable, blocked, or unable to store this value; keep the signal usable in memory.
      setLastError(storageError(error, "nodula-storage-write-failed", "IndexedDB write failed."));
    }
  }

  effect(() => {
    const value = read();
    if (firstEffectRun) {
      firstEffectRun = false;
      return;
    }
    if (hydrating) return;
    pendingWrite = true;
    if (ready) void persist(value);
  });

  /**
   * Write the signal, and mark it as changed so a later hydration does not overwrite the edit.
   *
   * @param {unknown} nextValue A value or an updater.
   * @returns {unknown} The stored value.
   */
  function setValue(nextValue) {
    pendingWrite = true;
    return write(nextValue);
  }

  // A blocked open settles `ready` as memory-only instead of waiting indefinitely. The request
  // stays pending, so if it succeeds later the stored value is hydrated and `available` turns true.
  let markBlocked;
  const blocked = new Promise((resolve) => {
    markBlocked = resolve;
  });
  /**
   * Settle `ready` in memory when another connection blocks the open. The open keeps waiting.
   */
  const onBlocked = () => {
    if (ready) return;
    ready = true;
    markBlocked();
  };

  /**
   * Open the database, read the stored value, and set `available`.
   *
   * When another tab upgrades the database, this connection is closed and the signal continues in memory.
   */
  const connection = (async () => {
    if (!indexedDB || typeof indexedDB.open !== "function") {
      ready = true;
      return;
    }

    try {
      database = await openDatabase(indexedDB, databaseName, storeName, onBlocked);
      // Another tab is upgrading the database: release this connection so it can proceed, then stay in memory.
      const opened = database;
      opened.onversionchange = () => {
        opened.close();
        if (database === opened) {
          database = undefined;
          available = false;
        }
      };
      if (disposed) {
        database.close();
        return;
      }

      const transaction = database.transaction(storeName, "readonly");
      const objectStore = transaction.objectStore(storeName);
      const [storedKey, storedValue] = await Promise.all([
        requestResult(objectStore.getKey(key)),
        requestResult(objectStore.get(key)),
        transactionComplete(transaction),
      ]);
      available = true;
      setLastError(null);
      if (!pendingWrite && storedKey !== undefined) {
        hydrating = true;
        write(storedValue);
        hydrating = false;
      }
      ready = true;
      if (pendingWrite || storedKey === undefined) await persist(read());
    } catch (error) {
      hydrating = false;
      ready = true;
      setLastError(storageError(error, "nodula-storage-unavailable", "IndexedDB is unavailable."));
      // Keep the initial or latest in-memory signal value when IndexedDB cannot be opened or read.
    }
  })();
  const readyPromise = Promise.race([connection, blocked]);

  try {
    onCleanup(() => {
      disposed = true;
      database?.close();
    });
  } catch {
    // Signals can be used outside a root; there is then no owner cleanup to register.
  }

  const storedSignal = Object.assign([read, setValue], { ready: readyPromise });
  Object.defineProperty(storedSignal, "available", { enumerable: true, get: () => available });
  // Read-only and reactive: the reason the last IndexedDB open, read or write failed, or null.
  Object.defineProperty(storedSignal, "lastError", { enumerable: true, get: () => lastError() });
  return storedSignal;
}

/** @deprecated Use `createLocalStorage` instead. */
//export const createStorageSignal = createLocalStorage;

/** @deprecated Use `createIndexedDB` instead. */
//export const createIndexedDBSignal = createIndexedDB;
