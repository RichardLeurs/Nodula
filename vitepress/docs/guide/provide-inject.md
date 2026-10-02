# Provide / inject

Nodula does not currently implement Vue's `provide` / `inject` context API. For shared state, create a module-level `signal` or a `createStore` from `nodula-framework/store` and import it where needed, or pass values and callbacks through component props and slots.

Choose module-level state deliberately: it is shared by every consumer of that module instance. For isolated instances, create state in a parent function and pass it down. Nodula has no built-in dependency-injection scope or default-value lookup.
