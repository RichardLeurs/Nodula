let observer = null;
let owner = null;
const pendingComputations = new Set();
let flushing = false;
let batchDepth = 0;

function flush() {
  if (flushing || batchDepth) return;

  flushing = true;
  try {
    while (pendingComputations.size) {
      const next = pendingComputations.values().next().value;
      pendingComputations.delete(next);
      next.run();
    }
  } finally {
    flushing = false;
  }
}

function track(subscribers) {
  if (observer?.active) {
    subscribers.add(observer);
    observer.dependencies.add(subscribers);
  }
}

function notify(subscribers) {
  for (const subscriber of subscribers) pendingComputations.add(subscriber);
  flush();
}

export function batch(fn) {
  batchDepth += 1;
  try { return fn(); }
  finally {
    batchDepth -= 1;
    flush();
  }
}

function createScope(type = 'root') {
  return { cleanups: [], disposed: false, type };
}

function dispose(scope) {
  if (!scope || scope.disposed) return;
  scope.disposed = true;
  for (const cleanup of scope.cleanups.splice(0).reverse()) cleanup();
}

export function createRoot(fn, { detached = false } = {}) {
  const parent = owner;
  const root = createScope('root');
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

export function onCleanup(fn) {
  if (!owner) throw new Error('onCleanup must be called inside a root or effect.');
  owner.cleanups.push(fn);
}

/** Run once after the current reactive scope has completed its synchronous mount. */
export function onMount(fn) {
  if (!owner) throw new Error('onMount must be called inside a root or effect.');
  const scope = owner;
  if (scope.type !== 'root') throw new Error('onMount must be called inside a root scope, not an effect.');
  queueMicrotask(() => {
    if (!scope.disposed) fn();
  });
}

/** Run when the current reactive scope is disposed. */
export function onUnmount(fn) {
  if (!owner) throw new Error('onUnmount must be called inside a root or effect.');
  if (owner.type !== 'root') throw new Error('onUnmount must be called inside a root scope, not an effect.');
  owner.cleanups.push(fn);
}

// Rendering a conditional branch should not add its own reads to the condition effect.
export function untrack(fn) {
  const previousObserver = observer;
  observer = null;
  try { return fn(); }
  finally { observer = previousObserver; }
}

export function signal(initialValue) {
  let value = initialValue;
  const subscribers = new Set();

  function read() {
    track(subscribers);
    return value;
  }

  function write(nextValue) {
    const resolvedValue = typeof nextValue === 'function' ? nextValue(value) : nextValue;
    if (Object.is(value, resolvedValue)) return value;
    value = resolvedValue;
    notify(subscribers);
    return value;
  }

  return [read, write];
}

export function effect(fn) {
  const parent = owner;
  const computation = {
    active: true,
    running: false,
    dependencies: new Set(),
    runScope: null,
    run() {
      if (!this.active || this.running) return;
      this.running = true;
      for (const dependency of this.dependencies) dependency.delete(this);
      this.dependencies.clear();
      dispose(this.runScope);
      this.runScope = createScope('effect');

      const previousObserver = observer;
      const previousOwner = owner;
      observer = this;
      owner = this.runScope;
      try {
        fn();
      } finally {
        observer = previousObserver;
        owner = previousOwner;
        this.running = false;
      }
    },
  };

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

export function computed(fn) {
  const [read, write] = signal();
  effect(() => write(fn()));
  return read;
}