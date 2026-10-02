# Template Refs

Use `@ref` to receive a created element and later `null` when its owner is disposed:

```
<script setup>
let inputElement;
function captureInput(element) { inputElement = element; }
function focusInput() { inputElement?.focus(); }
</script>

<template>
  <div>
    <input @ref="captureInput" />
    <button @click="focusInput()">Focus</button>
  </div>
</template>
```

The callback form supports conditional elements and participates in component cleanup. In the JavaScript DOM helper, pass a `ref` callback to `h()`. Refs are assigned during element creation; Nodula does not implement Vue's `nextTick()` contract.
