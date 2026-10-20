# Watchers and Effects

Use `watch(source, callback)` to react when one value changes and you need its previous value. Use `effect(fn)` for side effects that read several values and should rerun when any of them change. Use `computed(fn)` when you need a derived value that other code reads.

## Prerequisites

Import the helpers from the core `nodula-framework` entry:

```js
import { computed, effect, onCleanup, signal, watch } from 'nodula-framework';
```

Watchers and effects run synchronously. Create them inside a root or a component's render so they stop automatically with that owner. See [Reactivity Fundamentals](/guide/reactivity) for signals and ownership.

## Core concepts

- **`watch(source, callback)`:** `source` is a function. Its return value is tracked, and `callback(value, oldValue)` runs when that value changes.
- **Lazy:** `watch` does not call `callback` when it is created. The value read at creation becomes `oldValue` for the first change.
- **Only `source` is tracked:** reads inside `callback` do not subscribe the watcher to anything.
- **Change check:** `callback` is skipped when the new value is `Object.is`-equal to the previous one.
- **`effect(fn)`:** runs immediately and tracks every signal or store property it reads during the run.
- **Stop function:** `watch` and `effect` both return one. A watcher or effect created inside an owner also stops when that owner is disposed.
- **`onCleanup(fn)`:** inside a watch callback, cleanup runs before the next callback call and when the watcher stops.

## Quick start

```js
import { signal, watch } from 'nodula-framework';

const [query, setQuery] = signal('');

const stop = watch(query, (value, oldValue) => {
  console.log(`search changed from "${oldValue}" to "${value}"`);
});

setQuery('nodula'); // logs: search changed from "" to "nodula"
stop();
```

The callback does not run when `watch` is created. After `stop()`, later writes do not call it.

## How it works

### Watching a derived value

`source` can be any function that reads reactive values. The watcher compares its return value, not the signals it read:

```js
import { signal, watch } from 'nodula-framework';

const [count, setCount] = signal(1);

const stop = watch(() => count() * 10, (value, oldValue) => {
  console.log(value, oldValue);
});

setCount(2); // logs 20 10
setCount(3); // logs 30 20
stop();
```

Return primitives or stable references from `source`. A source that builds a new object or array on every read counts as changed on every run.

### Running the handler for the current value

`watch` has no `immediate` option. If you want the current value handled at setup, call the handler yourself:

```js
import { signal, watch } from 'nodula-framework';

const [query, setQuery] = signal('nodula');

const load = (value) => console.log('load', value);

load(query());                     // handles the current value once
const stop = watch(query, (value) => load(value));
```

### Cleaning up between changes

Register cleanup inside the callback for resources that belong to one value:

```js
import { signal, watch, onCleanup } from 'nodula-framework';

const [query, setQuery] = signal('');

const stop = watch(query, (value) => {
  const timer = setTimeout(() => console.log('search for', value), 300);
  onCleanup(() => clearTimeout(timer));
});

setQuery('a');
setQuery('ab'); // clears the timer for "a" before starting a new one
stop();         // clears the timer for "ab"
```

### Choosing between `watch`, `effect`, and `computed`

| Need | Use |
|---|---|
| React to a change in one value and know what it was before | `watch(source, callback)` |
| Run side-effect code that reads several values, or runs once immediately | `effect(fn)` |
| Read a value derived from other reactive values in many places | `computed(fn)` |

`computed()` returns an accessor and is effect-backed, so it has no separate disposer. `effect()` and `watch()` both return stop functions.

## Common patterns

### Watchers in a component

Create a watcher in a `.comp` file's `<script>` block. Component setup runs inside the component's root, so the watcher stops when the component unmounts:

```html
<script>
import { onCleanup, signal, watch } from 'nodula-framework';

const [query, setQuery] = signal('');
const [status, setStatus] = signal('Idle');

watch(query, (value) => {
  setStatus(`Searching for "${value}"`);
  const timer = setTimeout(() => setStatus(`Done: "${value}"`), 300);
  onCleanup(() => clearTimeout(timer));
});
</script>

<template>
  <section class="search">
    <button type="button" @click="setQuery('nodula')">Search nodula</button>
    <p>{{ status() }}</p>
  </section>
</template>
```

## Limitations and troubleshooting

- `watch` takes exactly two arguments. It has no `immediate`, `deep`, or flush options, and no array of sources.
- `callback` runs synchronously when the source changes. Inside `batch()`, it runs when the batch flushes.
- Cleanup runs on every re-run of the source, including a re-run where the value did not change and `callback` is skipped. The previous cleanup has already run by then, so nothing is pending until the next callback call. If a resource must stay alive while the value is unchanged, do not register it in the callback.
- Unlike `effect`, which runs immediately, `watch` does nothing until its source changes. Call the handler yourself for the initial value.
- Passing a non-function throws a `TypeError`: `watch source must be a function.` or `watch callback must be a function.`
- A stopped watcher cannot be restarted. Create a new one if needed.

## Related guides

- [Reactivity Fundamentals](/guide/reactivity) — signals, effects, and ownership.
- [Computed Properties](/guide/computed-properties) — derived values.
- [Stores](/guide/stores) — store properties can be read inside `source` and `effect`.
- [Framework Core](/guide/framework-core) — `watch` signature in the API table.
- Tests: `framework/vitest/reactivity.test.js` (`describe('watch')`).
