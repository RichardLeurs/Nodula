# Components In-Depth

Nodula's deeper component model is intentionally small: components are functions, `.comp` files compile to functions, and the runtime owns their effects, listeners, refs, and child scopes. Imported `.comp` components can receive reactive props, callbacks, default children, and named slots.

This section explains [registration](/guide/registration), [props](/guide/props), [events](/guide/component-events), and [slots](/guide/slots). Vue-specific features such as fallthrough-attribute inheritance, component `v-model`, and provide/inject do not exist unless explicitly described as a Nodula API.
