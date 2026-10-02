# Reactivity and DOM

Nodula's core is a small set of runtime primitives. Import them from `nodula-framework`; optional add-ons such as reactive stores use their own package entries.

## Signals, computed values, and effects

```
import { computed, effect, signal } from 'nodula-framework';

const [count, setCount] = signal(0);
const doubled = computed(() => count() * 2);

const stop = effect(() => {
  console.log(`count=${count()}, doubled=${doubled()}`);
});

setCount((value) => value + 1);
stop();
```

- `signal(value)`returns a getter and setter. The setter accepts either a replacement value or an updater function.
- `computed(fn)`returns a read-only getter that follows the signals read by`fn`.
- `effect(fn)`runs immediately and reruns when a signal it read changes. It returns a function that stops it.
- `createRoot(fn)`scopes effects and cleanup callbacks;`onCleanup(fn)`registers cleanup with the active root or effect run.

Effects track dependencies as they execute, including conditional reads. Notifications are batched for a signal update. `computed` is effect-backed and does not currently expose a separate disposal handle.

## Reactive stores

The optional `nodula-framework/store` add-on exports `createStore`, which creates a reactive proxy for plain objects and arrays, including nested plain objects and arrays:

```
import { effect } from 'nodula-framework';
import { createStore } from 'nodula-framework/store';

const state = createStore({ user: { name: 'Nodula' }, items: [] });
const stop = effect(() => {
  console.log(state.user.name, state.items.length);
});

state.user.name = 'World';
state.items.push('Idea');
stop();
```

Property reads, key enumeration, and presence checks are tracked. Writes, deletes, and array mutations notify subscribers. Class instances, `Map`, and `Set` are ordinary values rather than recursively reactive store data. Import it only in modules that need nested object or array state; the core package no longer includes the store implementation.

## DOM helpers

The lower-level API can create and mount a component without a `.page` file:

```
import { computed, h, mount, signal } from 'nodula-framework';

const [count, setCount] = signal(0);
const doubled = computed(() => count() * 2);

function Counter() {
  return h('button', {
    onClick: () => setCount((value) => value + 1),
  }, () => `Count ${count()} · doubled ${doubled()}`);
}

const unmount = mount('#app', Counter);
// Call unmount() when the app should be disposed.
```

`mount(target, component)` replaces the target's children and returns a disposer. Function-valued children and properties are reactive. Native event listeners are cleaned up with their owning component. Other core helpers include keyed `list`, conditional `when`, `slot`, and `component`.

For authoring HTML-like components, see [single-file components](/guide/templates). For manual or file-based navigation, see [routing](/guide/routing).
