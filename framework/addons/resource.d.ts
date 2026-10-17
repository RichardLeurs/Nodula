import type { Accessor } from "nodula-framework";

export type ResourceState = "initial" | "pending" | "ready" | "refreshing" | "errored";

export interface ResourceFetchOptions {
  /** Aborted when a newer request supersedes this one or the resource is disposed. */
  signal?: AbortSignal;
}

export interface ResourceOptions<S> {
  /** Reactive input; the resource refetches whenever it changes. */
  source?: Accessor<S>;
  /** Start loading immediately. Defaults to true; false waits for refetch(). */
  immediate?: boolean;
}

export interface Resource<T> {
  /** Last successful value; kept while refreshing and after an error. */
  value: Accessor<T | undefined>;
  state: Accessor<ResourceState>;
  /** True while the first request or a refresh is in flight. */
  loading: Accessor<boolean>;
  /** The error thrown by the most recent failed request, unchanged; null after a success. */
  error: Accessor<unknown>;
  /** Start a request with the current source value. Rejects with the fetcher's error. */
  refetch(): Promise<T | undefined>;
  /** Abort in-flight work and stop reacting to the source. Also runs with the owning root. */
  dispose(): void;
}

/** Load data asynchronously with reactive state, cancellation, and stale-response handling. */
export function createResource<T, S = undefined>(
  fetcher: (input: S, options: ResourceFetchOptions) => T | Promise<T>,
  options?: ResourceOptions<S>,
): Resource<T>;
