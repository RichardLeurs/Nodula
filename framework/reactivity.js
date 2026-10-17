// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

let observer = null;
let owner = null;
// Computeds settle before effects run, so an effect never reads a stale derived value.
const pendingComputeds = new Set();
const pendingEffects = new Set();
let flushing = false;
let batchDepth = 0;
const MAX_RERUNS = 100;
const cycleMessage = `A reactive computation re-ran ${MAX_RERUNS} times in one update; it likely writes a signal it depends on in a cycle.`;

/**
 * Run queued computations until none are pending.
 *
 * A call made while a flush is running returns at once, so the outer loop runs the new work. If a computation throws, the rest of the queue still runs and the first error is rethrown.
 */
function flush() {
  if (flushing || batchDepth) return;

  flushing = true;
  const runs = new Map();
  let failed = false;
  let firstError;
  try {
    while (pendingComputeds.size || pendingEffects.size) {
      const queue = pendingComputeds.size ? pendingComputeds : pendingEffects;
      const next = queue.values().next().value;
      queue.delete(next);
      const count = (runs.get(next) ?? 0) + 1;
      runs.set(next, count);
      if (count > MAX_RERUNS) {
        pendingComputeds.clear();
        pendingEffects.clear();
        if (!failed) [failed, firstError] = [true, new Error(cycleMessage)];
        break;
      }
      // One failing computation must not leave the rest of the queue stale.
      try {
        next.run();
      } catch (error) {
        if (!failed) [failed, firstError] = [true, error];
      }
    }
  } finally {
    flushing = false;
  }
  if (failed) throw firstError;
}

/**
 * Record the running computation as a subscriber of a signal.
 *
 * @param {Set<object>} subscribers Subscriber set of the signal being read.
 */
function track(subscribers) {
  if (observer?.active) {
    subscribers.add(observer);
    observer.dependencies.add(subscribers);
  }
}

/**
 * Queue every subscriber of a signal for re-run and flush, unless a batch or flush is already in progress.
 *
 * @param {Set<object>} subscribers Subscriber set of the signal that changed.
 */
function notify(subscribers) {
  for (const subscriber of subscribers)
    (subscriber.computed ? pendingComputeds : pendingEffects).add(subscriber);
  flush();
}

/**
 * Group writes so dependent work runs once, when `fn` returns.
 *
 * Nested batches flush when the outermost one ends.
 *
 * @template T
 * @param {() => T} fn
 * @returns {T} The value returned by `fn`.
 */
export function batch(fn) {
  batchDepth += 1;
  try {
    return fn();
  } finally {
    batchDepth -= 1;
    flush();
  }
}

/**
 * Create an ownership scope that holds cleanup callbacks.
 *
 * @param {"root" | "effect"} [type]
 * @returns {{ cleanups: Array<() => void>, disposed: boolean, type: string }}
 */
function createScope(type = "root") {
  return { cleanups: [], disposed: false, type };
}

/**
 * Dispose an ownership scope once, running its cleanups in reverse registration order.
 *
 * If a cleanup throws, the remaining cleanups still run and the first error is rethrown.
 *
 * @param {{ cleanups: Array<() => void>, disposed: boolean }} scope
 */
function dispose(scope) {
  if (!scope || scope.disposed) return;
  scope.disposed = true;
  let failed = false;
  let firstError;
  // Run every cleanup even if one throws, so the others do not leak.
  for (const cleanup of scope.cleanups.splice(0).reverse()) {
    try {
      cleanup();
    } catch (error) {
      if (!failed) [failed, firstError] = [true, error];
    }
  }
  if (failed) throw firstError;
}

/**
 * Run `fn` inside a new ownership scope.
 *
 * @template T
 * @param {() => T} fn
 * @param {{ detached?: boolean }} [options] Pass `detached: true` so disposing the current owner does not dispose this root.
 * @returns {[T, () => void]} The value returned by `fn` and a dispose function.
 * @throws Rethrows an error from `fn` after disposing the root.
 */
export function createRoot(fn, { detached = false } = {}) {
  const parent = owner;
  const root = createScope("root");
  if (parent && !detached) parent.cleanups.push(() => dispose(root));

  const previousOwner = owner;
  owner = root;
  try {
    return [fn(), () => dispose(root)];
  } catch (error) {
    dispose(root);
    throw error;
  } finally {
    owner = previousOwner;
  }
}

/**
 * Register a cleanup with the current root or effect run.
 *
 * @param {() => void} fn
 * @throws {Error} When called outside a root or effect.
 */
export function onCleanup(fn) {
  if (!owner) throw new Error("onCleanup must be called inside a root or effect.");
  owner.cleanups.push(fn);
}

/** Run once after the current reactive scope has completed its synchronous mount. */
export function onMount(fn) {
  if (!owner) throw new Error("onMount must be called inside a root or effect.");
  const scope = owner;
  if (scope.type !== "root")
    throw new Error("onMount must be called inside a root scope, not an effect.");
  queueMicrotask(() => {
    if (!scope.disposed) fn();
  });
}

/** Run when the current reactive scope is disposed. */
export function onUnmount(fn) {
  if (!owner) throw new Error("onUnmount must be called inside a root or effect.");
  if (owner.type !== "root")
    throw new Error("onUnmount must be called inside a root scope, not an effect.");
  owner.cleanups.push(fn);
}

// Rendering a conditional branch should not add its own reads to the condition effect.
/**
 * Run `fn` without tracking the signals it reads.
 *
 * A conditional render uses this so its reads do not add dependencies to the enclosing effect.
 *
 * @template T
 * @param {() => T} fn
 * @returns {T} The value returned by `fn`.
 */
export function untrack(fn) {
  const previousObserver = observer;
  observer = null;
  try {
    return fn();
  } finally {
    observer = previousObserver;
  }
}

/**
 * Create a reactive value.
 *
 * @template T
 * @param {T} initialValue
 * @returns {[() => T, (next: T | ((current: T) => T)) => T]} A reader and a writer.
 * The writer accepts a value or an updater function and returns the stored value. Values equal under
 * `Object.is` do not notify subscribers.
 */
export function signal(initialValue) {
  let value = initialValue;
  const subscribers = new Set();

  /**
   * Return the value, tracking the read when an effect is running.
   */
  function read() {
    track(subscribers);
    return value;
  }

  /**
   * Store a new value and notify subscribers when it changes.
   *
   * A function argument is treated as an updater and receives the current value.
   */
  function write(nextValue) {
    const resolvedValue = typeof nextValue === "function" ? nextValue(value) : nextValue;
    if (Object.is(value, resolvedValue)) return value;
    value = resolvedValue;
    notify(subscribers);
    return value;
  }

  return [read, write];
}

/**
 * Create a reactive computation that re-runs `fn` when a signal it read changes.
 *
 * @param {() => void} fn
 * @param {boolean} computed Computeds run before effects, so effects never read a stale derived value.
 * @returns {object} The computation record, with `run` and `stop`.
 */
function createComputation(fn, computed) {
  const parent = owner;
  const computation = {
    active: true,
    running: false,
    // Set when a dependency changes during this computation's own run, so the write is not lost.
    dirty: false,
    computed,
    dependencies: new Set(),
    runScope: null,
    /**
     * Run `fn` with this computation as the active observer.
     *
     * Dependencies are refreshed on every run. A write made during the run re-runs the computation until it settles.
     *
     * @throws {Error} After 100 re-runs within one update.
     */
    run() {
      if (!this.active) return;
      if (this.running) {
        this.dirty = true;
        return;
      }
      this.running = true;
      try {
        let runs = 0;
        do {
          if (++runs > MAX_RERUNS) throw new Error(cycleMessage);
          this.dirty = false;
          for (const dependency of this.dependencies) dependency.delete(this);
          this.dependencies.clear();
          dispose(this.runScope);
          this.runScope = createScope("effect");

          const previousObserver = observer;
          const previousOwner = owner;
          observer = this;
          owner = this.runScope;
          try {
            fn();
          } finally {
            observer = previousObserver;
            owner = previousOwner;
          }
        } while (this.dirty && this.active);
      } finally {
        this.running = false;
      }
    },
  };

  /**
   * Stop the computation: unsubscribe it from its dependencies and dispose its cleanups.
   */
  const stop = () => {
    if (!computation.active) return;
    computation.active = false;
    for (const dependency of computation.dependencies) dependency.delete(computation);
    computation.dependencies.clear();
    dispose(computation.runScope);
  };

  if (parent) parent.cleanups.push(stop);
  computation.run();
  return stop;
}

/**
 * Run `fn` now, and again whenever a signal it read changes.
 *
 * @param {() => void} fn
 * @returns {() => void} A stop function. An effect created inside an owner also stops with that owner.
 */
export function effect(fn) {
  return createComputation(fn, false);
}

/**
 * Create a read-only value derived from `fn`.
 *
 * It is effect-backed, so create it inside an owner.
 *
 * @template T
 * @param {() => T} fn
 * @returns {() => T} An accessor for the derived value.
 */
export function computed(fn) {
  const [read, write] = signal();
  // Wrap in an updater so a function result is stored as the value, not called.
  createComputation(() => write(() => fn()), true);
  return read;
}
