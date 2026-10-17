// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Provide reactive async resources with stale-response handling and cancellation. */
import { computed, effect, onCleanup, signal } from "nodula-framework";

/**
 * Register a dispose function with the current owner.
 *
 * Outside an owner the caller must call the dispose function itself.
 *
 * @param {() => void} dispose
 */
function registerCleanup(dispose) {
  try {
    onCleanup(dispose);
  } catch {
    // Resources can be used outside a Nodula owner; call the returned dispose() then.
  }
}

/**
 * Load data asynchronously and expose its state reactively. A new request aborts the previous one
 * through AbortSignal, and a superseded result is ignored. The last successful value is kept during a refresh.
 */
export function createResource(fetcher, { source, immediate = true } = {}) {
  if (typeof fetcher !== "function") throw new TypeError("createResource expects a fetcher function.");
  if (source !== undefined && typeof source !== "function")
    throw new TypeError("createResource source must be an accessor function.");
  if (typeof immediate !== "boolean") throw new TypeError("createResource immediate must be a boolean.");

  const [value, setValue] = signal(undefined);
  // initial: no request yet (immediate: false); pending: first request; ready; refreshing: a request after a success; errored.
  const [state, setState] = signal(immediate ? "pending" : "initial");
  const [error, setError] = signal(null);
  const loading = computed(() => {
    const current = state();
    return current === "pending" || current === "refreshing";
  });
  let requestId = 0;
  let controller = null;
  let hasValue = false;
  let disposed = false;

  // Returns the request's promise. A superseded or disposed request resolves to undefined and changes nothing.
  /**
   * Start a request and return its promise.
   *
   * A superseded or disposed request resolves to undefined and changes nothing. A failure sets `error`
   * and rejects the returned promise.
   *
   * @param {unknown} input Source value passed to the fetcher.
   * @returns {Promise<T | undefined>}
   */
  function start(input) {
    if (disposed) return Promise.resolve(undefined);
    controller?.abort();
    const id = ++requestId;
    const current = typeof AbortController === "function" ? new AbortController() : null;
    controller = current;
    setState(hasValue ? "refreshing" : "pending");
    // Run the fetcher outside the caller's reactive scope, so signals it reads are not tracked.
    return Promise.resolve()
      .then(() => fetcher(input, { signal: current?.signal }))
      .then(
        (result) => {
          if (id !== requestId || disposed) return undefined;
          controller = null;
          hasValue = true;
          setValue(() => result);
          setError(null);
          setState("ready");
          return result;
        },
        (cause) => {
          if (id !== requestId || disposed) return undefined;
          controller = null;
          setError(cause);
          setState("errored");
          throw cause;
        },
      );
  }

  // Internal loads report failures through `error`, so they never surface as unhandled rejections.
  const load = (input) => start(input).catch(() => undefined);
  /**
   * The current source value, or undefined when there is no source.
   */
  const readInput = () => (source ? source() : undefined);

  let stopEffect = null;
  if (source) {
    let firstRun = true;
    stopEffect = effect(() => {
      const input = source();
      if (firstRun) {
        firstRun = false;
        if (!immediate) return;
      }
      load(input);
    });
  } else if (immediate) {
    load(undefined);
  }

  /**
   * Stop reacting to the source, abort the in-flight request, and leave the loading states.
   *
   * Safe to call more than once.
   */
  function dispose() {
    if (disposed) return;
    disposed = true;
    stopEffect?.();
    controller?.abort();
    controller = null;
    // Nothing else will settle the request, so leave the loading states.
    if (state() === "pending" || state() === "refreshing") setState(hasValue ? "ready" : "initial");
  }
  registerCleanup(dispose);

  return {
    value,
    state,
    loading,
    error,
    /** Start a request with the current source value. Rejects with the fetcher's error. */
    refetch: () => start(readInput()),
    dispose,
  };
}
