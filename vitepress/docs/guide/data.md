# Data Add-on

The optional `nodula-framework/data` add-on provides a small client built on the browser’s Fetch API. It adds base-URL joining, shared headers, query parameters, JSON body/response handling, HTTP errors, and method helpers while keeping networking code out of the core runtime. Requests run in the environment where the client is called; this API does not create a server proxy or enforce authorization.

## Install and import

The add-on is included with Nodula. Import `createDataClient` and, when you need to distinguish HTTP failures, `DataError`:

```js
import { createDataClient, DataError } from 'nodula-framework/data';
```

No additional runtime dependency or plugin is required.

## Quick start

```js
const api = createDataClient({ baseURL: '/api' });

const ideas = await api.get('/ideas', { params: { limit: 10 } });
const created = await api.post('/ideas', { text: 'Plant a garden' });
await api.patch(`/ideas/${created.id}`, { done: true });
```

Relative request paths are joined to `baseURL`. Absolute request URLs are used as-is. Requests are not made until a client method is called.

## API reference

### `createDataClient(options?)`

Creates a Fetch-based client. Options:

| Option | Type | Default | Description |
|---|---|---|---|
| `baseURL` | `string` | `''` | URL prefix joined with relative request paths. Must be a string. |
| `headers` | `HeadersInit` | `{}` | Default request headers. Per-request headers override matching defaults. |
| `fetcher` | `typeof globalThis.fetch` | `globalThis.fetch` | Fetch-compatible transport, useful for tests or custom transports. Must be a function. |

Returns a `DataClient` with the following methods:

| Method | Parameters | Result |
|---|---|---|
| `fetch(path, options?)` | `string \| URL`, `DataRequestOptions` | Sends request and parses response. |
| `request(path, options?)` | Same as `fetch` | Alias of `fetch`. |
| `get(path, options?)` | Path and request options | Sends `GET`. |
| `post(path, body?, options?)` | Path, body, request options | Sends `POST`. |
| `put(path, body?, options?)` | Path, body, request options | Sends `PUT`. |
| `patch(path, body?, options?)` | Path, body, request options | Sends `PATCH`. |
| `delete(path, options?)` | Path and request options | Sends `DELETE`. |

Request options extend Fetch `RequestInit` (except `body`, which accepts JSON values too) and add:

| Option | Type | Description |
|---|---|---|
| `params` | `URLSearchParams \| Record<string, scalar \| scalar[] \| null \| undefined>` | Appends query parameters. Arrays become repeated keys; `null` and `undefined` entries are omitted. |
| `body` | `BodyInit \| object \| null` | Plain objects and arrays are JSON-serialized; other Fetch body types pass through. |

### `DataError`

`DataError` extends `Error` and is thrown when a response has a non-success HTTP status. It exposes `status`, the original `response`, and the parsed response body as `data`. Network errors and JSON parse errors propagate as their original errors.

## Request and response behavior

- Per-request headers override default headers.
- Plain object and array bodies are JSON-serialized and receive `Content-Type: application/json` unless already supplied.
- `FormData`, `Blob`, strings, and other Fetch `BodyInit` values pass through without JSON serialization.
- JSON content types are parsed as JSON; other content types are returned as text.
- Empty `204` and `205` responses return `null`.
- Standard Fetch options, including `signal`, are passed to the configured fetcher.
- The client does not retry requests, cache responses, or impose an authentication/session policy.

## Error handling

```js
try {
  const idea = await api.get('/ideas/42');
} catch (error) {
  if (error instanceof DataError) {
    console.error(error.status, error.data);
  } else {
    throw error;
  }
}
```

`DataError` covers HTTP error responses. If an error response declares JSON but its body does not parse (for example a proxy's HTML 502 page), `DataError` still carries the status and `error.data` holds the raw text. Fetch/network failures, and malformed JSON in a success response, remain separate errors so applications can handle them according to their transport and UI needs.

## Browser, CORS, and security boundaries

When called in a browser, Fetch requests go directly from the visitor’s browser to the target. Cross-origin targets must allow the site’s origin through CORS. Use a same-origin backend endpoint when credentials or private upstream access must stay server-side; do not put server secrets in client headers or source code.

The add-on does not authenticate users or authorize operations. Validate input and enforce authorization on the server for every protected request. See [Security](/guide/security).

## Examples and related resources

- For PocketBase collections and Supabase tables, the SDK-free [Data Adapters](/guide/data-adapters) (`nodula-framework/data-pocketbase` and `nodula-framework/data-supabase`) build `list`, `get`, `create`, `update` and `delete` on this client.
- The demo app’s [`/data` page](https://nodula.richardleurs.nl/data) shows browser storage, PHP-backed SQLite and Supabase endpoints, and remote JSON requests. Its IndexedDB-backed local ideas list is a separate example using `createIndexedDB` from `nodula-framework/localstorage`; see [Local Storage](/guide/local-storage).
- Data client behavior is covered by `framework/vitest/data.test.js`, and the demo integrations by `demo_app/vitest/data-page.test.js`, `demo_app/vitest/sqlite-ideas.test.js`, `demo_app/vitest/supabase-ideas.test.js`, and `demo_app/vitest/pocketbase-api.test.js`.