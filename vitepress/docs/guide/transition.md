# Transition

Nodula has no automatic Vue `<Transition>` component. Import the optional `nodula-framework/animation` add-on to use `animate()` or `createTransition()` explicitly, or call `enableLifecycleTransitions()` inside the app root to animate page outlets and `@if`/`@else` branches.

The add-on uses the Web Animations API, skips motion for reduced-motion preferences by default, and waits for leave animations before removing lifecycle-managed nodes. See [Animations](/guide/animations) for options and examples.
