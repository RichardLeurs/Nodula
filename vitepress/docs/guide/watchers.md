# Watchers and Effects

Nodula does not expose a separate `watch()` or `watchEffect()` API. Use `effect(fn)` for reactive side effects: it tracks signals and store properties read while it runs, then reruns when those dependencies change. Use `computed(fn)` for derived values that should be read elsewhere rather than for side effects.

## Prerequisites

Import `effect`, `signal`, and cleanup helpers from the core `nodula-framework` entry. Effects are synchronous and run in the browser/runtime context where they are created.

## Core concepts

- An effect runs immediately once when created.
- Reads during the synchronous effect callback become its dependencies.
- Before rerunning, Nodula removes the old dependencies and tracks the reads from the new run. Conditional reads can therefore change which values trigger the effect.
- `effect(fn)` returns a stop function. Effects created inside an owner are also stopped when that owner is disposed.
- `onCleanup(fn)` registers cleanup for the current effect run. Cleanup runs before that effect reruns and when it stops.

## Quick start

```js
import { effect, signal } from 'nodula-framework';

const [query, setQuery] = signal('nodula');
const stop = effect(() => {
  console.log('search:', query());
});

setQuery('signals');
stop();
```

The effect logs once at creation and again when `query` changes. After `stop()`, future writes do not rerun it.

## How it works

An effect tracks dependencies by reading them; no source argument list or callback options are needed. It can track signals and properties of the optional reactive Store add-on:

```js
import { effect, signal } from 'nodula-framework';
import { createStore } from 'nodula-framework/store';

const [enabled, setEnabled] = signal(true);
const [left, setLeft] = signal('left');
const [right, setRight] = signal('right');
const profile = createStore({ name: 'Ada' });

const stop = effect(() => {
  const selected = enabled() ? left() : right();
  console.log(selected, profile.name);
});

setEnabled(false); // effect now tracks right rather than left
profile.name = 'Grace';
stop();
```

Signal and store notifications run synchronously. `batch(fn)` can group writes and flush dependent effects after the callback completes.

## Common patterns

### Clean up work between runs

Register teardown inside the effect run that creates a timer, subscription, or similar resource:

```js
import { effect, onCleanup, signal } from 'nodula-framework';

const [active, setActive] = signal(true);

const stop = effect(() => {
  if (!active()) return;

  const timer = setInterval(() => console.log('polling'), 1000);
  onCleanup(() => clearInterval(timer));
});

setActive(false); // clears timer from the previous run
stop();
```

If an effect needs longer-lived ownership, create it inside `createRoot()` or a mounted component; disposing that owner stops the effect and runs cleanup.

### Use computed for derived data

```js
import { computed, effect, signal } from 'nodula-framework';

const [price, setPrice] = signal(5);
const [quantity, setQuantity] = signal(2);
const total = computed(() => price() * quantity());

const stop = effect(() => console.log('total:', total()));
setQuantity(3);
stop();
```

Keep derivation in `computed()` and reserve effects for work such as logging, storage synchronization, timers, or imperative integrations. `computed()` is currently effect-backed and has no separate disposer; create it in an appropriate owner scope when its lifetime should be bounded.

## Limitations and troubleshooting

- Nodula has no separate `watch(source, callback, options)` API, old/new value arguments, immediate option, deep option, or configurable flush modes. Read the values you want to track inside `effect()`.
- Only reads made during the synchronous effect callback are tracked. Reads first made later in a timer, promise, or event callback do not become dependencies of the original run.
- Effects run immediately. Guard initial work explicitly if it should only happen after a later change.
- Writing a dependency on every run can create repeated work. Ensure updates have a clear stopping condition or use a derived `computed()` value instead.
- `onCleanup()` outside an active effect or root throws. Register cleanup during the effect run that creates the resource.
- A stopped effect cannot be restarted; create a new effect if needed.

## Related guides

- [Reactivity and DOM](/guide/reactivity) — signals, computed values, batching, and bindings.
- [Computed Properties](/guide/computed-properties) — derived values.
- [Stores](/guide/stores) — effects that track nested object and array properties.
- Tests: `framework/vitest/reactivity.test.js` and `framework/vitest/dom.test.js`.