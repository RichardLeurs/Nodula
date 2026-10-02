# Single-file Components

The package's `nodula-framework/vite` plugin compiles `.page` and `.comp` files into Nodula DOM calls. Add it to your Vite configuration to enable these file extensions. This compiler is separate from the router: it compiles modules, while `createFileRouter` is a public runtime API that consumes page modules/loaders. A component can contain `<script setup>`, one single-root `<template>`, and optional style blocks:

```
<script setup>
import { signal } from 'nodula-framework';

const [count, setCount] = signal(0);
</script>

<template>
  <button class="counter" @click="setCount(count() + 1)">
    Clicked {{ count() }} times
  </button>
</template>

<style scoped>
.counter { color: seagreen; }
</style>
```

The script block is JavaScript (not TypeScript). Templates must have exactly one root element. Plain `<style>` blocks are global; `<style scoped>` scopes selectors to the component's rendered elements.

## Supported template syntax

- Text interpolation:``.
- Reactive attributes:`:attribute="expression"`.
- Native events:`@click="handler()"`,`on:click="handler()"`, or`@on:click="handler($event)"`.
- Conditional rendering:`@if="condition()"`followed immediately (apart from whitespace) by`@else`. Only the active branch is mounted.
- Keyed loops:`@for="item of items()" :key="item.id"`. Keys are required; inside a row, an item is an accessor (for example, use`item()`or`item.name`). The existing`each="item of items()" :key="item.id"`form is also supported.
- Visibility without removal:`@show="condition()"`.
- Element references:`@ref="callback"`; the callback receives the element and later`null`when its owner is disposed.
- Two-way input bindings:`@bind="getter, setter"`,`@bind:value="getter, setter"`, or`@bind:checked="getter, setter"`.`bind:value`and`bind:checked`are also accepted. Bindings support`value`and`checked`; arbitrary binding expressions are not implemented.
- Slots and imported`.comp`components, including props, default children, and named slots.
- `use:visibleIsland`for deferring a component loader until its placeholder is visible.

Example conditional and keyed list:

```
<template>
  <main>
    <p @if="connected()">Connected</p>
    <p @else>Not connected</p>
    <ul>
      <li @for="item of items()" :key="item.id">{{ item.name }}</li>
    </ul>
  </main>
</template>
```

`@for` cannot share an element with `each`, `@if`, or `@else`. Use a distinct key for each row. The compiler implements a focused template subset; it is not a full Vue or Svelte compiler. See [specifications and limits](/guide/specifications) before relying on unsupported syntax.
