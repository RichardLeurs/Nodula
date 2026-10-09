# Computed Properties

Use `computed(fn)` to represent a value derived from signals or reactive store reads. It returns a read-only accessor, so consumers always read the current derived result rather than maintaining a duplicate value manually.

## Prerequisites

Import `computed` and the state it derives from `nodula-framework`:

```js
import { computed, signal } from 'nodula-framework';
```

For signal basics and effects, see [Reactivity and DOM](/guide/reactivity).

## Core concept

`computed(fn)` runs `fn`, tracks reactive values read during that run, and returns an accessor. When a dependency changes, Nodula reevaluates `fn` and updates the computed value.

```js
const [count, setCount] = signal(2);
const doubled = computed(() => count() * 2);

console.log(doubled()); // 4
setCount(3);
console.log(doubled()); // 6
```

Call `doubled()` to read it. The computed accessor is read-only; update source signals instead.

## Common patterns

### Derive instead of duplicating state

```js
const [price, setPrice] = signal(12);
const [quantity, setQuantity] = signal(3);
const total = computed(() => price() * quantity());

console.log(total()); // 36
setQuantity(4);
console.log(total()); // 48
```

Because `total` is derived, there is no separate `setTotal()` that could get out of sync with `price` and `quantity`.

### Use computed values in effects and DOM bindings

```js
import { computed, effect, h, mount, signal } from 'nodula-framework';

const [count, setCount] = signal(0);
const doubled = computed(() => count() * 2);

const stopLog = effect(() => console.log(doubled()));

function Counter() {
  return h('button', {
    type: 'button',
    onClick: () => setCount((value) => value + 1),
  }, () => `Count ${count()} · doubled ${doubled()}`);
}

const unmount = mount('#app', Counter);
```

The effect and function child read the computed accessor. When `count` changes, the computed value updates and those consumers rerun.

## How dependencies work

Dependencies come from reads made while the computation runs, so they may change when control flow changes:

```js
const [showLeft, setShowLeft] = signal(true);
const [left, setLeft] = signal('left');
const [right, setRight] = signal('right');
const selected = computed(() => showLeft() ? left() : right());

console.log(selected()); // 'left'
setShowLeft(false);
console.log(selected()); // 'right'
```

After the branch changes, `selected` follows the values read by the new branch. Computed callbacks should derive and return values; put logging, DOM work, and other side effects in `effect()` instead.

## Lifecycle and limitations

- `computed()` is currently effect-backed and returns only an accessor; it does not return a separate disposer.
- The internal effect belongs to the active owner scope when `computed()` is created. Create it inside a `createRoot()` or component scope when it should stop with that owner. Outside an owner, it remains active for the lifetime of its dependencies.
- Computed values update synchronously when dependencies notify; signal updates inside `batch()` flush dependent computations after the batch callback completes.
- `computed()` derives from reactive reads; it does not recursively observe arbitrary object fields. Use the optional [`createStore`](/guide/stores) for nested plain-object or array state.
- This client runtime does not perform server-side rendering or hydration.

## Related guides

- [Reactivity and DOM](/guide/reactivity) — signals, effects, batching, and bindings.
- [Stores](/guide/stores) — reactive nested object and array values.
- [Framework Core](/guide/framework-core) — public core API overview.
- Tests: `framework/vitest/reactivity.test.js`.