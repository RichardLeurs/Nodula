# Reactive Stores

Reactive stores are an optional add-on. Import `createStore` from `nodula-framework/store`; the core `nodula-framework` entry does not include the store proxy implementation.

```
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

`createStore` accepts a plain object or array and recursively proxies nested plain objects and arrays. Property reads, the `in` operator, and key enumeration are tracked. Assignments, deletions, and array mutators notify affected effects; array mutations are batched. Class instances, `Map`, and `Set` are not recursively proxied.

Effects created inside a `createRoot` continue to be disposed with that root. Stores themselves do not need a disposer.
