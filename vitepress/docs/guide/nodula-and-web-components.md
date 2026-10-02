# Nodula and Web Components

Nodula supports native custom elements in JavaScript render functions and `.page`/`.comp` templates, and can register a Nodula component as a browser custom element. This is focused interoperability, not a complete Web Components compiler or a Vue-style custom-element mode.

The demo includes an [external Iconify web component](https://iconify.design/docs/iconify-icon/) on its **Web Components** page. It imports `iconify-icon` once from the app entry, then uses `<iconify-icon :icon="...">` in a `.page` route. This is an example of consuming a third-party custom element; the page controls it with Nodula signals and native buttons.

## Use a native custom element

Custom tags can be written directly in a `.page` or `.comp` template. Use a reactive `:` binding for a property, and explicit event syntax for dashed custom event names:

```
<template>
  <data-panel :record="record()" @selection-change="handleSelection($event)"></data-panel>
</template>
```

Dynamic values on custom tags are assigned as DOM properties, so objects are not stringified. Static values remain HTML attributes. Use the `.prop` suffix to force even a static value through a property (`:mode.prop="'compact'"`). Event listeners, including dashed names, are removed with their Nodula owner.

## Expose a Nodula component

Register a component once, before creating its tag:

```
import { defineCustomElement, h, onCleanup } from 'nodula-framework';

defineCustomElement('nodula-greeting', ({ props }) => {
  onCleanup(() => console.log('greeting disconnected'));
  return h('button', { onClick: () => props.onGreet(props.name) }, `Hello, ${props.name}!`);
}, {
  props: ['name', 'record'],
  events: ['greet'],
  shadow: 'open',
});
```

`props` lists component properties and their reflected kebab-case attributes. Attribute values are strings; setting a property preserves its original value, including objects, and takes precedence over the reflected attribute. Boolean `true` reflects as an empty attribute; `false` and `null` remove it. `events` lists callback props to expose as bubbling, composed `CustomEvent`s whose `detail` is the callback's first argument. The default `shadow: 'open'` renders into an open shadow root; use `false` to render directly into the host (or `'closed'` for a closed root). Nodula's reactive root is disposed when the element disconnects.

The helper is also available as `Nodula.defineCustomElement(...)`. Registration follows the browser's one-definition-per-name rule. Native light-DOM slot projection, attribute type conversion, and SSR/hydration are not provided by this helper; map and validate string attributes in your component when needed.
