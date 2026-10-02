# Reactivity in Depth

Signals are getter/setter pairs. Effects subscribe to signals and store properties read while they run, update those dependencies on subsequent runs, and can be stopped. Notifications are batched during one signal/store update. `computed()` is an effect-backed getter.

The optional `nodula-framework/store` add-on's `createStore()` recursively wraps plain objects and arrays. Reads, key enumeration, and presence checks are tracked; writes, deletion, and array mutators notify subscribers. Class instances, `Map`, and `Set` are not recursively proxied. Roots and effect runs own cleanup callbacks; see [Reactivity Fundamentals](/guide/reactivity) for examples.
