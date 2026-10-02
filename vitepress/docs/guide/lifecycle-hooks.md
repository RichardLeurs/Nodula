# Lifecycle Hooks

Nodula uses ownership and cleanup rather than named component lifecycle hooks. `createRoot(fn)` creates a scope and returns its result plus a disposer. `onCleanup(fn)` registers cleanup in the current root or effect run; effects also return a stop function.

```
import { createRoot, onCleanup } from 'nodula-framework';

const [resource, dispose] = createRoot(() => {
  const timer = setInterval(refresh, 1000);
  onCleanup(() => clearInterval(timer));
  return openResource();
});

dispose();
```

Cleanup callbacks run in reverse registration order. Nodula does not expose Vue hooks such as `onMounted` or `onUnmounted`; create resources in the owning function and register their teardown with `onCleanup`.
