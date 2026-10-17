# Store Add-on

The optional Store add-on provides deeply reactive proxies for plain objects and arrays, letting effects, computed values, and DOM bindings observe nested state without adding proxy code to the core entry. Import it from `nodula-framework/store`; it uses Nodula's core reactivity and needs no plugin or extra dependency.

## Install and import

```js
import { createStore } from 'nodula-framework/store';
import { computed, effect } from 'nodula-framework';
```

The store package entry is separate from `nodula-framework`, so import it only where nested object or array state is needed.

## Quick start

```js
import { effect } from 'nodula-framework';
import { createStore } from 'nodula-framework/store';

const state = createStore({
  user: { name: 'Nodula' },
  items: ['first'],
});

const stop = effect(() => {
  console.log(state.user.name, state.items.length);
});

state.user.name = 'World';
state.items.push('second');
stop();
```

## API reference

### `createStore<T extends object>(initialValue: T): T`

Creates and returns a mutable reactive proxy around the supplied root value.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `initialValue` | Plain object or array | Yes | Initial state. Nested plain objects and arrays are wrapped as they are read. |

The returned proxy has the same TypeScript shape as `T`. `createStore` throws a `TypeError` with message `createStore expects a plain object or array.` if the root value is not a plain object or array.

## Behavior and lifecycle

- Reads of properties, the `in` operator, and own-key enumeration (for example, `Object.keys(state)`) are tracked by active `effect()` and `computed()` computations.
- Assignments and `Object.defineProperty()` notify dependents when a property's value changes. Adding or deleting a property also updates effects tracking key enumeration or property presence.
- Every store shares one proxy per object. Assigning one store (or a nested store value) into another stores the underlying object, so `parent.child = child` keeps `parent.child === child`, and writes through either path notify readers of both. Calling `createStore()` with a store, or twice with the same object, returns the same proxy.
- Nested plain objects and arrays are recursively proxied. Repeated reads of the same nested object return the same proxy.
- Array mutators (`push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`, and `copyWithin`) batch notifications until the mutation completes.
- Effects created inside `createRoot()` are disposed with that root. An `effect()` created outside a root returns its own stop function. The store itself has no subscription or disposal handle.
- The original object passed to `createStore` is not the proxy. Mutate state through the returned proxy so writes can notify reactive consumers.

### Component integration

Use the store in a component's reactive bindings; mounting returns a disposer that tears down its owned effects and DOM work.

```js
import { h, mount } from 'nodula-framework';
import { createStore } from 'nodula-framework/store';

const state = createStore({ user: { name: 'Nodula' }, visits: 0 });

function Profile() {
  return h('button', {
    onClick: () => { state.visits += 1; },
  }, () => `${state.user.name} · visits ${state.visits}`);
}

const unmount = mount('#app', Profile);
// Call unmount() when this UI is no longer needed.
```

## Errors and limitations

- The root must be a plain object or array. `null`, primitives, and class instances such as `Date` throw `TypeError`.
- Nested class instances, `Map`, and `Set` are ordinary values, not recursively reactive store data. Mutating their internal contents does not notify effects.
- Only mutations performed through the returned proxy participate in store notifications. Direct mutations through the original input object bypass the proxy.
- The add-on does not provide persistence, subscriptions independent of `effect()`/`computed()`, or global-state scoping. Exporting one store from a shared module intentionally shares that instance among importers; create stores at the appropriate app/request boundary when isolation is required.

## Related resources

- [State Management](/guide/state-management) compares stores with signals and explains shared state.
- [Reactivity and DOM](/guide/reactivity) covers effects, computed values, and DOM bindings.
- Store behavior tests: `framework/vitest/reactivity.test.js`; DOM integration test: `framework/vitest/dom.test.js`.
