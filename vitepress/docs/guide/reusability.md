# Reusability

Reusable Nodula code can be packaged as ordinary JavaScript functions, imported `.comp` components, or small modules that expose state and helper functions. There is no global plugin/component registry requirement.

Use a component when a unit owns markup and DOM behavior. Use a plain JavaScript helper when only logic is shared. Signals and stores are the reactive primitives; props and slots are the component composition mechanisms. See [Composables](/guide/composables), [Components Basics](/guide/components-basics), and [State Management](/guide/state-management).
