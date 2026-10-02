# Data Requests

The optional `nodula-framework/data` add-on provides a small client built on the browser's Fetch API. Import it separately so HTTP helpers do not add code to the core runtime:

The demo app's `/data` route loads a post from `https://jsonplaceholder.typicode.com/posts/1`. The request is made by the visitor's browser, so trying other addresses requires that server to allow cross-origin requests (CORS).

```
import { createDataClient, DataError } from 'nodula-framework/data';

const api = createDataClient({ baseURL: '/api' });
const ideas = await api.get('/ideas', { params: { limit: 10 } });
const created = await api.post('/ideas', { text: 'Plant a garden' });
```

## Client options

`createDataClient({ baseURL, headers, fetcher })` accepts:

- **`baseURL`**: optional URL prefix joined with each request path.
- **`headers`**: default request headers. Headers passed to an individual request override defaults.
- **`fetcher`**: a Fetch-compatible function; defaults to`globalThis.fetch`and can be replaced for tests or custom transports.

## Requests and responses

The returned client exposes `fetch(path, options)` and its alias `request(path, options)`, plus `get`, `post`, `put`, `patch`, and `delete` helpers. The method helpers accept standard Fetch options; `get` and `delete` take options, while `post`, `put`, and `patch` take a body followed by optional request options.

Pass `params` in request options to append query values. Arrays become repeated query keys, and `null` or `undefined` values are omitted. Plain object and array bodies are JSON-serialized and receive an `application/json` content type unless one is already set. Other `BodyInit` values pass through unchanged.

Responses with a JSON content type are parsed as JSON; other response bodies are returned as text. Empty `204` and `205` responses return `null`. Non-success HTTP responses reject with `DataError`, which exposes the HTTP `status`, original `response`, and parsed response body as `data`. Network errors and JSON parse errors are not hidden or retried.

```
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

This add-on does not provide authentication, caching, retries, or request cancellation policy beyond the standard `signal` Fetch option; configure those concerns in the app or its supplied `fetcher`.
