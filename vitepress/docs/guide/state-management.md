# State Management

Nodula provides reactive primitives rather than one built-in global state manager. Keep state close to the component or feature that owns it, pass values and callbacks through component boundaries, and share a module-level signal or store only when shared lifetime is intentional.

## Prerequisites

Core signals are imported from `nodula-framework`. Nested reactive object/array state and browser persistence are optional add-ons with separate package entries.

## Choose a state shape

| Need | Suggested primitive |
|---|---|
| One value such as `count`, `open`, or `query` | Core `signal(value)` |
| A value derived from other reactive state | Core `computed(fn)` |
| Imperative synchronization or side effects | Core `effect(fn)` with cleanup when needed |
| Nested plain-object or array state | Optional `createStore(initialObject)` from `nodula-framework/store` |
| State that survives page reloads | Optional `createLocalStorage()` or `createIndexedDB()` from `nodula-framework/localstorage` |
| Form values, validation, touched/submitting state | Optional `createForm()` from `nodula-framework/form` |

Do not duplicate derived values in writable state unless an independent editable value is actually needed. Use computed values to avoid synchronization bugs.

## Quick start: local state

Create state inside the component that owns it:

```js
import { computed, h, signal } from 'nodula-framework';

function Counter() {
  const [count, setCount] = signal(0);
  const doubled = computed(() => count() * 2);

  return h('button', {
    type: 'button',
    onClick: () => setCount((value) => value + 1),
  }, () => `Count ${count()} · doubled ${doubled()}`);
}
```

The signal is instance-local because it is created when the component runs. A second Counter gets its own `count`.

## Share state between components

For components with a common parent, pass state accessors and update callbacks as props. For a deliberately shared feature state, create a module-level signal and export its accessors:

```js
// search-state.js
import { computed, signal } from 'nodula-framework';

const [query, setQuery] = signal('');
const hasQuery = computed(() => query().trim().length > 0);

export const searchState = { query, setQuery, hasQuery };
```

```js
// Any app module importing this module shares its singleton state.
import { searchState } from './search-state.js';

searchState.setQuery('reactivity');
console.log(searchState.hasQuery());
```

Module-level state lives as long as that JavaScript module instance. This is useful for intentionally app-wide client state, but can cause accidental sharing between independent app instances or requests in environments that reuse modules. Create state in the appropriate application/root scope when isolation matters.

## Signals versus stores

Signals hold one value and make reads explicit:

```js
const [selectedId, setSelectedId] = signal(null);
```

For nested plain objects and arrays whose individual properties should be tracked, use the optional Store add-on:

```js
import { createStore } from 'nodula-framework/store';

const state = createStore({ user: { name: 'Ada' }, items: [] });
state.user.name = 'Grace';
state.items.push({ id: 1, label: 'First' });
```

`createStore()` recursively proxies plain objects and arrays. Class instances, `Map`, and `Set` are not recursively reactive. See [Stores](/guide/stores) for detailed behavior and limitations.

## Persist state only when needed

Browser persistence is opt-in and should be reserved for values that should survive reloads, such as a display preference:

```js
import { createLocalStorage } from 'nodula-framework/localstorage';

const [theme, setTheme] = createLocalStorage('app-theme', 'light');
setTheme('dark');
```

Use IndexedDB for asynchronous structured persistence. Browser storage is readable and mutable by client-side code; do not store secrets or treat it as authorization. See [Local Storage](/guide/local-storage) for storage availability, hydration, cleanup, and cookie boundaries.

## Ownership and cleanup

Effects created within a component or `createRoot()` are stopped when that owner is disposed. An effect created outside an owner returns a stop function that the caller should keep and invoke. Use `onCleanup()` to pair timers, subscriptions, observers, or requests with the effect run that created them; cleanup runs before rerun and when the effect stops.

For derived data, use `computed()`. For side effects, use `effect()`. Effects run immediately and track synchronous reads; there is no separate global store subscription API in core.

## Common patterns

- Keep ephemeral UI state (open menus, input drafts, local counters) inside the owning component.
- Lift state to the nearest shared parent when sibling components need coordinated updates.
- Export a module-level signal/store only when consumers should share one client-side instance intentionally.
- Use explicit callbacks with props to make child-to-parent updates visible.
- Use the Store add-on for nested structures rather than mutating fields inside an ordinary object held by a signal; those nested mutations are not tracked automatically.
- Use the Form add-on for validation and submission state rather than recreating a separate form manager around raw signals.

## Limitations and security

- Nodula does not provide a built-in global store, dependency-injection container, persistence by default, or automatic state serialization.
- Module-level state is shared by importers and should not hold per-user or per-request data in a module-reuse server environment.
- Local storage, IndexedDB, and client state are not trusted security boundaries. Enforce authentication and authorization on the server; do not store credentials or secrets in script-readable state.
- The runtime is browser-oriented and does not provide server-side rendering or hydration.

## Related guides

- [Reactivity and DOM](/guide/reactivity) — signals, effects, computed values, and ownership.
- [Stores](/guide/stores) — nested reactive objects and arrays.
- [Forms](/guide/forms) — form-specific values and validation state.
- [Local Storage](/guide/local-storage) — localStorage, IndexedDB, and cookies.