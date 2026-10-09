# Fallthrough Attributes

Nodula does not automatically inherit attributes from an imported component tag onto the child component's root element. Attributes passed by the caller are component props; the child chooses which values, if any, to bind to its DOM elements. This explicit forwarding avoids implicit root-selection and merge rules.

## Pass props, then forward selected values

The parent can pass values as ordinary static attributes or reactive `:` bindings:

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

The child explicitly applies supported props to the native element it owns:

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

Static caller attributes are passed to the component as strings; bound attributes evaluate expressions and can carry booleans, objects, or changing values. Reading them in reactive bindings updates the chosen DOM element when the prop changes. `class` is compiled as the DOM `className` property on native elements. A prop omitted by the caller is `undefined`, so use defaults or optional behavior explicitly where appropriate.

## Forward intentionally

Forward only attributes your component promises to support. Decide which element receives each value and which values are intentionally ignored:

- Forward `class` to the intended visual root if callers should style it.
- Forward `title`, `aria-*`, `data-*`, `id`, or `tabindex` only when they make sense for that element and component contract.
- Forward `disabled` or `type` only for controls that support those semantics.
- Do not spread every prop onto a DOM element. Component-only inputs such as `variant`, `loading`, or callbacks may require logic rather than a DOM attribute.

For multiple internal elements, explicitly choose a target for each forwarded prop. There is no automatic “single root” destination, class merge, or event-listener inheritance. Although `.page`/`.comp` templates require a single template root, that does not imply caller props fall through to it.

## Native events and component callbacks

An event attribute on an imported `.comp` tag is callback-prop syntax, not an undeclared native listener that automatically falls through. For example, parent `@save="handleSave($event)"` is passed as a callback prop; the child calls `props.onSave(...)` when its action occurs.

To support a native DOM listener supplied by a caller, the child must explicitly connect an appropriate callback prop to a native element event—or expose a deliberate component callback contract. Nodula does not silently attach all caller event props to the root. See [Component Events](/guide/component-events) for callback mapping and [Event Handling](/guide/event-handling) for native listeners.

## JavaScript component equivalent

JavaScript components use the same explicit approach: accept values in `props` and assign chosen ones to the element with `h()`:

```js
import { h } from 'nodula-framework';

function ActionButton({ props = {}, children } = {}) {
  return h('button', {
    type: 'button',
    className: props.class,
    title: props.title,
    disabled: props.disabled,
    onClick: props.onClick,
  }, children ?? 'Save');
}
```

`h()` uses DOM property/attribute rules for the target element. Use documented `ElementProps` such as `className`, `title`, and `disabled`; for arbitrary attributes such as `aria-label`, use the matching string key. See [Framework Core](/guide/framework-core) and [Props](/guide/props).

## Troubleshooting

- **Caller class or title is missing on the DOM:** bind `props.class` or `props.title` explicitly on the child element.
- **Dynamic forwarded value does not update:** pass it with `:` at the call site and bind the prop through a reactive expression in the child.
- **ARIA or data attribute not forwarded:** add an explicit `:aria-label="props['aria-label']"` or corresponding binding to the intended element.
- **Component event handler never runs:** event attributes on imported components are callback props; the child must invoke `props.onEvent(...)`. They do not automatically become root DOM listeners.
- **Class unexpectedly replaces component styling:** choose a deliberate class convention. Nodula does not automatically merge caller and internal classes; explicitly concatenate values in supported JavaScript/template expressions if needed.
- **Trying to use spread/automatic inherit attributes:** the template compiler does not provide Vue-style `$attrs`, `inheritAttrs`, or generic prop spreading. Forward specific props explicitly.

## Related guides

- [Props](/guide/props) — static and reactive component inputs.
- [Components In-Depth](/guide/components-in-depth) — component context and composition.
- [Component Events](/guide/component-events) — callback props between components.
- [Event Handling](/guide/event-handling) — native DOM event listeners.
- [Single-File Components](/guide/templates) — supported `.page`/`.comp` template syntax.
- Component behavior tests: `framework/vitest/compiler.test.js` and `framework/vitest/directives.test.js`.