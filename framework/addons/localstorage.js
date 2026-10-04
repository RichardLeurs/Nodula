import { effect, onCleanup, signal } from 'nodula-framework';

function cookieDocument() {
  if (typeof document === 'undefined' || !document) {
    throw new Error('Cookie helpers are only available in a browser document.');
  }
  return document;
}

function validateCookieName(name) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new TypeError('Cookie names must be non-empty strings.');
  }
}

function validateCookieAttribute(value, attribute) {
  if (typeof value !== 'string' || /[;\r\n]/.test(value)) {
    throw new TypeError(`Cookie ${attribute} must be a string without semicolons or line breaks.`);
  }
}

function serializeCookieOptions(options = {}) {
  const attributes = [];
  if (options.path !== undefined) {
    validateCookieAttribute(options.path, 'path');
    attributes.push(`Path=${options.path}`);
  }
  if (options.domain !== undefined) {
    validateCookieAttribute(options.domain, 'domain');
    attributes.push(`Domain=${options.domain}`);
  }
  if (options.expires !== undefined) {
    const expires = options.expires instanceof Date ? options.expires : new Date(options.expires);
    if (Number.isNaN(expires.getTime())) throw new TypeError('Cookie expires must be a valid date.');
    attributes.push(`Expires=${expires.toUTCString()}`);
  }
  if (options.maxAge !== undefined) {
    if (!Number.isInteger(options.maxAge)) throw new TypeError('Cookie maxAge must be an integer number of seconds.');
    attributes.push(`Max-Age=${options.maxAge}`);
  }
  if (options.sameSite !== undefined) {
    const sameSite = String(options.sameSite).toLowerCase();
    if (!['strict', 'lax', 'none'].includes(sameSite)) {
      throw new TypeError('Cookie sameSite must be Strict, Lax, or None.');
    }
    attributes.push(`SameSite=${sameSite[0].toUpperCase()}${sameSite.slice(1)}`);
  }
  if (options.secure) attributes.push('Secure');
  return attributes.length ? `; ${attributes.join('; ')}` : '';
}

/** Read and URI-decode a cookie, returning undefined when it is not present. */
export function getCookie(name) {
  validateCookieName(name);
  const cookieString = cookieDocument().cookie;
  const encodedName = encodeURIComponent(name);
  for (const entry of cookieString.split(/;\s*/)) {
    const separator = entry.indexOf('=');
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
  const { expires, maxAge, ...scopeOptions } = options;
  setCookie(name, '', { ...scopeOptions, expires: new Date(0) });
}

function defaultStorage() {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function decodeStoredValue(storage, key, fallback) {
  if (!storage) return fallback;
  try {
    const stored = storage.getItem(key);
    return stored === null ? fallback : JSON.parse(stored);
  } catch {
    return fallback;
  }
}

/** Create a reactive signal persisted as JSON in localStorage when it is available. */
export function createLocalStorage(key, initialValue, { storage = defaultStorage() } = {}) {
  if (typeof key !== 'string' || !key.trim()) {
    throw new TypeError('createLocalStorage expects a non-empty storage key.');
  }

  const [read, write] = signal(decodeStoredValue(storage, key, initialValue));
  effect(() => {
    if (!storage) return;
    try {
      const serialized = JSON.stringify(read());
      if (serialized !== undefined) storage.setItem(key, serialized);
    } catch {
      // Storage can be blocked, full, or unable to serialize this value; keep the signal usable in memory.
    }
  });

  return [read, write];
}

function defaultIndexedDB() {
  try {
    return globalThis.indexedDB;
  } catch {
    return undefined;
  }
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
  });
}

function openDatabase(indexedDB, databaseName, storeName) {
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
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB.'));
  });
}

/** Create a reactive signal persisted asynchronously in IndexedDB. */
export function createIndexedDB(key, initialValue, {
  indexedDB = defaultIndexedDB(),
  databaseName = 'nodula-framework',
} = {}) {
  if (typeof key !== 'string' || !key.trim()) {
    throw new TypeError('createIndexedDB expects a non-empty storage key.');
  }
  if (typeof databaseName !== 'string' || !databaseName.trim()) {
    throw new TypeError('createIndexedDB expects a non-empty database name.');
  }
  const storeName = 'signals';

  const [read, write] = signal(initialValue);
  let database;
  let ready = false;
  let available = false;
  let hydrating = false;
  let pendingWrite = false;
  let firstEffectRun = true;
  let disposed = false;

  async function persist(value) {
    if (!database || disposed) return;
    try {
      const transaction = database.transaction(storeName, 'readwrite');
      const completed = transactionComplete(transaction);
      transaction.objectStore(storeName).put(value, key);
      await completed;
    } catch {
      // IndexedDB can be unavailable, blocked, or unable to store this value; keep the signal usable in memory.
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

  function setValue(nextValue) {
    pendingWrite = true;
    return write(nextValue);
  }

  const readyPromise = (async () => {
    if (!indexedDB || typeof indexedDB.open !== 'function') {
      ready = true;
      return;
    }

    try {
      database = await openDatabase(indexedDB, databaseName, storeName);
      if (disposed) {
        database.close();
        return;
      }

      const transaction = database.transaction(storeName, 'readonly');
      const completed = transactionComplete(transaction);
      const objectStore = transaction.objectStore(storeName);
      const [storedKey, storedValue] = await Promise.all([
        requestResult(objectStore.getKey(key)),
        requestResult(objectStore.get(key)),
        completed,
      ]);
      available = true;
      if (!pendingWrite && storedKey !== undefined) {
        hydrating = true;
        write(storedValue);
        hydrating = false;
      }
      ready = true;
      if (pendingWrite || storedKey === undefined) await persist(read());
    } catch {
      hydrating = false;
      ready = true;
      // Keep the initial or latest in-memory signal value when IndexedDB cannot be opened or read.
    }
  })();

  try {
    onCleanup(() => {
      disposed = true;
      database?.close();
    });
  } catch {
    // Signals can be used outside a root; there is then no owner cleanup to register.
  }

  const storedSignal = Object.assign([read, setValue], { ready: readyPromise });
  Object.defineProperty(storedSignal, 'available', { enumerable: true, get: () => available });
  return storedSignal;
}

/** @deprecated Use `createLocalStorage` instead. */
//export const createStorageSignal = createLocalStorage;

/** @deprecated Use `createIndexedDB` instead. */
//export const createIndexedDBSignal = createIndexedDB;