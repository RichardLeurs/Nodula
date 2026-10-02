# Form Input Bindings

Two-way template bindings require an explicit signal getter/setter pair. Nodula supports `value` and `checked` controls:

```
<script setup>
import { signal } from 'nodula-framework';
const [name, setName] = signal('');
const [updates, setUpdates] = signal(false);
</script>

<template>
  <label>Name <input @bind:value="name, setName" /></label>
  <label><input type="checkbox" @bind:checked="updates, setUpdates" /> Updates</label>
</template>
```

`@bind="getter, setter"` is shorthand for a value binding (or checked binding for a checkbox). Only one binding per element is supported; do not combine it with a reactive `:value`/`:checked` on the same control. For validation, touched state, and submission, use the separate [Form add-on](/guide/forms).
