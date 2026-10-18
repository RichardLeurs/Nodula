# Components

Nodula components are JavaScript functions that return DOM nodes. Imported `.comp` files compile to component functions and use the same runtime ownership model. This guide explains how props, callbacks, slots, reactive state, and cleanup fit together; see [Components Basics](/guide/components-basics) for the first runnable examples.

## Purpose and scope

Use components to divide an interface into reusable pieces with clear inputs and content extension points. Nodula does not use a global component registry: import a `.comp` module where it is used, or call a JavaScript component function from application code. `.page` files are page modules, not child component tags.

The model has three main parts:

- **Render function:** returns a DOM `Node`; a component does not return an HTML string for insertion.
- **Component context:** optional context carries `props`, `children`, `slots`, and, for routed pages/layouts, `params`.
- **Owner scope:** runtime bindings and nested component work are disposed when their rendered owner is removed.

## Prerequisites

- JavaScript components need the `nodula-framework` runtime.
- `.comp` files additionally need the Nodula Vite compiler plugin and its supported file setup. See [Single-File Components](/guide/templates) and [Tooling](/guide/tooling).
- For route context and layout composition, see [Routing](/guide/routing).

## Component execution and ownership

Nodula components are ordinary functions. A direct JavaScript component can create local signals and return DOM nodes:

```js
import { h, mount, onCleanup, signal } from 'nodula-framework';

function Counter({ props = {} } = {}) {
  const [count, setCount] = signal(props.initialCount ?? 0);
  const button = h('button', {
    type: 'button',
    onClick: () => setCount((value) => value + 1),
  }, () => `${props.label ?? 'Count'}: ${count()}`);

  onCleanup(() => console.log('Counter owner disposed'));
  return button;
}

const dispose = mount('#app', () => Counter({ props: { initialCount: 2 } }));
// Later, when this view is no longer needed:
dispose();
```

`mount()` creates an owner root and returns its disposer. Component DOM bindings, event listeners, refs, nested components, and effects created within the owner are cleaned up when that owner is disposed. A nested component rendered inside a conditional branch or keyed row is disposed when that branch or row is removed. `onCleanup()` registers cleanup in the current owner/effect scope; use root-only lifecycle hooks such as `onMount()` and `onUnmount()` in a root scope, not inside an effect.

For imported components, the runtime creates a child scope, calls the component with its context, and ties that scope's disposal to the parent's DOM owner. Avoid retaining or interacting with child DOM after its owning branch/root is removed.

## Props and reactivity

Imported `.comp` tags pass static attributes and reactive `:` expressions as props. Event-like component attributes are passed as callback props. In the child, read them from the `props` object:

```html
<!-- Parent.comp -->
<script>
import ProfileCard from './ProfileCard.comp';
import { signal } from 'nodula-framework';

const [title, setTitle] = signal('Account');
const [saved, setSaved] = signal('Not saved');
</script>

<template>
  <ProfileCard :title="title()" @save="setSaved($event)">
    <p>Card body</p>
  </ProfileCard>
  <button type="button" @click="setTitle('Updated account')">Update title</button>
  <output>{{ saved() }}</output>
</template>
```

```html
<!-- ProfileCard.comp -->
<template>
  <section>
    <h2>{{ props.title }}</h2>
    <button type="button" @click="props.onSave(props.title)">Save</button>
    <slot />
  </section>
</template>
```

The compiler supplies a reactive props object, so a reactive parent binding updates the child's reads. The `@save` syntax is callback passing: the parent callback becomes `props.onSave`; it is not a separate event-emitter registry. For JavaScript component calls, supply context explicitly, for example `Card({ props: { title: 'Account' } })`.

Prop schemas with defaults and validation, and attribute fallthrough, are opt-in through the `nodula-framework/props` add-on: a component declares `export const propSchema`. Components without a schema receive every attribute as a prop. Nodula has no component `v-model`. See [Props](/guide/props) and [Component Events](/guide/component-events).

## Default and named slots

Parent child markup becomes default slot content. A child can render it with `<slot>` and provide fallback markup. Named slots use a `<template #name>` at the call site and `<slot @slot="name">` in the child:

```html
<!-- Parent -->
<Panel>
  <p>Main content</p>
  <template #heading><h2>Settings</h2></template>
</Panel>
```

```html
<!-- Panel.comp -->
<template>
  <section>
    <header><slot @slot="heading"><h2>Untitled</h2></slot></header>
    <main><slot><p>No content supplied.</p></slot></main>
  </section>
</template>
```

In a JavaScript component, the equivalent context is `children` plus a `slots` object. Slot entries may be nodes or functions; compiled slot content is supplied as functions and rendered with the component. Slot content is owned by the rendered component lifecycle. See [Slots](/guide/slots) for supported syntax and fallback details.

## Routed pages and layouts

The router calls page components with `{ params }`; layout components receive the matched params and their rendered child through `{ children }`. A template page can read `params.id`; a layout renders its child with `<outlet :view="children" />`. This context is specific to routing—ordinary component props do not automatically contain route params. See [Routing](/guide/routing) for route matching and layout setup.

## Common composition patterns

- Keep state local when one component owns it. Lift a signal to a parent or shared store when sibling components must coordinate.
- Pass values down as props and pass actions back up as callback props.
- Use slots for caller-owned content inside a reusable structural component; use named slots for stable extension points such as `heading` or `actions`.
- Keep native DOM events on native elements. Component event attributes are callback props invoked by child code.
- Make owner boundaries explicit when mounting imperatively. Keep and call the disposer returned by `mount()` when that mounted view is removed.
- Prefer semantic native HTML inside components; composition does not provide automatic accessibility behavior.

## Limitations and troubleshooting

- **Imported component tag is treated as an element:** import the `.comp` module in the compiled file. There is no global registry or arbitrary runtime tag lookup.
- **`.page` does not work as a child component tag:** pages are page modules; use `.comp` for imported template child components or call a JavaScript component function.
- **Prop did not update:** pass reactive template values with `:prop="expression"`; static attributes remain static strings. Read values through `props` in the child.
- **Child action did not reach parent:** pass a callback with component event syntax (for example `@save="handleSave($event)"`) and call `props.onSave(...)` from the child.
- **Slot content is missing:** ensure named slot names match exactly, and place default children or `<template #name>` inside the imported component tag.
- **Cleanup did not run:** register cleanup while the component is being rendered within an owner scope. `onCleanup()` called outside a root/effect throws; `onMount()` and `onUnmount()` require a root scope.
- **Compiler rejects Vue-style syntax:** `.comp` templates implement Nodula's documented subset, not full Vue/Svelte semantics; `<script>` is JavaScript-only.

## Related guides

- [Components Basics](/guide/components-basics) — first function and `.comp` components.
- [Single-File Components](/guide/templates) — compiler syntax and file structure.
- [Registration](/guide/registration) — import-based component use.
- [Props](/guide/props), [Component Events](/guide/component-events), and [Slots](/guide/slots) — focused input/content APIs.
- [Reactivity and DOM](/guide/reactivity) — signals, effects, and ownership.
- [Lifecycle Hooks](/guide/lifecycle-hooks) — mount and cleanup lifecycle.
- Component integration tests: `framework/vitest/directives.test.js`; runtime lifecycle tests: `framework/vitest/dom.test.js`.