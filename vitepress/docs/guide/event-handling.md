# Event Handling

Templates attach native DOM listeners with `@event`, `on:event`, or explicit `@on:event` syntax:

```
<template>
  <button @click="increment()">Add one</button>
  <form @submit="save($event)"><button type="submit">Save</button></form>
</template>
```

The event expression can use `$event`; listeners are removed with their owning component. In JavaScript DOM helpers, use native event props such as `onClick` and `onSubmit`. Nodula does not add a separate synthetic event system or Vue event modifiers; use native DOM APIs when needed.
