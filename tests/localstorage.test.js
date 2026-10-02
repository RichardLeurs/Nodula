import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { Window } from 'happy-dom';

const window = new Window({ url: 'http://localhost/' });
globalThis.window = window;
globalThis.document = window.document;

const { createRoot } = await import('nodula-framework');
const { createIndexedDBSignal, createStorageSignal, deleteCookie, getCookie, setCookie } = await import('../framework/addons/localstorage.js');

after(() => window.close());

describe('Nodula local-storage add-on', () => {
  it('hydrates JSON from localStorage and persists signal changes', () => {
    window.localStorage.setItem('counter', '4');
    const [count, setCount] = createStorageSignal('counter', 0);
    assert.equal(count(), 4);

    setCount((value) => value + 1);
    assert.equal(count(), 5);
    assert.equal(window.localStorage.getItem('counter'), '5');
  });

  it('uses the initial value for missing or malformed stored JSON', () => {
    window.localStorage.setItem('invalid', '{not json');
    const [readInvalid] = createStorageSignal('invalid', { ready: true });
    const [readMissing] = createStorageSignal('missing', 'default');

    assert.deepEqual(readInvalid(), { ready: true });
    assert.equal(readMissing(), 'default');
  });

  it('stays usable when storage is unavailable or throws', () => {
    const unavailable = createStorageSignal('unavailable', 1, { storage: null });
    unavailable[1](2);
    assert.equal(unavailable[0](), 2);

    const throwingStorage = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
    };
    const [read, write] = createStorageSignal('blocked', 'fallback', { storage: throwingStorage });
    assert.equal(read(), 'fallback');
    assert.doesNotThrow(() => write('memory only'));
    assert.equal(read(), 'memory only');
  });

  it('stops persisting when its Nodula owner is disposed', () => {
    let setValue;
    const [, dispose] = createRoot(() => {
      [, setValue] = createStorageSignal('owned', 0);
    });
    assert.equal(window.localStorage.getItem('owned'), '0');
    dispose();
    setValue(1);
    assert.equal(window.localStorage.getItem('owned'), '0');
  });

  it('requires a non-empty storage key', () => {
    assert.throws(() => createStorageSignal('', 0), /non-empty storage key/);
    assert.throws(() => createStorageSignal(42, 0), /non-empty storage key/);
  });

  it('sets and reads URI-encoded cookies with configurable attributes', () => {
    setCookie('nodula greeting', 'hello; nodula!', {
      path: '/',
      maxAge: 3600,
      sameSite: 'Lax',
      secure: true,
    });

    assert.equal(getCookie('nodula greeting'), 'hello; nodula!');
    assert.match(window.document.cookie, /nodula%20greeting=hello%3B%20nodula!/);
  });

  it('returns undefined for missing cookies and deletes cookies', () => {
    assert.equal(getCookie('missing-cookie'), undefined);
    setCookie('delete-me', 'value', { path: '/', maxAge: 3600 });
    assert.equal(getCookie('delete-me'), 'value');
    deleteCookie('delete-me', { path: '/' });
    assert.equal(getCookie('delete-me'), undefined);
  });

  it('validates cookie names and options and requires a document', () => {
    assert.throws(() => getCookie(''), /Cookie names must be non-empty/);
    assert.throws(() => setCookie('unsafe', 'value', { path: '/; Secure' }), /without semicolons/);
    assert.throws(() => setCookie('bad-age', 'value', { maxAge: 1.5 }), /integer number of seconds/);
    assert.throws(() => setCookie('bad-site', 'value', { sameSite: 'sometimes' }), /Strict, Lax, or None/);

    const originalDocument = globalThis.document;
    try {
      delete globalThis.document;
      assert.throws(() => getCookie('no-document'), /only available in a browser document/);
    } finally {
      globalThis.document = originalDocument;
    }
  });
});

function createIndexedDBMock(records = new Map()) {
  const database = {
    objectStoreNames: { contains: () => true },
    createObjectStore() {},
    close() {},
    transaction(_storeName, mode) {
      const transaction = {};
      transaction.objectStore = () => ({
        get(key) { return makeRequest(() => records.get(key), transaction); },
        getKey(key) { return makeRequest(() => records.has(key) ? key : undefined, transaction); },
        put(value, key) {
          return makeRequest(() => {
            if (mode !== 'readwrite') throw new Error('Transaction is readonly.');
            records.set(key, value);
            return key;
          }, transaction);
        },
      });
      return transaction;
    },
  };

  return {
    records,
    indexedDB: {
      open() {
        const request = {};
        setTimeout(() => {
          request.result = database;
          request.onupgradeneeded?.();
          request.onsuccess?.();
        }, 0);
        return request;
      },
    },
  };
}

function makeRequest(resolve, transaction) {
  const request = {};
  setTimeout(() => {
    try {
      request.result = resolve();
      request.onsuccess?.();
      setTimeout(() => transaction.oncomplete?.(), 0);
    } catch (error) {
      request.error = error;
      request.onerror?.();
      transaction.onerror?.();
    }
  }, 0);
  return request;
}

describe('Nodula IndexedDB storage add-on', () => {
  it('hydrates asynchronously and persists initial and updated values', async () => {
    const mock = createIndexedDBMock(new Map([['counter', 4]]));
    const storedCount = createIndexedDBSignal('counter', 0, { indexedDB: mock.indexedDB });
    const [count, setCount] = storedCount;
    assert.equal(count(), 0);
    assert.equal(storedCount.available, false);
    await storedCount.ready;
    assert.equal(storedCount.available, true);
    assert.equal(count(), 4);

    setCount((value) => value + 1);
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(count(), 5);
    assert.equal(mock.records.get('counter'), 5);
  });

  it('persists the initial value when the key is missing', async () => {
    const mock = createIndexedDBMock();
    const storedValue = createIndexedDBSignal('first-run', { ready: true }, { indexedDB: mock.indexedDB });
    await storedValue.ready;
    assert.deepEqual(mock.records.get('first-run'), { ready: true });
  });

  it('keeps an in-memory update made before hydration wins over stored data', async () => {
    const mock = createIndexedDBMock(new Map([['early', 'stored']]));
    const storedValue = createIndexedDBSignal('early', 'initial', { indexedDB: mock.indexedDB });
    const [read, write] = storedValue;
    write('newer');
    await storedValue.ready;
    assert.equal(read(), 'newer');
    assert.equal(mock.records.get('early'), 'newer');
  });

  it('falls back to a usable memory signal when IndexedDB is absent or fails', async () => {
    const unavailable = createIndexedDBSignal('no-idb', 1, { indexedDB: null });
    await unavailable.ready;
    assert.equal(unavailable.available, false);
    unavailable[1](2);
    assert.equal(unavailable[0](), 2);

    const throwingFactory = createIndexedDBSignal('blocked', 'fallback', {
      indexedDB: { open() { throw new Error('blocked'); } },
    });
    await throwingFactory.ready;
    assert.equal(throwingFactory.available, false);
    throwingFactory[1]('memory only');
    assert.equal(throwingFactory[0](), 'memory only');
  });

  it('requires a non-empty key', () => {
    assert.throws(() => createIndexedDBSignal('', 0), /non-empty storage key/);
  });
});