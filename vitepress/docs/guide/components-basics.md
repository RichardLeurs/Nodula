# Components Basics

A Nodula component is a function that returns a DOM node, or a compiled `.comp` single-file component. Components let an application split UI into focused, reusable pieces. `.page` files are intended for page modules; `.comp` files are imported as child components.

## Prerequisites

JavaScript function components use the core `nodula-framework` runtime. `.comp` files additionally require the Nodula Vite compiler plugin configured for the project. See [Quick Start](/guide/quick-start) for the repository setup and [Single-File Components](/guide/templates) for compiler syntax and boundaries.

## Core concepts

- Components return DOM nodes; they are not registered in a global component registry.
- A `.comp` file combines `<script setup>`, one-root `<template>`, and optional styles.
- Imported `.comp` components receive attributes as props, children as default slot content, and named `<template #name>` content as named slots.
- Component state created with signals belongs to that component's owner scope. Effects and listeners are cleaned up when the component is removed.
- `.page` modules are not treated as child component tags by the compiler. Import and render them as page modules or use the optional router.

## Quick start: a function component

```js
import { h, mount, signal } from 'nodula-framework';

function Counter() {
  const [count, setCount] = signal(0);
  return h('button', {
    type: 'button',
    onClick: () => setCount((value) => value + 1),
  }, () => `Count: ${count()}`);
}

const unmount = mount('#app', Counter);
```

`mount()` creates an owner for the rendered component and returns a disposer. Function-valued child content creates a reactive DOM binding.

## Quick start: a `.comp` component

Create `Counter.comp`:

```html
<script>
import { signal } from 'nodula-framework';

const [count, setCount] = signal(0);
</script>

<template>
  <button type="button" @click="setCount(count() + 1)">
    Count: {{ count() }}
  </button>
</template>
```

Import it into another compiled component or page:

```html
<script>
import Counter from './Counter.comp';
</script>

<template>
  <main>
    <h1>Dashboard</h1>
    <Counter />
  </main>
</template>
```

The Vite compiler turns `.comp` templates into calls to the Nodula runtime. It is separate from routing: importing a component does not create a URL or route.

## Props and slots

Pass static attributes or reactive `:` attributes to an imported `.comp`:

```html
<script>
import ProfileCard from './ProfileCard.comp';
import { signal } from 'nodula-framework';

const [online, setOnline] = signal(true);
</script>

<template>
  <ProfileCard title="Account" :online="online()">
    <p>Default slot content</p>
    <template #actions>
      <button type="button" @click="setOnline(!online())">Toggle status</button>
    </template>
  </ProfileCard>
</template>
```

The child receives values in its setup context's `props` object and slot content through `children`/`slots`. Imported components receive callback props for component event syntax; this is callback passing, not a global event registry. See [Props](/guide/props), [Slots](/guide/slots), and [Component Events](/guide/component-events) for details.

## How it works and ownership

When a component is rendered, Nodula creates an owner scope for its DOM bindings, event listeners, refs, and nested components. Removing a conditional branch, list row, or mounted root disposes that owned work. Do not keep using a child DOM node after its owner has been removed.

The compiler recognizes imported `.comp` modules as component tags. It does not provide Vue's Options API, global component registration, arbitrary dynamic component lookup, or automatic routing for `.page` files. Use direct JavaScript component functions when you do not need single-file templates.

## Common patterns

- Keep a component focused on one reusable UI responsibility.
- Keep state local when only that component needs it; lift signals into a parent or shared module when multiple components coordinate.
- Pass reactive values as props, and pass callbacks as props for child-to-parent actions.
- Use default slots for primary content and named slots for clearly defined extension points.
- Prefer native elements and accessible HTML semantics inside component templates.

## Limitations and troubleshooting

- `.comp` and `.page` files require the Vite compiler plugin. An unresolved file extension usually means the plugin is missing from Vite configuration or the repository compiler boundary is misunderstood.
- Each file needs exactly one template root. The template compiler supports a focused JavaScript/HTML subset, not full Vue or Svelte syntax; see [Specifications and Limits](/guide/specifications).
- `<script>` contains JavaScript, not TypeScript. Props are runtime values. Declarations, defaults, validation and attribute fallthrough are opt-in with `export const propSchema` (see [Props](/guide/props)).
- Imported `.page` files are page modules, not recognized child component tags. Use `.comp` for imported template components.
- Function components return DOM nodes. They do not return arbitrary HTML strings for insertion.

## Related guides

- [Single-File Components](/guide/templates) — `.page`/`.comp` syntax and compiler features.
- [Components In-Depth](/guide/components-in-depth) — composition and component behavior.
- [Props](/guide/props), [Slots](/guide/slots), and [Component Events](/guide/component-events).
- [Quick Start](/guide/quick-start) — create and mount an application root.
- Compiler and component tests: `framework/vitest/compiler.test.js` and `framework/vitest/dom.test.js`.