# Fallthrough Attributes

Attributes that a caller passes to a component but the component does not declare are called fallthrough attributes. Nodula forwards them only for components that opt in with a `propSchema`. A component without a schema receives no fallthrough: its attributes are only the props it reads, and it forwards any value it wants to expose explicitly.

Fallthrough is provided by the `nodula-framework/props` add-on. The compiler imports it when a `.comp` declares a schema; JavaScript components call its functions themselves.

## Opt in with propSchema

Declare the props the component supports. Everything else the caller passes falls through to the root element:

```html
<!-- Parent.page -->
<script>
import ActionButton from './ActionButton.comp';
import { signal } from 'nodula-framework';

const [blocked, setBlocked] = signal(false);
</script>

<template>
  <ActionButton
    class="toolbar-action"
    aria-label="Save document"
    :disabled="blocked()"
  />
  <button type="button" @click="setBlocked(!blocked())">Toggle disabled</button>
</template>
```

```html
<!-- ActionButton.comp -->
<script>
export const propSchema = {
  label: { default: 'Save' },
};
</script>

<template>
  <button type="button" class="action">{{ props.label }}</button>
</template>
```

The caller's `class`, `aria-label`, and `disabled` are not declared, so they are in `attrs` and merged onto the `<button>`. The rendered button has the classes `action toolbar-action`, the `aria-label`, and the `disabled` state. When `blocked()` is `false`, the `disabled` attribute is removed.

Declared names are props, not attributes. If the schema declares `label`, a caller's `label` stays in `props` and is not added to the DOM. See [Props](/guide/props#declare-a-prop-schema) for the schema options.

## Merge rules

When a caller attribute and an own value both apply to the same element, `mergeAttrs` combines them as follows:

| Caller attribute | Result on the target element |
|---|---|
| `class` or `className` | Own classes first, then the caller's, joined with a space. |
| `style` | Own style first, then the caller's. Object styles become CSS text with kebab-case names, so the caller wins for a property both set. Declarations the caller removes disappear. |
| `onX` or `on:x` with a function value | One listener. The component's own handler for that event runs first, then the caller's. The caller's handler is read when the event fires, so swapping it takes effect without re-rendering. |
| `ref`, `bind`, `show` | Never forwarded. The component's own element is the only place they apply. |
| Any other attribute, such as `id`, `title`, `role`, `tabindex`, `aria-*`, `data-*`, `disabled` | The caller's value wins. A caller value of `null` or `undefined` falls back to the component's own value. `false` removes the attribute. |

Values stay reactive. Caller values are read when the element updates, so changing a bound attribute updates the element. The set of caller names is read once, when the component renders. An attribute added to the caller later is not applied. Pass the attribute with an `undefined` value if it may be needed later:

```html
<ActionButton :title="tip() || undefined" />
```

## Choose the target element

Caller attributes go to one place in the component:

- **The template root** is the target by default when the component declares a schema.
- **The element marked `@attrs`** is the target when present. It is used in place of the root.
- **A component tag** as the target passes the caller attributes to that inner component as its props. The tag's own props win over the caller's. The inner component then applies its own schema to them.

```html
<!-- Card.comp -->
<script>
export const propSchema = {
  title: { required: true },
};
</script>

<template>
  <section class="card">
    <button type="button" @attrs class="card-action">{{ props.title }}</button>
  </section>
</template>
```

`@attrs` has these rules, enforced at compile time:

- It takes no value, and at most one element in a component can have it.
- It requires `propSchema` in the same component.
- It is not allowed on `<slot>`, `<template>`, or `<outlet>`, and not inside a loop (`@for` or `each`).
- A component with a schema must have an element or component root, unless an element is marked `@attrs`. A text root or an `<outlet>` root without `@attrs` is a compile error.

## Events and callbacks

On an imported `.comp` tag, `@save="..."` is callback-prop syntax: the child receives `props.onSave`. A component with a schema receives callbacks as ordinary props only when it declares them. Any undeclared event prop is a caller attribute, so it is attached to the target element as a native listener:

```html
<!-- Editor.comp: the callback is not declared -->
<script>
export const propSchema = {
  value: {},
};
</script>

<template>
  <button type="button">Save</button>
</template>
```

With that schema, `<Editor @save="saveDraft($event)" />` attaches a native `save` listener to the `<button>`, not a callback prop. To receive the callback as a prop, declare it:

```html
<script>
export const propSchema = {
  value: {},
  onSave: {},
};
</script>

<template>
  <button type="button" @on:click="props.onSave?.(props.value)">Save</button>
</template>
```

Declared callbacks are not attached to the DOM. A native DOM listener on a `.comp` root can use `@click` or `@on:click`, which is the usual pattern. See [Component Events](/guide/component-events) for callback mapping and [Event Handling](/guide/event-handling) for native listeners.

## JavaScript components

A function component declared with `withProps` receives `attrs`, but nothing is applied automatically. Pass `attrs` to `mergeAttrs` for the element that should receive them:

```js
import { h } from 'nodula-framework';
import { mergeAttrs, withProps } from 'nodula-framework/props';

const ActionButton = withProps({ label: { default: 'Save' } },
  function ActionButton({ props, attrs, children }) {
    return h('button', mergeAttrs(attrs, { type: 'button' }), children ?? (() => props.label));
  });
```

`mergeAttrs` returns the props for `h()`, and the merge rules above apply. See [Props](/guide/props#add-on-api) for the function signatures.

## Custom elements

`defineCustomElement` does not read a schema. Pass the names the element should observe explicitly:

```js
import { h } from 'nodula-framework';
import { defineCustomElement } from 'nodula-framework/web-components';
import { withProps } from 'nodula-framework/props';

const Counter = withProps({ count: { type: Number, default: 0 } }, ({ props }) =>
  h('output', {}, () => String(props.count)));

defineCustomElement('app-counter', Counter, { props: Object.keys(Counter.propSchema) });
```

Each name in `props` is reflected as a kebab-case attribute as well as a property. Each name must start with a letter, so a schema prop named `_hidden` or `$value` cannot be listed in `props`.

## Explicit forwarding without a schema

A component without `propSchema` forwards nothing. The child chooses which props to bind to its elements:

```html
<!-- ActionButton.comp -->
<template>
  <button
    type="button"
    :class="props.class"
    :aria-label="props['aria-label']"
    :disabled="props.disabled"
    @click="props.onClick?.($event)">
    <slot>Save</slot>
  </button>
</template>
```

Forward only the values the component promises to support. Decide which element receives each value and which values are ignored:

- Forward `class` to the visual root if callers should style it.
- Forward `title`, `aria-*`, `data-*`, `id`, or `tabindex` only where they make sense for the component's contract.
- Forward `disabled` or `type` only for controls that support those semantics.
- Do not spread every prop onto a DOM element. Component-only inputs such as `variant` or `loading` need logic rather than a DOM attribute.

Static caller attributes are passed as strings; bound attributes evaluate expressions and can carry booleans, objects, or changing values. `class` is compiled as the DOM `className` property on native elements.

## Limits

- Fallthrough needs a `propSchema` in a `.comp` file, or `withProps` with explicit `mergeAttrs` in JavaScript. Components without a schema do not forward attributes.
- There is one target element per component. A `.comp` can mark exactly one element with `@attrs`; loops and slots cannot be targets.
- The set of caller attribute names is read once when the component renders. Later additions are not applied.
- A caller `ref`, `bind`, or `show` is ignored.
- A caller attribute that reaches an inner component through a component-tag target becomes that component's prop. It is not forwarded to the DOM unless that component forwards it.
- There is no Vue-style `$attrs`, `inheritAttrs`, or class merge for components without a schema.

## Troubleshooting

- **Caller attribute is missing on the DOM:** the component has no schema, or the attribute is declared as a prop and therefore not forwarded. Declare a schema, or forward the prop explicitly.
- **Caller class or style is not applied to the root:** check that the target is the root or the element marked `@attrs`, and that the component declares a schema.
- **Attribute added later does not appear:** the caller must pass the attribute from the first render. Pass it with an `undefined` value, as shown above.
- **Caller listener fires on the root unexpectedly:** the callback is not declared in the schema. Declare it, such as `onSave: {}`, so it becomes a prop.
- **Component event handler never runs:** on a component without a schema, `@save` is a callback prop; the child must invoke `props.onSave(...)`. It does not become a DOM listener.
- **Compile error about `@attrs`:** check the rules listed in [Choose the target element](#choose-the-target-element).

## Related guides

- [Props](/guide/props) — schema options, defaults, warnings, and `withProps`.
- [Components In-Depth](/guide/components-in-depth) — component context and composition.
- [Component Events](/guide/component-events) — callback props between components.
- [Event Handling](/guide/event-handling) — native DOM event listeners.
- [Single-File Components](/guide/templates) — supported `.page`/`.comp` template syntax.
- Tests: `framework/vitest/props.test.js` and `framework/vitest/compiler.test.js`.
