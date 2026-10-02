# List Rendering

Render a keyed collection with `@for`. A stable `:key` is required:

```
<template>
  <ul>
    <li @for="item of items()" :key="item.id">{{ item.name }}</li>
  </ul>
</template>
```

Inside a row, the loop item is a reactive accessor; expressions can read properties such as `item.name`, and JavaScript callbacks can call `item()`. Keys let Nodula retain and reorder row nodes. Duplicate keys are rejected. The `each="item of items()" :key="item.id"` spelling remains supported. Optional keyed-row enter/leave transitions are documented in [Animations](/guide/animations).
