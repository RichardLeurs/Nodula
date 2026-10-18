# Component Props

Props are explicit inputs passed from a parent to a child component. Imported `.comp` components receive them through the `props` object in their setup context. Nodula does not require a prop declaration before a value can be passed. A component can optionally declare its props with a schema, which adds types, defaults, and validation. See [Declare a prop schema](#declare-a-prop-schema).

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

A component with a prop schema should declare each callback it calls, such as `onSave: {}`. An undeclared `onSave` is treated as a caller attribute and attached to the root element as a native `save` listener. See [Fallthrough Attributes](/guide/fallthrough-attributes#events-and-callbacks).

## Declare a prop schema

Export a `propSchema` object literal from a `.comp` script to declare the component's props. Each key is a prop name, and each value is an options object. An empty options object declares a prop with no type or validation checks:

```html
<!-- ActionButton.comp -->
<script>
export const propSchema = {
  label: { required: true },
  size: { type: Number, default: 2 },
  items: { default: () => [] },
  variant: { validate: (value) => ['primary', 'quiet'].includes(value) },
  onSave: {},
};
</script>

<template>
  <button type="button" class="btn" @on:click="props.onSave?.(props.label)">
    {{ props.label }} {{ props.size }}
  </button>
</template>
```

Declaring a schema also turns on attribute fallthrough, so undeclared caller attributes reach the root element. See [Fallthrough Attributes](/guide/fallthrough-attributes).

The compiler wraps the component with `withProps` from `nodula-framework/props` and moves the schema to module scope. Components without `propSchema` are unchanged. `propSchema` is valid only in `.comp` files.

### Schema options

| Option | Type | Description |
|---|---|---|
| `type` | Constructor | Checks non-null values. See the type rules below. |
| `required` | `boolean` | Warns when the caller passes `undefined`. `required: true` cannot be combined with `default`. |
| `default` | Value or factory | Used when the caller passes `undefined`. A function is a factory, called once per instance. |
| `validate` | `(value) => boolean` | Warns when it returns a falsy value. It runs untracked, so signals it reads do not re-run the check. |

Prop names start with a letter, `_`, or `$`. The rest may contain letters, digits, `_`, `$`, and `-`, so `aria-label` is a valid name.

### Type rules

| Constructor | Accepts |
|---|---|
| `String`, `Number`, `Boolean`, `BigInt`, `Symbol`, `Function` | Values whose `typeof` matches. Boxed values such as `new String("a")` are rejected. |
| `Array` | Values where `Array.isArray` is true. |
| `Object` | Any non-null object that is not an array, including `Date` and `Map`. |
| Any other class | Values where `instanceof` is true. |

`null` and `undefined` skip the `type` and `validate` checks. Only `undefined` counts as missing for `required` and `default`, so `null` is a value.

Nodula does not coerce values. A string `"3"` passed to a `Number` prop stays a string and produces a warning.

### Defaults

- A static default, such as `size: { default: 2 }`, is used as given.
- A function default, such as `items: { default: () => [] }`, is called once per instance, and the result is kept for that instance. Two instances get separate arrays or objects.
- When `type: Function` is set, a function default is the value itself and is not called.
- An object or array default that is not a factory throws a `TypeError`, so instances do not share it.
- `required: true` with a `default` throws a `TypeError`.

## Warnings

Contract violations are logged with `console.warn` and never thrown, so the component still renders. Warnings are always on. Each distinct message is logged once per component, not once per instance:

```text
[nodula] <ActionButton>: required prop "label" is missing.
[nodula] <ActionButton>: prop "size" expected Number, got string "3"; use :size="3".
[nodula] <ActionButton>: prop "variant" failed its validate check with string "huge".
```

The checks run again whenever the parent changes a declared prop. The component name comes from the function name, so use a named function in JavaScript components; an anonymous render function is reported as `<Component>`.

Malformed schemas are different. `withProps` throws a `TypeError` as soon as the module loads, for example when an option is unknown, a `type` is not a constructor, `required` is not a boolean, or `required` is combined with `default`.

## Function components with withProps

Components written as functions can declare the same schema with `withProps`. The wrapped function receives `props` for declared names and `attrs` for the rest. Nothing is applied to the DOM automatically; call `mergeAttrs` to put caller attributes on an element:

```js
import { component, h, mount } from 'nodula-framework';
import { mergeAttrs, withProps } from 'nodula-framework/props';

const Badge = withProps({ label: { required: true }, size: { type: Number, default: 2 } },
  function Badge({ props, attrs }) {
    return h('span', mergeAttrs(attrs, { className: 'badge' }), () => `${props.label} ${props.size}`);
  });

mount('#app', () => component(Badge, () => ({ label: 'New', class: 'pill' })));
```

`withProps` returns a component that also exposes `propSchema`, the frozen schema. Use `props` for declared values and `attrs` only for values you pass to `mergeAttrs`.

## Add-on API

The `nodula-framework/props` entry exports two functions. Import them from that entry only; `.comp` files import them for you.

```js
import { mergeAttrs, withProps } from 'nodula-framework/props';
```

### withProps(schema, render)

Declares a component's props and returns a component.

| Parameter | Type | Description |
|---|---|---|
| `schema` | `Record<string, PropOptions>` | Options per prop name. See [Schema options](#schema-options). |
| `render` | `(context) => Node` | The component body. Receives `props`, `attrs`, `children`, and `slots`. |

Returns a component that accepts the same context as `render`, plus the read-only `propSchema` property.

- `props` contains only the declared names, with defaults applied. Reading an undeclared name returns `undefined`; read those from `attrs`. Writing to `props` or `attrs` throws a `TypeError`.
- `attrs` contains every other caller prop. Pass it to `mergeAttrs`, or spread it.
- Throws a `TypeError` for a malformed schema or a `render` that is not a function.

### mergeAttrs(attrs, own?)

Returns the props for `h()` that place caller attributes on an element the component renders.

| Parameter | Type | Description |
|---|---|---|
| `attrs` | `Record<string, unknown>` | The `attrs` object from `withProps`. |
| `own` | Element props | Props the component sets on the element itself. Optional. |

Returns `own` unchanged when `attrs` has no keys. The merge rules are listed in [Fallthrough Attributes](/guide/fallthrough-attributes#merge-rules).

## Limits

- Props are read-only. Writing to `props` throws a `TypeError`.
- The schema does not coerce values, so a type mismatch warns and the value is still passed on.
- A `type` takes one constructor. There are no union types; use `validate` for a set of allowed values.
- Prop types are not inferred in TypeScript. `props` is typed as `Record<string, unknown>`.
- Checks run inside one component. The compiler does not check a parent's attributes against a child's schema across files.
- Warnings cannot be turned off, and they never throw.
- Declared names are fixed when the component is created.

## Troubleshooting

- **Value is the literal text instead of a boolean/object:** use `:prop="expression"`; unprefixed static attributes are strings.
- **Child output does not react:** read `props.value` inside a reactive template expression, function-valued DOM child, or effect rather than copying it once into an unrelated local variable.
- **Callback is undefined:** `@save` maps to `props.onSave`; verify the event name and invoke it optionally if the callback is not required.
- **A caller callback fires on the root element:** the component has a schema and does not declare the callback. Add it to the schema, such as `onSave: {}`.
- **Prop is `undefined` but the parent passes it:** the component has a schema and the name is not declared. Caller attributes that are not declared are available in `attrs`, not `props`.
- **Required or type warning:** the parent passed a missing or mistyped value. Fix the call site; the warning names the prop and the value received.
- **Attribute is absent on the child root:** the component has no schema, so nothing falls through. Forward the value explicitly, or declare a schema. See [Fallthrough Attributes](/guide/fallthrough-attributes).
- **Build fails with a `propSchema` error:** the schema must be an object literal in a `.comp` file, and `<script>` may not contain other top-level exports.

## Related guides

- [Components Basics](/guide/components-basics) — create and compose components.
- [Components In-Depth](/guide/components-in-depth) — props, slots, callbacks, and ownership.
- [Component Events](/guide/component-events) — callback prop naming and event arguments.
- [Slots](/guide/slots) — default and named content.
- [Fallthrough Attributes](/guide/fallthrough-attributes) — attribute fallthrough, `@attrs`, and explicit forwarding.
- [Single-File Components](/guide/templates) — `propSchema` and `@attrs` syntax and limits.
- Tests: `framework/vitest/props.test.js` and `framework/vitest/compiler.test.js`.
