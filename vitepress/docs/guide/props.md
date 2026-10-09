# Component Props

Props are explicit inputs passed from a parent to a child component. Imported `.comp` components receive them through the `props` object in their setup context. Nodula does not require a prop declaration before a value can be passed.

## Pass static and reactive props

Import a `.comp` component in the file that uses it, then pass attributes on its component tag:

```html
<script>
import ProfileCard from './ProfileCard.comp';
import { signal } from 'nodula-framework';

const [active, setActive] = signal(true);
</script>

<template>
  <ProfileCard title="Account" :active="active()" />
  <button type="button" @click="setActive(!active())">Toggle active</button>
</template>
```

In the child template, read values from `props`:

```html
<!-- ProfileCard.comp -->
<template>
  <article>
    <h2>{{ props.title }}</h2>
    <p>{{ props.active ? 'Active' : 'Inactive' }}</p>
  </article>
</template>
```

Static attributes such as `title="Account"` are passed as strings. Prefix a bound attribute with `:` to evaluate a JavaScript expression; `:active="active()"` passes the current boolean value and tracks it so later changes update child reads. Use the bound form for booleans, numbers, objects, arrays, and values that should remain reactive. A missing prop reads as `undefined` unless the component handles it.

## Prop updates and component setup

The runtime keeps the child `props` object reactive. When a parent-bound value changes, reads of that property in the child’s reactive DOM expressions/effects update; the child component function is not automatically called again. Use a reactive read in the child when output should follow a changing prop:

```html
<template>
  <button type="button" @click="props.onSelect?.(props.item)">
    {{ props.item.name }}
  </button>
</template>
```

Avoid copying a prop into local state at setup time if it must stay synchronized. If local editable state is intended, initialize that state explicitly and define how later prop changes should be handled.

## Callback props

Component event syntax is shorthand for passing a callback prop. The parent supplies an expression, and the child invokes the resulting `props.on<Event>` callback:

```html
<!-- Parent.comp -->
<script>
import Editor from './Editor.comp';
import { signal } from 'nodula-framework';

const [draft] = signal('Unsaved changes');
function saveDraft(value) {
  console.log('Saved:', value);
}
</script>

<template>
  <Editor :value="draft()" @save="saveDraft($event)" />
</template>
```

```html
<!-- Editor.comp -->
<template>
  <button type="button" @click="props.onSave?.(props.value)">
    Save
  </button>
</template>
```

For `@save`, the child callback prop is `props.onSave`; `$event` is the argument supplied by the child call. This is direct callback passing, not a global event registry or a DOM `CustomEvent`. Use native DOM events for events emitted by actual custom elements; see [Web Components](/guide/web-components).

## JavaScript components

Call JavaScript function components with a context object, or use `component(render, readProps, slots?)` to create a descriptor whose props come from an accessor:

```js
import { component, h, mount, signal } from 'nodula-framework';

function Status({ props = {} } = {}) {
  return h('p', {}, () => `${props.name}: ${props.active ? 'active' : 'inactive'}`);
}

const [active, setActive] = signal(true);
const status = component(Status, () => ({ name: 'Account', active: active() }));
const dispose = mount('#app', () => status);

setActive(false);
// Call dispose() when this mounted view is removed.
```

The function passed to `component()` supplies the current props object; the runtime updates the child’s reactive props when that accessor’s dependencies change. Direct function calls can instead pass a fixed context, for example `Status({ props: { name: 'Account', active: true } })`. See [Components In-Depth](/guide/components-in-depth) for owner scopes and composition behavior.

## Defaults, validation, and forwarding

Nodula does not provide declared prop schemas, runtime validators, automatic defaults, or Vue-style fallthrough-attribute inheritance. Establish required props and fallback values in component code and validate untrusted inputs at the relevant application boundary:

```html
<template>
  <h2>{{ props.title ?? 'Untitled' }}</h2>
</template>
```

Attributes passed to a component do not automatically appear on its root DOM element. Forward only the values the child intends to expose:

```html
<template>
  <article :class="props.class" :title="props.tooltip">
    {{ props.title ?? 'Untitled' }}
  </article>
</template>
```

See [Fallthrough Attributes](/guide/fallthrough-attributes) for explicit forwarding patterns. For children and named extension points, use [Slots](/guide/slots); for child-to-parent actions, use callback props as described in [Component Events](/guide/component-events).

## Troubleshooting

- **Value is the literal text instead of a boolean/object:** use `:prop="expression"`; unprefixed static attributes are strings.
- **Child output does not react:** read `props.value` inside a reactive template expression, function-valued DOM child, or effect rather than copying it once into an unrelated local variable.
- **Callback is undefined:** `@save` maps to `props.onSave`; verify the event name and invoke it optionally if the callback is not required.
- **Attribute is absent on the child root:** explicitly forward it in the child template. Nodula does not inherit undeclared attributes automatically.
- **Want required/default/type declarations:** implement and document those checks in application code; Nodula currently treats props as runtime values without schema validation.

## Related guides

- [Components Basics](/guide/components-basics) — create and compose components.
- [Components In-Depth](/guide/components-in-depth) — props, slots, callbacks, and ownership.
- [Component Events](/guide/component-events) — callback prop naming and event arguments.
- [Slots](/guide/slots) — default and named content.
- [Fallthrough Attributes](/guide/fallthrough-attributes) — explicit root attribute forwarding.
- Compiler/runtime tests: `framework/vitest/directives.test.js` and `framework/vitest/dom.test.js`.