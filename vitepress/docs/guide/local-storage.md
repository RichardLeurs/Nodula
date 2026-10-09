# Local Storage Add-on

The optional `nodula-framework/localstorage` add-on provides reactive persistence through browser `localStorage` and asynchronous IndexedDB, plus helpers for browser-readable cookies. Import it separately to keep persistence code out of Nodula’s core runtime. Stored browser data is user-controlled and must not be treated as secret or trusted.

## Install and import

The add-on is included with Nodula. Import the APIs you need from its package entry:

```js
import {
  createIndexedDB,
  createLocalStorage,
  deleteCookie,
  getCookie,
  setCookie,
} from 'nodula-framework/localstorage';
```

## Quick start

### Persist a signal in localStorage

```js
const [theme, setTheme] = createLocalStorage('app-theme', 'dark');

console.log(theme()); // Saved value, or 'dark' when key is missing/invalid.
setTheme('light');
setTheme((current) => current === 'dark' ? 'light' : 'dark');
```

### Persist a signal in IndexedDB

```js
const notes = createIndexedDB('notes', []);
const [readNotes, setNotes] = notes;

await notes.ready;
if (notes.available) console.log(readNotes());
setNotes((current) => [...current, { text: 'A saved note' }]);
```

### Read and write a browser cookie

```js
setCookie('display-mode', 'compact', { path: '/', sameSite: 'Lax', secure: true });
const displayMode = getCookie('display-mode');
deleteCookie('display-mode', { path: '/' });
```

## API reference

### `createLocalStorage(key, initialValue, options?)`

Creates a signal pair `[read, write]` persisted as JSON in localStorage.

| Argument / option | Type | Default | Behavior |
|---|---|---|---|
| `key` | `string` | Required | Non-empty storage key; otherwise throws `TypeError`. |
| `initialValue` | `T` | Required | Used when no saved value exists or saved JSON cannot be parsed. |
| `options.storage` | `Storage \| null` | `window.localStorage` when accessible | Selects a compatible storage implementation. `null` creates a memory-only signal. |

The returned reader is `() => T`. The writer accepts either a value or updater `(current: T) => T`, and returns the new value. If storage access or JSON serialization fails, the signal remains usable in memory but is not persisted.

### `createIndexedDB(key, initialValue, options?)`

Creates a signal tuple `[read, write]` with `ready: Promise<void>` and a read-only `available: boolean` property.

| Argument / option | Type | Default | Behavior |
|---|---|---|---|
| `key` | `string` | Required | Non-empty key in the object store; otherwise throws `TypeError`. |
| `initialValue` | `T` | Required | Immediate in-memory value and fallback when no saved record exists. |
| `options.indexedDB` | `IDBFactory \| null` | `globalThis.indexedDB` when accessible | IndexedDB factory; `null` or unavailable IndexedDB leaves the signal memory-only. |
| `options.databaseName` | `string` | `'nodula-framework'` | Non-empty database name; otherwise throws `TypeError`. |

The add-on creates a `signals` object store. Await `ready` before relying on persisted hydration or reading `available`; `available` becomes true only if opening the database and its initial read succeed. If a value is changed before hydration finishes, that in-memory update takes precedence over the saved record and is persisted after opening. Storage failures do not disable the in-memory signal.

### Cookie helpers

All cookie helpers require a browser `document` and a non-empty cookie name; invalid names or attributes throw `TypeError`.

#### `getCookie(name)`

Returns the URI-decoded cookie value as a string, or `undefined` if the cookie is absent. If a stored value has invalid URI encoding, returns its raw value.

#### `setCookie(name, value, options?)`

Writes a URI-encoded string, number, or boolean. Optional attributes:

| Option | Type | Default | Behavior |
|---|---|---|---|
| `path` | `string` | Browser default path | Cookie path scope. |
| `domain` | `string` | Host-only | Domain scope. |
| `expires` | `Date \| string` | Session cookie | Absolute expiration date; invalid dates throw `TypeError`. |
| `maxAge` | `number` | Session cookie | Integer lifetime in seconds; zero or negative expires the cookie. |
| `sameSite` | `'Strict' \| 'Lax' \| 'None'` | Browser default | SameSite policy; invalid values throw `TypeError`. |
| `secure` | `boolean` | `false` | Adds the `Secure` attribute when true. |

Cookie attribute strings reject semicolons and line breaks. Browsers generally require `Secure` when using `SameSite=None`.

#### `deleteCookie(name, options?)`

Expires the named cookie using the same path/domain scope it was created with. Pass matching scope options or the browser may retain the cookie.

## Behavior and lifecycle

- `createLocalStorage` reads persisted JSON when constructed and writes whenever the signal changes.
- `createIndexedDB` hydrates asynchronously; updates made before hydration take precedence over stored values.
- When created inside a Nodula owner, localStorage persistence effects stop on owner disposal and IndexedDB connections close on disposal. Outside an owner, signals remain usable without owner-managed cleanup.
- `createStorageSignal` and `createIndexedDBSignal` are deprecated aliases for `createLocalStorage` and `createIndexedDB`.
- Cookie helpers perform immediate document-cookie reads/writes and do not create reactive signals.

## Errors, limitations, and security

- Storage is browser-side. It is not included in server-rendered HTML and does not synchronize changes across browser tabs.
- Values are serialized as JSON. Functions, cyclic structures, and other non-JSON data are not suitable for persistence; storage failures are handled as memory-only operation.
- IndexedDB access is asynchronous; await `ready` before using `available` to determine whether it opened successfully.
- JavaScript cannot read or set `HttpOnly`. Use server-issued `HttpOnly`, `Secure`, and appropriately scoped `SameSite` cookies for session credentials.
- Do not store secrets or authorization decisions in localStorage, IndexedDB, or script-readable cookies. Server-side authorization remains required.

## Examples and related resources

- The demo app persists its theme with `createLocalStorage('nodula-theme', 'dark')`.
- The `/data` demo page includes IndexedDB-backed local create, complete, and remove actions.
- See [Cookie consent](/guide/cookie-consent) for versioned consent choices and [Security](/guide/security) for client/server trust boundaries.
- API behavior is covered by `framework/vitest/localstorage.test.js` and the demo’s `data-ideas-demo.test.js`.