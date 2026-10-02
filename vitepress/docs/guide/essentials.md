# Essentials

Nodula essentials are a small set of composable primitives rather than a large component runtime:

- **State:**Core`signal()`for scalar values; optional`createStore()`from`nodula-framework/store`for plain object/array state.
- **Derivation:**`computed()`for a read-only derived getter.
- **Side effects:**`effect()`for tracked work, with a disposer.
- **Rendering:**`h()`or a compiled`.page`/`.comp`template.
- **Lifetime:**`createRoot()`and`onCleanup()`for ownership and cleanup.

The guides below cover [application setup](/guide/creating-an-application), [templates](/guide/templates), and [reactivity](/guide/reactivity). Nodula does not provide Vue's Options API or Vue-compatible component lifecycle.
