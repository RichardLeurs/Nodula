# Template Refs

Template refs let a component receive the DOM element created for a template node. Nodula uses callback refs: the callback receives the element during creation and receives `null` when its owning component, branch, or row is disposed. Use refs for imperative browser APIs—such as focusing an input—when a declarative binding is not sufficient.

## Prerequisites

`@ref` is supported in Vite-compiled `.page` and `.comp` templates. JavaScript DOM-helper users can pass a `ref` callback to `h()`. See [Single-File Components](/guide/templates) and [Framework Core](/guide/framework-core).

## Core concepts

- A ref is a callback, not a template variable or automatically reactive reference object.
- Nodula calls the callback with the created `Element`.
- When the owning scope is disposed, Nodula calls the callback with `null`.
- Conditional branches and keyed rows own their DOM independently, so a ref is cleared when that specific node is removed.
- Refs are assigned during DOM node creation. Nodula does not promise Vue-style `nextTick()` scheduling.

## Quick start

```html
<script>
let searchInput = null;

function captureSearchInput(element) {
  searchInput = element;
}

function focusSearch() {
  searchInput?.focus();
}
</script>

<template>
  <section>
    <label>
      Search
      <input type="search" @ref="captureSearchInput" />
    </label>
    <button type="button" @click="focusSearch()">Focus search</button>
  </section>
</template>
```

When the input is created, `captureSearchInput` receives the input element. When its owner is disposed, it receives `null`, so clear or replace saved references in the callback as needed.

## How it works

The compiler passes the expression named by `@ref` as the element's `ref` callback. Core `h()` invokes that callback with the element immediately after creating it and registers cleanup to call the same callback with `null` when its owning scope is disposed.

```js
import { h, mount } from 'nodula-framework';

let heading;
const unmount = mount('#app', () => h('h1', {
  ref: (element) => { heading = element; },
}, 'Welcome'));

heading?.focus();
unmount(); // ref callback runs again with null
```

Use a function declared in the component's setup scope for template refs. A callback ref on a conditional node is cleared when the condition removes that branch; a keyed-row ref is cleared when its row is removed.

## Common patterns

### Focus after a user action

```html
<script>
let nameInput = null;
function setNameInput(element) { nameInput = element; }
function beginEditing() { nameInput?.focus(); }
</script>

<template>
  <button type="button" @click="beginEditing()">Edit name</button>
  <input aria-label="Name" @ref="setNameInput" />
</template>
```

### Keep a conditional ref current

```html
<script>
import { signal } from 'nodula-framework';

const [visible, setVisible] = signal(false);
let dialogContent = null;
function setDialogContent(element) { dialogContent = element; }
</script>

<template>
  <button type="button" @click="setVisible(!visible())">Toggle</button>
  <section @if="visible()" @ref="setDialogContent">Temporary content</section>
</template>
```

When the branch disappears, `setDialogContent(null)` runs and clears the saved reference.

## Limitations and troubleshooting

- `@ref` expects a callback expression. It does not create a named ref automatically; declare a variable and callback in `<script>`.
- Refs are not reactive state. If a component must render based on whether an element exists, use a signal for that state and keep the ref callback focused on imperative access.
- There is no `nextTick()` guarantee. Refs are assigned during node creation; use `onMount()` for work that should run after the current root setup has completed synchronously.
- A ref is cleared when its owner is disposed, not merely because a node is visually hidden with `@show`. Hidden nodes remain mounted.
- Do not retain a DOM element after its callback receives `null`; it may be detached and its listeners/effects have been disposed.

## Related guides

- [Single-File Components](/guide/templates) — `@ref` template syntax.
- [Conditional Rendering](/guide/conditional-rendering) — branch mount/disposal behavior.
- [List Rendering](/guide/list-rendering) — refs inside keyed rows.
- [Reactivity and DOM](/guide/reactivity) — roots and lifecycle cleanup.
- DOM ref tests: `framework/vitest/dom.test.js`; compiler coverage: `framework/vitest/compiler.test.js`.