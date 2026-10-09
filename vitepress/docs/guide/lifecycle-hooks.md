# Lifecycle Hooks

Nodula manages lifecycle through owner scopes and cleanup callbacks rather than a component instance API. Roots own effects and resources; `onMount`, `onUnmount`, and `onCleanup` let code connect browser work to those scopes.

## Prerequisites

Import lifecycle APIs from the core `nodula-framework` package:

```js
import { createRoot, onCleanup, onMount, onUnmount } from 'nodula-framework';
```

Hooks must be called synchronously while a Nodula root or effect is the active owner. See [Reactivity and DOM](/guide/reactivity) for signals and effects.

## Core concepts

- **Root:** an ownership scope created by `mount()` or `createRoot()`. It owns nested effects, DOM listeners, refs, and registered cleanup.
- **`onMount(fn)`:** root-only callback queued as a microtask after synchronous setup. If the root is disposed before that microtask runs, callback is skipped.
- **`onUnmount(fn)`:** root-only callback run when its root is disposed.
- **`onCleanup(fn)`:** callback owned by the active root or current effect execution. In an effect it runs before that effect reruns and when it stops; in a root it runs when the root is disposed.
- **Disposer:** function returned by `mount()`, `createRoot()`, or `effect()` to end the corresponding owned work.

Nodula does not expose Vue-style `onMounted`, `onBeforeUnmount`, or a component instance. Components use the owner scope created during rendering.

## Quick start

```js
import { mount, onMount, onUnmount } from 'nodula-framework';

function App() {
  onMount(() => {
    console.log('App DOM is mounted:', document.querySelector('#app') !== null);
  });

  onUnmount(() => {
    console.log('App root is being disposed');
  });

  return document.createElement('main');
}

const unmount = mount('#app', App);
// Later, when this application root is removed:
unmount();
```

`onMount` runs after the current synchronous mount completes. `onUnmount` runs during root disposal; cleanup order is last registered, first run.

## How it works

### Root lifecycle

```js
import { createRoot, onCleanup, onMount, onUnmount } from 'nodula-framework';

const [resource, dispose] = createRoot(() => {
  const resource = openResource();
  onMount(() => resource.start());
  onUnmount(() => console.log('root disposed'));
  onCleanup(() => resource.close());
  return resource;
});

dispose();
```

`createRoot(fn)` returns `[value, dispose]`. Roots created inside another active owner attach to that owner by default; `{ detached: true }` prevents that parent ownership. Disposal is idempotent. If root setup throws, Nodula disposes its registered cleanup and rethrows the error.

### Effect-run cleanup

Use `onCleanup()` inside an effect to tear down work from the previous run before new work starts:

```js
import { effect, onCleanup, signal } from 'nodula-framework';

const [active, setActive] = signal(true);
const stop = effect(() => {
  if (!active()) return;

  const timer = setInterval(() => console.log('refresh'), 1000);
  onCleanup(() => clearInterval(timer));
});

setActive(false); // clears this run's timer before the effect reruns
stop();
```

The effect itself returns a stop function. If created inside a root, it also stops when that root is disposed.

## Common patterns

### Start browser-only work after mount

Use `onMount()` for DOM-dependent setup after synchronous rendering. It runs in a microtask, so it is not an awaitable paint/layout guarantee; use browser measurement APIs appropriate to the task.

### Abort async work on teardown

```js
import { onCleanup, signal } from 'nodula-framework';

const [result, setResult] = signal(null);
const controller = new AbortController();
onCleanup(() => controller.abort());

fetch('/api/data', { signal: controller.signal })
  .then((response) => response.json())
  .then(setResult)
  .catch((error) => {
    if (error.name !== 'AbortError') throw error;
  });
```

Place this setup inside a component/root scope so unmounting aborts its request. Adapt error reporting to the application rather than throwing from an asynchronous callback if that is not the desired policy.

### Keep setup and teardown paired

Register cleanup immediately after creating a timer, observer, event listener, subscription, or request controller. This keeps teardown associated with the owner that created the resource.

## Limitations and troubleshooting

- `onMount()` and `onUnmount()` require a root scope and throw if called inside an effect. `onCleanup()` is allowed inside either a root or an effect run.
- Calling a hook after an `await` usually loses the active owner context. Register cleanup synchronously, then start asynchronous work.
- `onMount()` does not run if the root is disposed before its queued microtask executes.
- Effects rerun cleanup before the next run. Root cleanup callbacks run in reverse registration order.
- `createRoot()` is a scope primitive, not a `createApp()` factory. `mount()` renders a component and returns the application-root disposer.
- Do not rely on lifecycle hooks for server rendering or hydration; Nodula's runtime is browser-oriented.

## Related guides

- [Reactivity and DOM](/guide/reactivity) — effects and cleanup ownership.
- [Framework Core](/guide/framework-core) — `createRoot`, mount, and lifecycle API overview.
- [Single-File Components](/guide/templates) — component setup and template refs.
- [Template Refs](/guide/template-refs) — DOM element references and disposal.
- Tests: `framework/vitest/reactivity.test.js` and `framework/vitest/dom.test.js`.