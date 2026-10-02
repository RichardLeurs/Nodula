# Composables

Nodula has no special composable API. A composable can be an ordinary JavaScript function that creates or accepts signals, returns derived getters and actions, and registers cleanup while called inside an owning root/effect:

```
import { onCleanup, signal } from 'nodula-framework';

export function useClock() {
  const [now, setNow] = signal(Date.now());
  const timer = setInterval(() => setNow(Date.now()), 1000);
  onCleanup(() => clearInterval(timer));
  return { now };
}
```

Call cleanup-registering helpers inside a Nodula-owned scope. This is a coding pattern, not a framework-enforced naming convention.
