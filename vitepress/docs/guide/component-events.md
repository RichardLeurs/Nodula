# Component Events

An imported `.comp` component can receive event callbacks as props. Native events inside the child use the usual `@event` syntax, and the parent supplies a callback:

```
<!-- Parent -->
<script setup>
function saved(value) { console.log(value); }
</script>
<template><Editor @save="saved($event)" /></template>
```

The compiler passes the callback as a prop; the child invokes it with its event or value. This is direct callback passing, not Vue's `$emit` event registry. DOM listeners on native elements are cleaned up with their component owner.
