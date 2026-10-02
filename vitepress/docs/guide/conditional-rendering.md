# Conditional Rendering

Use adjacent `@if` and optional `@else` directives to render one branch from a reactive expression:

```
<template>
  <div>
    <p @if="connected()">Connected</p>
    <p @else>Not connected</p>
  </div>
</template>
```

`@else` must immediately follow its `@if` apart from whitespace. The branches are mounted and disposed as the condition changes. `<template @if>` and `<template @else>` can group multiple nodes without adding a wrapper. If the animation add-on is enabled, these branch insertions/removals can also transition. See [Animations](/guide/animations).
