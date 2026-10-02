# Computed Properties

Nodula's `computed(fn)` returns a read-only getter derived from the signals read by `fn`:

```
import { computed, signal } from 'nodula-framework';

const [count, setCount] = signal(2);
const doubled = computed(() => count() * 2);

setCount(3);
console.log(doubled()); // 6
```

Read the computed getter inside an effect, a function-valued DOM property, or a template expression to subscribe to its value. A computed value is currently effect-backed and has no separate public disposal handle; see [Reactivity Fundamentals](/guide/reactivity).
