# Registration

Nodula does not use a global component registry. Import a `.comp` component in a `.page` route or another `.comp` file and use its component tag; the Vite compiler recognizes the imported component. JavaScript components can be passed to the `component()` helper or called by application code.

```
<script setup>
import CounterCard from './CounterCard.comp';
</script>
<template><main><CounterCard /></main></template>
```

Keep file-based route pages under the route directory and ordinary reusable components outside it. See [Creating an Application](/guide/creating-an-application) and [Routing](/guide/routing).
