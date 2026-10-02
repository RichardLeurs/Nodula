# Watchers

Nodula does not have a separate `watch()` API. Use `effect(fn)` when side effects should rerun for the signals or store properties read during execution:

```
import { effect, signal } from 'nodula-framework';

const [query, setQuery] = signal('nodula');
const stop = effect(() => console.log('search:', query()));
setQuery('signals');
stop();
```

Effects run immediately, refresh their dependencies on each execution, and return a stop function. `createRoot()` scopes effects and cleanup; `onCleanup()` registers teardown work. There is no separate old/new-value watcher or flush-mode API.
