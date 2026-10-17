# Event Handling

Nodula event bindings attach native browser event listeners to rendered elements. Use template event directives in `.page`/`.comp` files or native event props with core `h()`. There is no separate synthetic event system.

## Prerequisites

Template examples require the Nodula Vite compiler. JavaScript DOM-helper examples use core imports from `nodula-framework`. See [Single-File Components](/guide/templates) and [Framework Core](/guide/framework-core).

## Core concepts

- Template event expressions name a handler or call a handler with arguments.
- `$event` refers to the native event object in explicit event syntax.
- `h()` event props register native listeners directly.
- Listeners belong to the component/root that creates them and are removed when that owner is disposed.

## Quick start

```html
<script setup>
import { signal } from 'nodula-framework';

const [count, setCount] = signal(0);
function increment() {
  setCount((value) => value + 1);
}
</script>

<template>
  <button type="button" @click="increment()">
    Add one: {{ count() }}
  </button>
</template>
```

The compiler maps the directive to a native click listener. The state read in the template remains reactive; the listener itself runs only when the browser dispatches the event.

## Supported template event syntax

```html
<template>
  <button @click="save()">Save</button>
  <form @submit="saveForm($event)">
    <button type="submit">Submit</button>
  </form>
  <x-picker @selection-change="onSelectionChange($event)"></x-picker>
</template>
```

Supported forms:

| Syntax | Behavior |
|---|---|
| `@click="handler()"` | Listen to native `click`; compiler passes event to the wrapper, though the expression may omit it. |
| `on:click="handler()"` | Alternative native event spelling. |
| `@on:click="handler($event)"` | Explicit event form. `$event` is the native event object. |
| `@selection-change="handler($event)"` | Dashed custom event name; emitted/listened to as the literal native event `selection-change`. |

For custom elements, use dashed event names and dispatch native `CustomEvent` instances from the element. 

## Use events with core DOM helpers

`h()` uses event properties such as `onClick`, `onInput`, `onChange`, and `onSubmit`. A function prop is an event only when its name is `on` followed by an uppercase letter (`onClick` → `click`) or uses the `on:name` form (`on:custom-event`); props such as `one`, `online`, or `only` stay attributes:

```js
import { h, mount, signal } from 'nodula-framework';

const [query, setQuery] = signal('');

function SearchBox() {
  return h('label', {},
    'Search',
    h('input', {
      type: 'search',
      value: () => query(),
      onInput: (event) => setQuery(event.currentTarget.value),
    }),
    () => `Searching for: ${query()}`,
  );
}

const unmount = mount('#app', SearchBox);
```

Use the actual event type and target semantics for the browser event. For supported text and checkbox two-way bindings, see [Form Input Bindings](/guide/form-input-bindings).

## How it works and cleanup

In templates, event attributes compile to a callback that receives the event and evaluates the template expression. In `h()`, event props call `addEventListener()` on the element. Nodula registers listener removal with the owning scope; unmounting a component or replacing a conditional branch therefore removes its listeners. A detached DOM node does not keep its Nodula event behavior alive after its owner is disposed.

Event listeners are installed when the element is created, not re-registered on every reactive update. Use reactive props for changing element values, and keep event handlers stable where practical.

## Common patterns

### Prevent a form's default navigation

```html
<script setup>
async function submit(event) {
  event.preventDefault();
  await saveForm();
}
</script>

<template>
  <form @submit="submit($event)">
    <button type="submit">Save</button>
  </form>
</template>
```

Nodula does not implicitly call `preventDefault()` or stop propagation. Use native event methods in your handler when needed.

### Handle an event in a reusable component

```html
<!-- Parent.page -->
<script setup>
import SaveButton from './SaveButton.comp';

function save() {
  // Perform the parent action.
}
</script>

<template>
  <SaveButton @save="save($event)" />
</template>
```

Imported `.comp` component event attributes become callback props (for example, `@save` maps to `onSave`). The child must invoke the matching callback; this is component communication, distinct from a native DOM listener. See [Component Events](/guide/component-events).

## Limitations and troubleshooting

- Vue-style event modifiers such as `.stop`, `.prevent`, `.once`, and key modifiers are not implemented. Call native event methods or manage a listener directly when needed.
- Event names are native DOM event names. Dashed custom names are supported; invalid explicit `@on:event` names fail compilation.
- Listener cleanup depends on Nodula ownership. Manually created listeners outside Nodula scopes remain the application's responsibility.
- Template expressions run as JavaScript compiled from supported syntax, not as a full Vue expression system. Keep complex logic in named `<script setup>` functions.
- Use semantic buttons and form controls for keyboard accessibility; do not replace native interaction semantics with click handlers on non-interactive elements.

## Related guides

- [Single-File Components](/guide/templates) — template event syntax.
- [Component Events](/guide/component-events) — callbacks between imported components.
- [Reactivity and DOM](/guide/reactivity) — signals and event-driven updates.
- [Form Input Bindings](/guide/form-input-bindings) — value/checked bindings.
- Tests: `framework/vitest/compiler.test.js` and `framework/vitest/dom.test.js`.