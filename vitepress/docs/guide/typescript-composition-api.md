# TypeScript with Nodula's Function-Based API

Nodula does not implement Vue's Composition API, but its function-based signal API is typed. For example, `signal(0)` infers a numeric getter/setter pair, and `computed(() => count() * 2)` infers a numeric getter. The exported `Accessor`, `Setter`, and component types are declared in the core entry.

```
import { computed, signal } from 'nodula-framework';

const [count, setCount] = signal(0);
const doubled = computed(() => count() * 2);
setCount((current) => current + 1);
```

This is Nodula's API, not a Vue Composition API compatibility layer. `.page` and `.comp` scripts remain JavaScript-only.
