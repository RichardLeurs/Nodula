/* Provide Fetch-based request helpers and structured HTTP errors. */
function appendQueryParams(url, params) {
  if (!params) return;
  const entries = params instanceof URLSearchParams
    ? params.entries()
    : Object.entries(params).flatMap(([key, value]) =>
      (Array.isArray(value) ? value : [value])
        .filter((entry) => entry !== undefined && entry !== null)
        .map((entry) => [key, String(entry)]));

  for (const [key, value] of entries) url.searchParams.append(key, value);
}

function joinUrl(baseURL, path) {
  const requestPath = String(path);
  if (!baseURL) return requestPath;
  try {
    return new URL(requestPath).href;
  } catch {
    // Relative paths are joined to the configured base URL below.
  }
  const base = String(baseURL).replace(/\/+$/, '');
  const relativePath = requestPath.replace(/^\/+/, '');
  const joined = `${base}/${relativePath}`;
  const baseUri = globalThis.document?.baseURI ?? globalThis.location?.href;
  return baseUri ? new URL(joined, baseUri).href : joined;
}

function isJsonBody(value) {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return true;

  const prototype = Object.getPrototypeOf(value);
  return prototype === null
    || (Object.prototype.toString.call(value) === '[object Object]'
      && Object.getPrototypeOf(prototype) === null);
}

async function readResponse(response) {
  if (response.status === 204 || response.status === 205) return null;
  const contentType = response.headers?.get?.('content-type') ?? '';
  if (/\bjson\b/i.test(contentType) || /\+json\b/i.test(contentType)) {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  return response.text();
}

/** Error thrown when a data request receives a non-success HTTP response. */
export class DataError extends Error {
  constructor(response, data) {
    super(`Data request failed with HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}.`);
    this.name = 'DataError';
    this.status = response.status;
    this.response = response;
    this.data = data;
  }
}

/** Create a small Fetch-based client with JSON handling and HTTP method helpers. */
export function createDataClient({ baseURL = '', headers: defaultHeaders = {}, fetcher = globalThis.fetch } = {}) {
  if (typeof baseURL !== 'string') throw new TypeError('createDataClient expects baseURL to be a string.');
  if (typeof fetcher !== 'function') throw new TypeError('createDataClient expects a Fetch-compatible fetcher.');

  async function request(path, options = {}) {
    const { params, headers: requestHeaders, body, ...fetchOptions } = options;
    const url = new URL(joinUrl(baseURL, path), globalThis.document?.baseURI ?? globalThis.location?.href ?? 'http://localhost/');
    appendQueryParams(url, params);

    const headers = new Headers(defaultHeaders);
    new Headers(requestHeaders).forEach((value, key) => headers.set(key, value));
    let requestBody = body;
    if (body !== undefined && isJsonBody(body)) {
      requestBody = JSON.stringify(body);
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    }

    const response = await fetcher(url.href, {
      ...fetchOptions,
      headers,
      ...(requestBody === undefined ? {} : { body: requestBody }),
    });
    const data = await readResponse(response);
    if (!response.ok) throw new DataError(response, data);
    return data;
  }

  return {
    fetch: request,
    request,
    get(path, options = {}) {
      return request(path, { ...options, method: 'GET' });
    },
    post(path, body, options = {}) {
      return request(path, { ...options, method: 'POST', body });
    },
    put(path, body, options = {}) {
      return request(path, { ...options, method: 'PUT', body });
    },
    patch(path, body, options = {}) {
      return request(path, { ...options, method: 'PATCH', body });
    },
    delete(path, options = {}) {
      return request(path, { ...options, method: 'DELETE' });
    },
  };
}