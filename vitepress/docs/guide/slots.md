# Slots

Slots let a parent supply markup for a child `.comp` component to render at a chosen place. Nodula supports one default slot and statically named slots. Slot content is passed by the component call site; the child chooses whether and where to render it, and can provide fallback content.

## Prerequisites

- Import the child `.comp` file in the parent `.page` or `.comp` file.
- Configure the Nodula Vite compiler plugin for single-file components; see [Tooling](/guide/tooling) and [Single-File Components](/guide/templates).
- Slots are component composition, not native custom-element light-DOM projection. See [Web Components](/guide/web-components) for browser `<slot>` behavior at a custom-element boundary.

## Default slot

Ordinary child markup becomes the component's default slot. The child renders it with `<slot>` and may provide fallback markup:

```html
<!-- Parent.page -->
<script>
import Panel from './Panel.comp';
</script>

<template>
  <Panel>
    <p>Account details go here.</p>
  </Panel>
</template>
```

```html
<!-- Panel.comp -->
<template>
  <section class="panel">
    <slot><p>No panel content was provided.</p></slot>
  </section>
</template>
```

If parent supplies default content, child renders that content instead of fallback. If no default slot is supplied, fallback child nodes render. Use an empty `<slot></slot>` when no fallback is needed.

## Named slots

Place named content inside a `<template #name>` at the component call site. The child selects that content with `<slot @slot="name">`:

```html
<!-- Parent.page -->
<script>
import Panel from './Panel.comp';
</script>

<template>
  <Panel>
    <p>Main body</p>
    <template #heading><h2>Account</h2></template>
    <template #actions><button type="button">Edit</button></template>
  </Panel>
</template>
```

```html
<!-- Panel.comp -->
<template>
  <section class="panel">
    <header><slot @slot="heading"><h2>Untitled</h2></slot></header>
    <main><slot><p>No panel content was provided.</p></slot></main>
    <footer><slot @slot="actions"></slot></footer>
  </section>
</template>
```

The names must match exactly. A named slot without supplied content renders its fallback, if any. The default slot is the non-whitespace child markup not wrapped in a named `<template>`.

## Slot API and supported syntax

- Default placeholder: `<slot>fallback content</slot>`.
- Named placeholder in child: `<slot @slot="heading">fallback content</slot>`.
- Named content in parent: `<template #heading>...</template>`; static `slot="heading"` on the child template is also accepted.
- Named slots require a static name containing letters, digits, underscores, or hyphens. Each name can be supplied at most once on a component call.
- The slot placeholder must appear inside the component template's single root element. `<slot>` placeholders accept only the `@slot` attribute.
- A component child `<template>` must have exactly one `#name` or `slot="name"` attribute and no additional attributes.

Do not confuse a named slot placeholder with a component call-site slot: `@slot` belongs on a child `<slot>` element, while `#name` belongs on the parent's `<template>` content.

## JavaScript components

JavaScript components receive slot content through `children` and `slots` in their context. When composing through `component()`, pass slot values as the third argument:

```js
import { component, h, mount } from 'nodula-framework';

function Panel({ children, slots = {} } = {}) {
  return h('section', {},
    h('header', {}, slots.heading ?? 'Untitled'),
    h('main', {}, children),
  );
}

const panel = component(Panel, () => ({}), {
  heading: () => h('h2', {}, 'Account'),
  default: () => h('p', {}, 'Account details go here.'),
});

const dispose = mount('#app', () => panel);
// Call dispose() when this mounted view is removed.
```

The runtime also derives `children` from the default slot when rendering a component descriptor. Compiled `.comp` slots are supplied as functions; JavaScript slot values may be nodes or functions. Call `slot(slots, name, fallback)` when building a lower-level render descriptor and lazy fallback behavior is useful.

## Ownership and updates

Slot functions run as part of the rendered child composition. Their DOM, reactive expressions, event listeners, and nested components are cleaned up with the owning rendered component/branch. Do not retain or manipulate slotted DOM after its owner has been removed. Parent signal reads inside compiled slot content remain reactive, so supplied content can update without re-registering a global slot.

## Limitations and troubleshooting

- **Fallback always appears:** verify the parent supplied content to the correct default or named slot and the child uses the matching placeholder.
- **Named content is missing:** names are static and must match exactly, such as `#heading` with `@slot="heading"`.
- **Compiler rejects child `<template>`:** component slot templates require exactly one `#name` or `slot="name"` attribute and cannot carry other attributes.
- **Slot placeholder at the root is rejected:** place `<slot>` inside the component's one root element.
- **Expecting slot props/scoped slots:** Nodula currently passes caller content through `children`/`slots`; the child does not provide a slot-prop API.
- **Expecting `<slot>` projection inside a custom element:** Nodula component slots are not native Shadow DOM slots. Add native `<slot>` elements to a custom element's shadow markup when implementing browser slot projection.
- **Cleanup does not run:** keep slot output inside Nodula's component/owner tree; owner disposal is what cleans up its DOM behavior.

## Related guides

- [Components Basics](/guide/components-basics) — first component and slot examples.
- [Components In-Depth](/guide/components-in-depth) — component context, ownership, props, and composition.
- [Props](/guide/props) — values passed alongside slot content.
- [Registration](/guide/registration) — import-based `.comp` component use.
- [Web Components](/guide/web-components) — native custom-element slots and Shadow DOM boundaries.
- Compiler/runtime tests: `framework/vitest/compiler.test.js`, `framework/vitest/directives.test.js`, and `framework/vitest/dom.test.js`.