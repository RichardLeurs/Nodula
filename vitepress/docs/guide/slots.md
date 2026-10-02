# Slots

Nodula supports default and named slots for imported `.comp` components. In the child, use `<slot>` for default content or `<slot @slot="heading">Fallback</slot>` for a named slot. In the parent, supply named content with `<template #heading>`:

```
<Panel>
  <p>Default body</p>
  <template #heading><h2>Account</h2></template>
</Panel>
```

The child receives `children` and `slots`; slot content follows the rendered component's ownership and cleanup. See [Components In-Depth](/guide/components-in-depth).
