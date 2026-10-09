# Animations

Animation support is an optional add-on, imported separately from the core runtime:

```js
import { animate, createTransition } from 'nodula-framework/animation';
```

It uses the browser's Web Animations API and does not add animation code to the core bundle.

## Animate an element

`animate(element, keyframes, options)` starts a Web Animation and returns its `Animation` object. A new Nodula animation on the same element cancels the previous one:

```js
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

```js
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

```js
import { enableLifecycleTransitions } from 'nodula-framework/animation';

// Call inside the Nodula app root. Disposal unregisters the hook.
enableLifecycleTransitions({ options: { duration: 180, easing: 'ease-out' } });
```

The hook animates `<outlet :view="…" />` page replacements, `@if` / `@else` branches, and keyed `@for`/`each` row insertions and removals. Leave nodes stay in the DOM until their animation completes; removed rows are no longer reactive while their leave animation runs. Reduced-motion preference or unavailable Web Animations support skips motion and removes leaving nodes immediately. The integration is opt-in: without importing and enabling this add-on, core lifecycle behavior stays synchronous and no animation effects run.

## API reference

### `animate(element, keyframes, options?)`

Starts a Web Animation and cancels any earlier animation started by this add-on on the same element.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `element` | `Element` | Yes | Element to animate. |
| `keyframes` | `Keyframe[]` | Yes | Web Animations API keyframes. |
| `options` | `AnimateOptions` | No | Standard `KeyframeAnimationOptions` plus `respectReducedMotion`, which defaults to `true`. |

Returns the browser `Animation`, or `null` if element lacks `animate()` or reduced motion is enabled. The `respectReducedMotion` option is removed before passing animation options to the browser. When called inside a Nodula owner, cleanup cancels its active animation; otherwise cancel the returned animation yourself if needed.

### `createTransition(element, options?)`

Creates explicit `enter()`, `leave()`, and `cancel()` methods for one element.

| Option | Type | Default | Description |
|---|---|---|---|
| `enter` | `AnimationPhase` | — | Enter keyframes, as `Keyframe[]` or `{ keyframes, options? }`. |
| `leave` | `AnimationPhase` | — | Leave keyframes, in the same format. |
| `options` | `AnimateOptions` | `{}` | Shared animation options; phase options override matching shared options. |
| `removeOnLeave` | `boolean` | `false` | Remove element after leave completes, or immediately when leave motion is skipped. |

`enter()` returns `Animation \| null`. `leave()` returns a promise resolving `true` after successful completion and `false` if no animation ran or animation was canceled. `cancel()` cancels the transition's current animation. Calling another transition phase on the same element also cancels its previous Nodula animation.

### `enableLifecycleTransitions(options?)`

Registers optional enter/leave animations for page outlets, conditional branches, and keyed list rows. Returns an unregister function. When called within a Nodula owner, it unregisters automatically when that owner is disposed; call the returned function when used outside an owner.

| Option | Type | Default | Description |
|---|---|---|---|
| `phases` | `Partial<Record<LifecycleTransitionType, LifecycleTransitionPhases>>` | Built-in phase keyframes | Override phases by lifecycle type: `page`, `conditional`, or `list`. Omitted lifecycle types retain built-in defaults; supplying a type replaces that type's phase set. |
| `options` | `AnimateOptions` | `{ duration: 180, easing: 'ease-out', fill: 'both' }` | Shared animation options for lifecycle phases. |

`LifecycleTransitionPhases` has optional `enter` and `leave` values. In current runtime behavior, provide keyframe arrays for lifecycle phases and use `options` on `enableLifecycleTransitions` for shared browser animation options. Although the exported `AnimationPhase` type also permits `{ keyframes, options }`, lifecycle transitions do not currently unpack that object form or apply its per-phase options. `createTransition` does support that form.

### Exported types

The TypeScript entry also exports `AnimationPhase`, `AnimateOptions`, `TransitionOptions`, `LifecycleTransitionType`, `LifecycleTransitionPhases`, and `LifecycleTransitionOptions`, as described above.

## Lifecycle and accessibility

Lifecycle transitions are opt-in and operate through Nodula's lifecycle hook. Enter animation runs for inserted nodes; leave nodes remain in the DOM until their leave animations settle, then Nodula removes them. Removed list rows stop updating reactively while waiting for leave completion. Unregistering prevents future lifecycle callbacks; it does not create a persistent global animation manager.

The add-on checks `prefers-reduced-motion: reduce` at animation start. Keep motion decorative and nonessential. Reduced-motion settings and unsupported Web Animations API make `animate()` return `null`; explicit and lifecycle leave handling then proceeds without waiting for motion. No CSS stylesheet or Vite plugin is required.

## Errors and limitations

- The add-on requires a browser `Element` with Web Animations API support to play motion. Unsupported elements return `null` rather than throwing from `animate()`.
- Invalid keyframes or animation options are passed to the browser API; browser validation errors are not transformed into add-on-specific errors.
- The add-on does not implement layout-move transitions for reordered keyed rows, nor does it add Vue-style `Transition` or `TransitionGroup` components.
- `respectReducedMotion: false` overrides the user's reduced-motion preference; avoid doing so unless motion is necessary and an accessible alternative is provided.

## Related resources

- The demo shell enables lifecycle transitions in `demo_app/src/AppShell.page`; the add-ons page also shows the package import: [demo `/addons` page](https://nodula.richardleurs.nl/addons).
- See [Conditional Rendering](/guide/conditional-rendering), [List Rendering](/guide/list-rendering), and [Accessibility](/guide/accessibility) for lifecycle and inclusive-motion context.
- Animation behavior tests: `framework/vitest/animation.test.js`.
