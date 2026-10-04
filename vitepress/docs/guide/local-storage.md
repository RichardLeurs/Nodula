# Browser storage

The optional `nodula-framework/localstorage` add-on provides cookie helpers and signal persistence with browser `localStorage` or IndexedDB. Import it separately so browser persistence stays out of the core runtime.

## localStorage

```
import { createLocalStorage } from 'nodula-framework/localstorage';

const [theme, setTheme] = createLocalStorage('app-theme', 'dark');

theme(); // 'dark', or the saved value for "app-theme"
setTheme('light'); // updates the signal and persists the JSON value
```

## API

```
createLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: { storage?: Storage | null },
): [read: () => T, write: (value: T | ((current: T) => T)) => T]
```

- **`key`**is a non-empty key in the selected storage area.
- **`initialValue`**is used when there is no saved value or the saved JSON cannot be parsed. The initial value is then written to storage when possible.
- **`storage`**defaults to`window.localStorage`. Pass another compatible`Storage`object for testing or`null`to create a memory-only signal.

Saved values are read with `JSON.parse` and written with `JSON.stringify`, so use JSON-serializable values (plain objects, arrays, and primitives). If reading or writing storage throws—for example, because browser storage is blocked or full—the signal remains usable in memory. Values that cannot be serialized are likewise not persisted.

When created inside a Nodula owner, the persistence effect is cleaned up when that owner is disposed. This add-on is browser-side persistence: it does not serialize saved values into server-rendered HTML, synchronize changes across browser tabs, or protect sensitive data. Do not use local storage for secrets or as an authorization mechanism.

The demo app uses `createLocalStorage('nodula-theme', 'dark')` to persist the theme toggle. The selection is restored when the app is mounted again in the same browser storage area. `createStorageSignal` remains available as a deprecated alias.

## IndexedDB

Use `createIndexedDB` for larger values or storage that should use IndexedDB:

```
import { createIndexedDB } from 'nodula-framework/localstorage';

const notes = createIndexedDB('notes', []);
const [readNotes, setNotes] = notes;
await notes.ready;
console.log(readNotes());
setNotes((notes) => [...notes, { text: 'A saved note' }]);
```

The function returns the normal signal pair with a `ready` promise and an `available` flag. The pair starts with `initialValue`; await `ready` before checking `available` or relying on the saved value having hydrated. `available` is true only when the database opens and its initial read succeeds. Options accept an `indexedDB` factory for testing/custom environments and a `databaseName` (default `nodula-framework`). The add-on creates and uses a `signals` object store. Changes made before hydration take precedence over saved data and are persisted after the database opens. If IndexedDB is unavailable or fails, the signal remains usable in memory. `createIndexedDBSignal` remains available as a deprecated alias.

When created inside a Nodula owner, the database connection is closed when the owner is disposed. IndexedDB is asynchronous and is not cross-tab reactive synchronization or a security boundary.

## Cookies

The same add-on exports `getCookie`, `setCookie`, and `deleteCookie` for browser-readable cookies:

```
import { deleteCookie, getCookie, setCookie } from 'nodula-framework/localstorage';

setCookie('app-preference', 'compact mode', {
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
  sameSite: 'Lax',
  secure: true,
});

const preference = getCookie('app-preference');
deleteCookie('app-preference', { path: '/' });
```

Cookie names and values are URI-encoded. `getCookie(name)` returns a string or `undefined` when the cookie is absent. `setCookie` accepts `path`, `domain`, `expires`, `maxAge` (seconds), `sameSite` (`Strict`, `Lax`, or `None`), and `secure`. `deleteCookie` expires the cookie using the same path/domain scope, so pass the options used when it was created. Cookies are scoped by the browser's domain/path rules; JavaScript cannot read `HttpOnly` cookies or set the `HttpOnly` attribute. Use server-issued `HttpOnly`, `Secure`, and appropriate `SameSite` cookies for session credentials; do not store secrets in script-readable cookies.
