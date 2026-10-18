# Component Events

In Nodula, an event attribute on an imported `.comp` tag passes a callback prop to that child. The child chooses when to call it and what value to pass. This is direct component communication—not a component event bus, Vue-style `$emit`, or a DOM `CustomEvent`.

## Prerequisites

- Import the child `.comp` in the compiled parent file and configure the Nodula Vite compiler plugin.
- Component event syntax applies to imported `.comp` component tags. Native element events and custom-element events use DOM listener behavior instead.
- See [Registration](/guide/registration) for local component imports and [Props](/guide/props) for other component inputs.

## Pass a callback from parent to child

The parent may pass an expression using `@event` or `on:event`. The compiler converts the event name to a callback prop: `@save` becomes `props.onSave`; dashed event names retain their dashed callback key as `props['on:selection-change']`.

```html
<!-- Parent.page -->
<script>
import Editor from './Editor.comp';

function saveDraft(value) {
  console.log('Saved:', value);
}
</script>

<template>
  <Editor @save="saveDraft($event)" />
</template>
```

The child invokes the callback when its action occurs and supplies the value for `$event`:

```html
<!-- Editor.comp -->
<script>
import { signal } from 'nodula-framework';

const [draft, setDraft] = signal('Draft text');
</script>

<template>
  <label>
    Draft
    <input :value="draft()" @input="setDraft($event.currentTarget.value)" />
  </label>
  <button type="button" @click="props.onSave?.(draft())">
    Save draft
  </button>
</template>
```

The compiler-generated callback receives the argument provided by the child. For `props.onSave?.(draft())`, the parent's `saveDraft(value)` receives the current draft string. The optional call is useful when the callback is not required; otherwise establish that requirement in application code because Nodula does not declare or validate component event contracts.

## Event-name mapping

| Parent tag syntax | Child prop name | Notes |
|---|---|---|
| `@save="handler($event)"` | `props.onSave` | Event name is converted to `on` plus capitalized first letter. |
| `on:save="handler($event)"` | `props.onSave` | Alternative event-attribute spelling on component tags. |
| `@on:save="handler($event)"` | `props.onSave` | Explicit event form; `@on` alone is invalid. |
| `@selection-change="handler($event)"` | `props['onSelection-change']` | Component tags capitalize only the first event-name character and retain hyphens. |

Event names must begin with a lowercase letter and otherwise contain letters, digits, underscores, or hyphens. The event expression is called by the generated callback with the child-supplied argument as `$event`. This callback is not automatically dispatched on the DOM or bubbled through ancestors.

## Native DOM events are different

On a native element inside a component template, event syntax registers a browser listener. In that case `$event` is the native event object. The listener is owned by the rendered component/root and is removed when that owner is disposed. For example, the `@input` handler above receives an `InputEvent` and reads its target value.

For event listener forms, native `CustomEvent` dispatch, and listener cleanup, see [Event Handling](/guide/event-handling). For callbacks passed between imported components, use the callback-prop pattern on this page.

## Custom elements are different too

When a child tag is a browser custom element rather than an imported `.comp`, Nodula attaches a native DOM event listener. Dashed event names such as `@selection-change` listen for that literal event name. The custom element's provider must dispatch the corresponding native event—commonly a `CustomEvent` with `detail` data. See [Web Components](/guide/web-components).

By contrast, when a component is registered with `defineCustomElement(name, render, { events: [...] })` from `nodula-framework/web-components`, its declared callback props are adapted to bubbling, composed custom events by that registration helper. That is a separate API from ordinary imported `.comp` callbacks.

## JavaScript component callbacks

JavaScript components can receive callback functions through their `props` context. When using the `component()` descriptor, include callback values in the props accessor:

```js
import { component, h, mount } from 'nodula-framework';

function SaveButton({ props = {} } = {}) {
  return h('button', { type: 'button', onClick: () => props.onSave?.('Saved') }, 'Save');
}

const saveButton = component(SaveButton, () => ({
  onSave: (value) => console.log(value),
}));

const dispose = mount('#app', () => saveButton);
// Call dispose() when the mounted view is removed.
```

The `component()` helper packages a render function, props accessor, and optional slots into a component descriptor. It does not register event names; the parent and child agree on callback prop names.

## Lifecycle and cleanup

Component callback props are ordinary functions carried in the child's reactive props object. DOM event listeners created by child template elements belong to the child's owner and are removed when that owner is disposed. If a child component lives in a conditional branch or keyed row, removing that branch/row disposes the child and its DOM listeners. Do not retain a callback or detached node expecting its disposed component to remain active.

## Limitations and troubleshooting

- **Callback never runs:** the parent passes the callback, but the child must call the corresponding `props.onEvent(...)` function.
- **Callback prop name is wrong:** `@save` maps to `props.onSave`; dashed names such as `@selection-change` map to `props['onSelection-change']` on imported component tags.
- **`$event` is undefined or unexpected:** `$event` is the argument supplied when the child invokes the callback; component callbacks do not automatically receive a browser event.
- **Expecting bubbling:** ordinary component callback props do not create DOM events. Use a native custom element and `CustomEvent` when DOM propagation across an integration boundary is required.
- **Trying to declare emitted events:** Nodula has no event schema/emits declaration or runtime event validator; document callback names and payloads as part of the component contract.
- **Listener remains after removal:** ensure the native listener was created under a Nodula-owned render/root, and dispose the owner when removing the view.

## Related guides

- [Props](/guide/props) — values and callback props passed to children.
- [Components In-Depth](/guide/components-in-depth) — component context, ownership, and composition.
- [Event Handling](/guide/event-handling) — native event objects and DOM listener cleanup.
- [Web Components](/guide/web-components) — native custom-element events and exported Nodula components.
- Compiler and callback integration tests: `framework/vitest/compiler.test.js` and `framework/vitest/directives.test.js`.