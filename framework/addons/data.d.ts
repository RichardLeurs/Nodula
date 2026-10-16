export interface DataRequestOptions extends Omit<RequestInit, "body"> {
  /** Query parameters appended to the request URL. Array values become repeated keys. */
  params?:
    | URLSearchParams
    | Record<
        string,
        string | number | boolean | readonly (string | number | boolean)[] | null | undefined
      >;
  /** Request body; plain objects and arrays are JSON-serialized automatically. */
  body?: BodyInit | object | null;
}

export interface DataClientOptions {
  /** Base URL joined with each request path. */
  baseURL?: string;
  /** Headers included in every request; request-specific headers override these. */
  headers?: HeadersInit;
  /** Fetch-compatible implementation, useful for testing or custom transports. */
  fetcher?: typeof globalThis.fetch;
}

export interface DataClient {
  /** Send a request and return parsed JSON, text, or null for an empty response. */
  fetch<T = unknown>(path: string | URL, options?: DataRequestOptions): Promise<T>;
  /** Alias for `fetch`. */
  request<T = unknown>(path: string | URL, options?: DataRequestOptions): Promise<T>;
  get<T = unknown>(
    path: string | URL,
    options?: Omit<DataRequestOptions, "method" | "body">,
  ): Promise<T>;
  post<T = unknown>(
    path: string | URL,
    body?: DataRequestOptions["body"],
    options?: Omit<DataRequestOptions, "method" | "body">,
  ): Promise<T>;
  put<T = unknown>(
    path: string | URL,
    body?: DataRequestOptions["body"],
    options?: Omit<DataRequestOptions, "method" | "body">,
  ): Promise<T>;
  patch<T = unknown>(
    path: string | URL,
    body?: DataRequestOptions["body"],
    options?: Omit<DataRequestOptions, "method" | "body">,
  ): Promise<T>;
  delete<T = unknown>(
    path: string | URL,
    options?: Omit<DataRequestOptions, "method" | "body">,
  ): Promise<T>;
}

/** Create a configurable Fetch client with JSON handling and common HTTP methods. */
export function createDataClient(options?: DataClientOptions): DataClient;

/** HTTP error containing the response and its parsed response body. */
export class DataError extends Error {
  readonly status: number;
  readonly response: Response;
  readonly data: unknown;
}
