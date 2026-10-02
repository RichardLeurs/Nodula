# Animations

Animation support is an optional add-on, imported separately from the core runtime:

```
import { animate, createTransition } from 'nodula-framework/animation';
```

It uses the browser's Web Animations API and does not add animation code to the core bundle.

## Animate an element

`animate(element, keyframes, options)` starts a Web Animation and returns its `Animation` object. A new Nodula animation on the same element cancels the previous one:

```
import { animate } from 'nodula-framework/animation';

const animation = animate(
  cardElement,
  [
    { opacity: 0, transform: 'translateY(8px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ],
  { duration: 180, easing: 'ease-out', fill: 'both' },
);
```

By default, animations are skipped when `prefers-reduced-motion: reduce` is active or when the element does not support `animate()`. In either case, `animate()` returns `null`. Set `respectReducedMotion: false` only when there is a specific reason to override the user's preference.

When called inside a Nodula root or effect, the active animation is canceled when that owner is disposed. Outside an owner, retain the returned `Animation` if you need to cancel it manually.

## Enter and leave transitions

`createTransition(element, options)` provides explicit `enter()`, `leave()`, and `cancel()` methods:

```
import { createTransition } from 'nodula-framework/animation';

const transition = createTransition(panel, {
  enter: [
    { opacity: 0, transform: 'translateY(6px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ],
  leave: {
    keyframes: [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-4px)' },
    ],
    options: { duration: 120 },
  },
  options: { duration: 180, easing: 'ease-out', fill: 'both' },
  removeOnLeave: true,
});

transition.enter();
// Later, when application state decides the panel should close:
await transition.leave();
```

The `leave()` promise resolves to `true` when the animation completes and `false` when it is skipped or canceled. With `removeOnLeave: true`, the element is removed after a completed leave animation, or immediately when motion is skipped. For application-managed lifecycle integration, register the add-on's default page, conditional, and keyed-list transitions:

```
import { enableLifecycleTransitions } from 'nodula-framework/animation';

// Call inside the Nodula app root. Disposal unregisters the hook.
enableLifecycleTransitions({ options: { duration: 180, easing: 'ease-out' } });
```

The hook animates `<outlet :view="…" />` page replacements, `@if` / `@else` branches, and keyed `@for`/`each` row insertions and removals. Leave nodes stay in the DOM until their animation completes; removed rows are no longer reactive while their leave animation runs. Reduced-motion preference or unavailable Web Animations support skips motion and removes leaving nodes immediately. The integration is opt-in: without importing and enabling this add-on, core lifecycle behavior stays synchronous and no animation effects run.
