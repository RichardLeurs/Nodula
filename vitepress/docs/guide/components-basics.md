# Components Basics

Nodula components can be JavaScript functions that return DOM nodes or `.comp` files compiled by the repository's Vite plugin. A `.comp` file has `<script setup>`, exactly one root in `<template>`, and optional style blocks. Imported `.comp` component tags receive props, default children, and named slots; `.page` files are reserved for file-based route pages.

```
<script setup>
import { signal } from 'nodula-framework';
const [count, setCount] = signal(0);
</script>
<template><button @click="setCount(count() + 1)">{{ count() }}</button></template>
```

Nodula is not Vue: there is no Options API, global component registry, or arbitrary HTML custom-element component syntax. See [Single-File Components](/guide/templates) and [Components In-Depth](/guide/components-in-depth).
