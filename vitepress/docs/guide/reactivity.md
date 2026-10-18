# Reactivity Fundamentals

Nodula core reactivity connects state reads to the effects that use them. When a tracked value changes, only dependent computations and DOM bindings rerun. The core API uses getter/setter signals; nested object and array proxies are available separately through the optional Store add-on.

## Prerequisites

Import reactive primitives from `nodula-framework`. This guide uses browser examples; the runtime does not provide server-side rendering or hydration. For full public signatures, see [Framework Core](/guide/framework-core).

## Core concepts

- **Signal:** a pair of functions `[read, write]`. Calling `read()` retrieves current value and tracks the read inside an effect or computed callback. `write(value)` replaces the value; `write(current => next)` derives a new one.
- **Computed:** a read-only accessor derived from reactive reads. It updates when its dependencies update.
- **Effect:** a side-effect callback that runs immediately and reruns when values it read change. It returns a stop function.
- **Owner scope:** a root or effect execution that owns cleanup callbacks, nested effects, and DOM listeners.
- **DOM binding:** a function child or function-valued property passed to core DOM helpers. Reads inside it are tracked. A function child that returns text updates only that text when its dependencies change. A function child that returns an element, fragment or array re-runs its whole subtree instead; see [Function children that return nodes](/guide/performance#function-children-that-return-nodes).

## Quick start

```js
import { computed, effect, signal } from 'nodula-framework';

const [count, setCount] = signal(0);
const doubled = computed(() => count() * 2);

const stop = effect(() => {
  console.log(`Count: ${count()}, doubled: ${doubled()}`);
});

setCount((current) => current + 1);
stop();
```

The effect logs once when created, then again after `setCount`. Calling `stop()` removes its subscriptions so later writes do not rerun it.

## How it works

### Dependency tracking

An effect records signal reads made during its current run. Before rerunning, Nodula removes its previous dependencies and tracks the reads made this time. This supports conditional dependencies:

```js
const [showLeft, setShowLeft] = signal(true);
const [left, setLeft] = signal('left');
const [right, setRight] = signal('right');

const stop = effect(() => {
  console.log(showLeft() ? left() : right());
});

setShowLeft(false); // effect switches from left to right dependency
stop();
```

The setter skips notifications when new value is `Object.is`-equal to current value. Because a function argument is always treated as an updater, store a function value by wrapping it: `setHandler(() => handler)`. `computed()` does this for you, so a computed callback may return a function. Signal updates notify dependent computations synchronously; `batch(fn)` groups writes and flushes dependent work when the callback completes.

### Computed values

Use `computed()` for derived values instead of storing duplicates:

```js
const [price, setPrice] = signal(12);
const [quantity, setQuantity] = signal(3);
const total = computed(() => price() * quantity());

console.log(total()); // 36
setQuantity(4);
console.log(total()); // 48
```

`computed()` returns a read-only accessor. Current implementation is effect-backed and does not expose a separate disposer; create it in an owned scope when its lifetime should be bounded.

### DOM updates

Core `h()` accepts function children and function-valued properties. Those functions become reactive bindings:

```js
import { h, mount, signal } from 'nodula-framework';

const [count, setCount] = signal(0);

function Counter() {
  return h('button', {
    type: 'button',
    title: () => `Current value: ${count()}`,
    onClick: () => setCount((value) => value + 1),
  }, () => `Count: ${count()}`);
}

const unmount = mount('#app', Counter);
```

Only the dependent text and `title` bindings update. `mount()` returns a disposer that cleans up its root and removes the mounted node. See [Single-File Components](/guide/templates) for template bindings.

A function child that returns text, as in this example, is a text binding. A function child that returns an element, fragment or array is different: when a value read while building that node changes, the whole function child re-runs and its components and effects are recreated. Keep the reactive reads in leaves such as `() => count()`, and see [Function children that return nodes](/guide/performance#function-children-that-return-nodes) for the rebuild contract.

## Ownership and cleanup

Effects created inside a root are stopped when that root is disposed. `onCleanup()` registers work with the active root or current effect run; effect cleanup runs before the effect reruns and when it stops. Root cleanup runs when the root is disposed.

```js
import { createRoot, effect, onCleanup, signal } from 'nodula-framework';

const [active, setActive] = signal(true);
const [, dispose] = createRoot(() => {
  effect(() => {
    if (!active()) return;
    const timer = setInterval(() => console.log('active'), 1000);
    onCleanup(() => clearInterval(timer));
  });
});

setActive(false); // clears timer for the previous effect run
dispose();        // stops owned effect and root work
```

Use `onMount()` for work after synchronous root setup; it runs in a microtask and is skipped if the root was disposed first. Use `onUnmount()` for root disposal work. Both require a root scope, not an effect callback.

## Common patterns

### Group related updates with `batch()`

```js
import { batch, effect, signal } from 'nodula-framework';

const [first, setFirst] = signal('Ada');
const [last, setLast] = signal('Lovelace');
effect(() => console.log(`${first()} ${last()}`));

batch(() => {
  setFirst('Grace');
  setLast('Hopper');
});
```

The dependent effect flushes after the batch rather than between the two writes.

### Choose signals or a store

Signals suit individual values and derived state. For deeply reactive plain objects and arrays, import `createStore` from `nodula-framework/store`; see [Stores](/guide/stores). The store add-on tracks property reads, key enumeration, presence checks, writes, and deletes. It is not included in the core package entry.

## Limitations and troubleshooting

- Read signals by calling their accessor: `count()`. Passing the accessor itself does not read or track its value.
- Effects track only reads made during their synchronous execution. Reads deferred to a later timer or promise callback are not automatically tracked by the original effect run.
- An effect that writes a signal it reads re-runs until the value settles. Give the write a clear stopping condition: a computation that re-runs 100 times in one update throws a cycle error instead of hanging.
- If an effect throws during an update, the remaining queued effects still run and the first error is rethrown from the write that triggered them. Likewise, every cleanup runs on disposal even if one throws; the first error is rethrown afterwards.
- Computed values settle before effects run, so an effect that reads both a signal and a computed derived from it sees consistent values.
- `computed()` has no independent disposal method. Its internal effect is owned by the scope active when it is created.
- Core `signal()` does not recursively proxy object properties. Use `createStore()` when nested object/array property changes need reactive tracking.
- `onCleanup()` outside an active root/effect throws. Put resource setup and cleanup inside an owned scope.
- This client runtime does not perform server rendering or hydration. Initial HTML is not produced by these reactive APIs.

## Related guides

- [Framework Core](/guide/framework-core) — core API reference.
- [State Management](/guide/state-management) — choosing and scoping application state.
- [Stores](/guide/stores) — nested object and array reactivity.
- [Single-File Components](/guide/templates) — reactive templates and DOM bindings.