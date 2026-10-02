# Animation Techniques

CSS transitions and animations work as native browser CSS. Framework-level Web Animations API helpers are available through the optional `nodula-framework/animation` add-on:

```
import { animate, enableLifecycleTransitions } from 'nodula-framework/animation';

animate(element, [{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
enableLifecycleTransitions();
```

The opt-in lifecycle hook supports page outlets, conditional branches, and keyed list rows. It respects `prefers-reduced-motion` by default. See [Animations](/guide/animations) for detailed API and lifecycle behavior.
