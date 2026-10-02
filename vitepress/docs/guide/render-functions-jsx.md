# Render Functions and JSX

Nodula's render-function style is the native `h(tag, props, ...children)` helper:

```
import { h, mount, signal } from 'nodula-framework';

const [count, setCount] = signal(0);
mount('#app', () => h('button', {
  onClick: () => setCount((value) => value + 1),
}, () => `Count: ${count()}`));
```

JSX is not implemented or configured in this project. Use `h()`, `.page` route templates, or `.comp` component templates; do not assume React/Vue JSX transforms apply.
