// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Provide Fetch-based request helpers and structured HTTP errors. */
function appendQueryParams(url, params) {
  if (!params) return;
  const entries =
    params instanceof URLSearchParams
      ? params.entries()
      : Object.entries(params).flatMap(([key, value]) =>
          (Array.isArray(value) ? value : [value])
            .filter((entry) => entry !== undefined && entry !== null)
            .map((entry) => [key, String(entry)]),
        );

  for (const [key, value] of entries) url.searchParams.append(key, value);
}

/**
 * Resolve a request path against the configured base URL.
 *
 * Absolute URLs are returned unchanged. Relative paths are joined to the base URL, and the result is made absolute against the document base.
 *
 * @param {string} baseURL
 * @param {string} path
 * @returns {string} The absolute URL string.
 */
function joinUrl(baseURL, path) {
  const requestPath = String(path);
  if (!baseURL) return requestPath;
  try {
    return new URL(requestPath).href;
  } catch {
    // Relative paths are joined to the configured base URL below.
  }
  const base = String(baseURL).replace(/\/+$/, "");
  const relativePath = requestPath.replace(/^\/+/, "");
  const joined = `${base}/${relativePath}`;
  const baseUri = globalThis.document?.baseURI ?? globalThis.location?.href;
  return baseUri ? new URL(joined, baseUri).href : joined;
}

/**
 * Whether a request body should be sent as JSON.
 *
 * Plain objects and arrays are JSON. Fetch-native bodies such as FormData, Blob and strings are sent as they are.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isJsonBody(value) {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return true;

  const prototype = Object.getPrototypeOf(value);
  return (
    prototype === null ||
    (Object.prototype.toString.call(value) === "[object Object]" &&
      Object.getPrototypeOf(prototype) === null)
  );
}

/**
 * Read a response body as JSON when it declares JSON, otherwise as text.
 *
 * Empty and 204/205 responses give null. A JSON-declared error body that does not parse is returned as text,
 * so the HTTP status is still reported by `DataError`.
 *
 * @param {Response} response
 * @returns {Promise<unknown>}
 */
async function readResponse(response) {
  if (response.status === 204 || response.status === 205) return null;
  const contentType = response.headers?.get?.("content-type") ?? "";
  if (/\bjson\b/i.test(contentType) || /\+json\b/i.test(contentType)) {
    const text = await response.text();
    if (!text) return null;
    // Error pages (e.g. a proxy's HTML 502) may claim JSON; keep the raw text so DataError keeps the status.
    if (!response.ok) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return JSON.parse(text);
  }
  return response.text();
}

/** Error thrown when a data request receives a non-success HTTP response. */
export class DataError extends Error {
  /**
   * Create the error from the response and the parsed body.
   *
   * @param {Response} response The failed response; its status is kept on `status`.
   * @param {unknown} data Parsed error body, or the raw text.
   */
  constructor(response, data) {
    super(
      `Data request failed with HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}.`,
    );
    this.name = "DataError";
    this.code = "nodula-data-http-error";
    this.status = response.status;
    this.response = response;
    this.data = data;
  }
}

/** Create a small Fetch-based client with JSON handling and HTTP method helpers. */
export function createDataClient({
  baseURL = "",
  headers: defaultHeaders = {},
  fetcher = globalThis.fetch,
} = {}) {
  if (typeof baseURL !== "string")
    throw new TypeError("createDataClient expects baseURL to be a string.");
  if (typeof fetcher !== "function")
    throw new TypeError("createDataClient expects a Fetch-compatible fetcher.");

  /**
   * Send a request through the configured Fetch transport.
   *
   * Query parameters, default and per-request headers, and JSON bodies are applied. A non-success response throws `DataError`.
   *
   * @param {string} path Path, relative to `baseURL`, or an absolute URL.
   * @param {object} [options] `params`, `headers`, `body`, and any other fetch option.
   * @returns {Promise<unknown>} The parsed response body.
   * @throws {DataError} For a non-success HTTP status.
   */
  async function request(path, options = {}) {
    const { params, headers: requestHeaders, body, ...fetchOptions } = options;
    const url = new URL(
      joinUrl(baseURL, path),
      globalThis.document?.baseURI ?? globalThis.location?.href ?? "http://localhost/",
    );
    appendQueryParams(url, params);

    const headers = new Headers(defaultHeaders);
    new Headers(requestHeaders).forEach((value, key) => headers.set(key, value));
    let requestBody = body;
    if (body !== undefined && isJsonBody(body)) {
      requestBody = JSON.stringify(body);
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
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
    /**
     * Send a GET request.
     *
     * @param {string} path
     * @param {object} [options] Request options, as for `request`.
     * @returns {Promise<unknown>} The parsed response body.
     */
    get(path, options = {}) {
      return request(path, { ...options, method: "GET" });
    },
    /**
     * Send a POST request.
     *
     * @param {string} path
     * @param {unknown} body Sent as JSON for plain objects and arrays.
     * @param {object} [options]
     * @returns {Promise<unknown>}
     */
    post(path, body, options = {}) {
      return request(path, { ...options, method: "POST", body });
    },
    /**
     * Send a PUT request.
     *
     * @param {string} path
     * @param {unknown} body
     * @param {object} [options]
     * @returns {Promise<unknown>}
     */
    put(path, body, options = {}) {
      return request(path, { ...options, method: "PUT", body });
    },
    /**
     * Send a PATCH request.
     *
     * @param {string} path
     * @param {unknown} body
     * @param {object} [options]
     * @returns {Promise<unknown>}
     */
    patch(path, body, options = {}) {
      return request(path, { ...options, method: "PATCH", body });
    },
    /**
     * Send a DELETE request.
     *
     * @param {string} path
     * @param {object} [options]
     * @returns {Promise<unknown>}
     */
    delete(path, options = {}) {
      return request(path, { ...options, method: "DELETE" });
    },
  };
}
