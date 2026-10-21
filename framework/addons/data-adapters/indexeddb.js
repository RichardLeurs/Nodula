// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

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

/** Times `connect` retries a version bump when a concurrent upgrade left the store missing. */
const MAX_UPGRADE_ATTEMPTS = 3;

/**
 * Return `globalThis.indexedDB`, or undefined when it is blocked or unavailable.
 *
 * @returns {IDBFactory|undefined}
 */
function defaultIndexedDB() {
  try {
    return globalThis.indexedDB;
  } catch {
    return undefined;
  }
}

/**
 * Wrap an IndexedDB failure in an Error that keeps the original as `cause`.
 *
 * @param {unknown} cause
 * @returns {Error}
 */
function failure(cause) {
  const detail = cause?.message || cause?.name || "request failed";
  return new Error(`createIndexedDBAdapter: ${detail}`, { cause });
}

/**
 * Open a database; the store is created when the database is new or `version` is an upgrade.
 *
 * @param {IDBFactory} factory
 * @param {string} database
 * @param {string} store
 * @param {number|undefined} version Omit to open the current version.
 * @param {() => void} onVersionChange Called when another connection wants to upgrade.
 * @returns {Promise<IDBDatabase>}
 */
function openDatabase(factory, database, store, version, onVersionChange) {
  return new Promise((resolve, reject) => {
    let request;
    let settled = false;
    try {
      request = version ? factory.open(database, version) : factory.open(database);
    } catch (error) {
      reject(failure(error));
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(store))
        db.createObjectStore(store, { keyPath: "id", autoIncrement: true });
    };
    request.onblocked = () => {
      settled = true;
      reject(failure(new Error("database upgrade is blocked by another open connection")));
    };
    request.onsuccess = () => {
      // The open finished after it was reported blocked; nobody will use this connection.
      if (settled) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => {
        request.result.close();
        onVersionChange();
      };
      resolve(request.result);
    };
    request.onerror = () => reject(failure(request.error));
  });
}

/**
 * Create an adapter that keeps the records of one IndexedDB object store, with the same
 * methods as the remote data adapters so it works with `createResource` and can be swapped with them.
 *
 * Records use a numeric auto-incrementing `id`; an `id` passed to `create` is ignored. The connection opens lazily on the first call; several
 * adapters (one store each) can share one database. `params`, `signal` and `headers` call options are ignored.
 *
 * @param {object} config
 * @param {string} config.store Object store name.
 * @param {string} [config.database] Database name, default "nodula-data".
 * @param {IDBFactory|null} [config.indexedDB] IndexedDB factory, default `globalThis.indexedDB`.
 * @returns {{list: Function, listPage: Function, get: Function, create: Function, update: Function, delete: Function, close: Function}}
 * @throws {TypeError} When store or database is not a non-empty string.
 * Operations reject with an Error when the upgrade is blocked by another open connection.
 */
export function createIndexedDBAdapter({
  store,
  database = "nodula-data",
  indexedDB = defaultIndexedDB(),
} = {}) {
  if (!isFilled(store))
    throw new TypeError("createIndexedDBAdapter expects store to be a non-empty string.");
  if (!isFilled(database))
    throw new TypeError("createIndexedDBAdapter expects database to be a non-empty string.");

  let connection = null;

  /**
   * Open (once) the database and make sure it contains the store, bumping the version if needed.
   *
   * @returns {Promise<IDBDatabase>}
   */
  const connect = () => {
    if (connection) return connection;
    if (typeof indexedDB?.open !== "function")
      return Promise.reject(new Error("createIndexedDBAdapter: IndexedDB is unavailable."));
    const reset = () => {
      connection = null;
    };
    const current = (async () => {
      let db = await openDatabase(indexedDB, database, store, undefined, reset);
      // Another adapter may win the upgrade to the same version, leaving this store missing; bump again.
      for (let attempt = 0; !db.objectStoreNames.contains(store); attempt += 1) {
        const version = db.version + 1;
        db.close();
        if (attempt >= MAX_UPGRADE_ATTEMPTS)
          throw new Error(`createIndexedDBAdapter: could not create store ${store}.`);
        db = await openDatabase(indexedDB, database, store, version, reset);
      }
      return db;
    })();
    connection = current;
    current.catch(() => {
      if (connection === current) connection = null;
    });
    return current;
  };

  /**
   * Run one transaction. `work` receives the object store and `done(result)`, and may call `fail(error)`.
   * The promise resolves with the result once the transaction has completed.
   *
   * @param {"readonly"|"readwrite"} mode
   * @param {(objectStore: IDBObjectStore, done: (result: unknown) => void, fail: (error: unknown) => void) => void} work
   * @returns {Promise<unknown>}
   */
  const run = async (mode, work) => {
    const db = await connect();
    return new Promise((resolve, reject) => {
      let result;
      try {
        const transaction = db.transaction(store, mode);
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = (event) => reject(failure(event?.target?.error ?? transaction.error));
        transaction.onabort = () => reject(failure(transaction.error));
        work(
          transaction.objectStore(store),
          (value) => {
            result = value;
          },
          (error) => reject(error),
        );
      } catch (error) {
        reject(failure(error));
      }
    });
  };

  /**
   * Build the error for a missing record.
   *
   * @param {string|number} id
   * @returns {Error}
   */
  const missing = (id) => new Error(`createIndexedDBAdapter: record ${id} not found in ${store}.`);

  /**
   * Read every record, ordered by id.
   *
   * @returns {Promise<unknown[]>}
   */
  const all = () =>
    run("readonly", (objectStore, done) => {
      objectStore.getAll().onsuccess = (event) => done(event.target.result);
    });

  return {
    /**
     * Read all records ordered by id.
     *
     * @returns {Promise<unknown[]>}
     */
    list: () => all(),
    /**
     * Read one page of records with paging metadata.
     *
     * @param {object} [options] `page` (1-based, default 1) and `perPage` (default 30).
     * @returns {Promise<{items: unknown[], page: number, perPage: number, totalItems: number, totalPages: number}>}
     * @throws {TypeError} When page or perPage is not a positive integer.
     */
    async listPage({ page = 1, perPage = 30 } = {}) {
      if (!isPositiveInteger(page))
        throw new TypeError(
          "createIndexedDBAdapter: listPage expects page to be a positive integer.",
        );
      if (!isPositiveInteger(perPage))
        throw new TypeError(
          "createIndexedDBAdapter: listPage expects perPage to be a positive integer.",
        );
      const records = await all();
      return {
        items: records.slice((page - 1) * perPage, page * perPage),
        page,
        perPage,
        totalItems: records.length,
        totalPages: Math.ceil(records.length / perPage),
      };
    },
    /**
     * Read one record.
     *
     * @param {number} id
     * @returns {Promise<unknown>}
     * @throws {Error} When the record does not exist.
     */
    async get(id) {
      const record = await run("readonly", (objectStore, done) => {
        objectStore.get(id).onsuccess = (event) => done(event.target.result);
      });
      if (record === undefined) throw missing(id);
      return record;
    },
    /**
     * Store a new record. A caller-supplied `id` is ignored so the key is always generated;
     * `data` is not mutated.
     *
     * @param {object} data
     * @returns {Promise<unknown>} The stored record, including its generated `id`.
     */
    create: ({ id: _ignored, ...data } = {}) =>
      run("readwrite", (objectStore, done) => {
        objectStore.add(data).onsuccess = (event) => {
          objectStore.get(event.target.result).onsuccess = (read) => done(read.target.result);
        };
      }),
    /**
     * Shallow-merge a patch into a record.
     *
     * @param {number} id
     * @param {object} patch
     * @returns {Promise<unknown>} The updated record.
     * @throws {Error} When the record does not exist.
     */
    update: (id, patch) =>
      run("readwrite", (objectStore, done, fail) => {
        objectStore.get(id).onsuccess = (event) => {
          const current = event.target.result;
          if (current === undefined) {
            fail(missing(id));
            return;
          }
          const merged = { ...current, ...patch, id: current.id };
          objectStore.put(merged);
          done(merged);
        };
      }),
    /**
     * Delete a record; resolves even when it does not exist.
     *
     * @param {number} id
     * @returns {Promise<undefined>}
     */
    async delete(id) {
      await run("readwrite", (objectStore) => {
        objectStore.delete(id);
      });
    },
    /**
     * Close the connection. A later call opens it again.
     *
     * @returns {Promise<undefined>}
     */
    async close() {
      const pending = connection;
      connection = null;
      (await pending?.catch(() => null))?.close();
    },
  };
}
