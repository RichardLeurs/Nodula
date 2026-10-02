# State Management

Nodula's core state primitive is `signal(initialValue)`, which is useful for scalar values. For nested plain-object or array state, import `createStore` from the optional `nodula-framework/store` add-on. `computed()` derives values; `effect()` reacts to reads and returns a disposer.

There is no built-in global state manager. State can be local to a component/root, passed through props, or exported from an application module when intentionally shared. Reactive store and form helpers are optional add-ons at `nodula-framework/store` and `nodula-framework/form`.

Because the store is an optional package entry, apps that only need signals do not include its proxy implementation in the core bundle.
