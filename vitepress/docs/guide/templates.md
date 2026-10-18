# Single-File Components

Nodula single-file components put component logic, template, and optional styles in one `.page` or `.comp` file. Use `.page` for route-level screens and `.comp` for reusable components. A Vite compiler turns these files into calls to Nodula's runtime; it is separate from the runtime and from the router.

## Prerequisites

- A Vite application configured with Nodula's `nodulaPlugin()` for `.page` and `.comp` files.
- Core runtime imports from `nodula-framework` for state and lifecycle helpers.
- Familiarity with [Reactivity and DOM](/guide/reactivity) and [Quick Start](/guide/quick-start).

**Repository boundary:** The Vite compiler is implemented in this checkout as `framework/vite-plugin.js`. `nodula-framework/vite` is a public package entry in package declarations/build output, but a fresh external setup should follow [Installation](/guide/installation) for the current compiler availability and installation limitations.

## Core concepts

- **`.page`:** page module that can be imported directly or supplied to the optional file router. The compiler does not itself register routes.
- **`.comp`:** reusable component module imported by a page or another compiled component.
- **`<script>`:** JavaScript evaluated as component setup. Values and functions declared here can be referenced by that file's template. TypeScript syntax is not supported by this compiler.
- **`<template>`:** one root element containing supported markup and directives.
- **`<style>`:** optional CSS; plain styles are global, `<style scoped>` scopes selectors to this component's rendered elements, and `<style module>` exposes Vite-generated local classes through `$style`.
- **CSS Modules:** `<style module>` is the inline SFC form. External `.module.css` imports through Vite also remain supported and expose their imported class map.
- **Top-level comments:** HTML comments (`<!-- … -->`), `//` line comments and blank lines may appear between the blocks, for example a copyright notice. Any other top-level content is a compile error. A `//` comment should not contain `<`, because the HTML parser reads it as a tag.

### CSS Modules in an SFC

Use fixed `$style` mapping in template expressions:

```html
<template>
  <button :class="$style.primary">Save</button>
</template>

<style module>
.primary { color: royalblue; }
</style>
```

Vite generates local class names and handles CSS Modules processing. An SFC supports one style block; `module` cannot be combined with `scoped`, and `<style module="customName">` is unsupported. For details and external `.module.css` imports, see [Styles and CSS Modules](/guide/styles).

For global imports, scoped blocks, CSS Module setup, and guidance on choosing between them, see [Styles and CSS Modules](/guide/styles).

## Quick start

Create `Counter.comp`:

```html
<script>
import { signal } from 'nodula-framework';

const [count, setCount] = signal(0);
</script>

<template>
  <button class="counter" type="button" @click="setCount(count() + 1)">
    Clicked {{ count() }} times
  </button>
</template>

<style scoped>
.counter { font: inherit; }
</style>
```

Import the component into a page:

```html
<script>
import Counter from './Counter.comp';
</script>

<template>
  <main>
    <h1>Counter page</h1>
    <Counter />
  </main>
</template>
```

Mount the page from the app entry using core `mount()`:

```js
import CounterPage from './CounterPage.page';
import { mount } from 'nodula-framework';

const unmount = mount('#app', CounterPage);
```

See [Quick Start](/guide/quick-start) for the HTML mount point and Vite development setup.

## How it works

The Vite plugin recognizes `.page` and `.comp`, compiles the template into Nodula DOM calls, and emits JavaScript for Vite to bundle. Reactive expressions connect to core signals and owner scopes. When a component is mounted, its effects and DOM listeners belong to the mounted root and are cleaned up when that root is disposed.

Compilation is not routing: import a page or use the optional `createFileRouter()` API to connect pages to URLs. Likewise, `.comp` imports provide reusable component composition; they do not create a global component registry.

## Supported template patterns

### Text, attributes, and events

```html
<template>
  <button :class="active() ? 'tab tab--active' : 'tab'" @click="select()">
    {{ label() }}
  </button>
</template>
```

- Interpolate text with `{{ expression }}`.
- Bind reactive attributes with `:attribute="expression"`.
- Handle native events with `@click="handler()"`, `on:click="handler()"`, or `@on:click="handler($event)"`.
- Event expressions call JavaScript functions in the setup scope. Use safe text bindings for untrusted content; templates do not turn interpolated text into HTML.

### Conditional rendering and visibility

```html
<template>
  <p @if="connected()">Connected</p>
  <p @else>Not connected</p>
  <aside @show="helpVisible()">Help stays mounted while hidden.</aside>
</template>
```

`@else` must immediately follow its `@if` branch, apart from whitespace. Conditional branches mount only while active; `@show` hides with display styling without removing the element.

### Keyed lists

```html
<template>
  <ul>
    <li @for="item of items()" :key="item.id">{{ item.name }}</li>
  </ul>
</template>
```

Every row needs a unique stable key. The row item is reactive; the compiler supports property reads such as `item.name` and accessor calls such as `item().name`. The legacy `each="item of items()" :key="item.id"` form is also supported. `@for` cannot share one element with `@if`, `@else`, or `each`.

### Input bindings and element refs

```html
<template>
  <label>
    Name
    <input @bind:value="name, setName" @ref="setNameInput" />
  </label>
</template>
```

Bindings support `value` and `checked`, using `input` and `change` events respectively. Accepted forms include `@bind="getter, setter"`, `@bind:value="getter, setter"`, and `@bind:checked="getter, setter"`. `@ref="callback"` passes the rendered element to the callback and later passes `null` when its owner is disposed.

### Reusable components, props, and slots

Import `.comp` files and use their component tags in a template. Imported components receive declared attributes as props, child markup as default slot content, and named `<slot name="...">` content as named slots. See [Components Basics](/guide/components-basics), [Props](/guide/props), and [Slots](/guide/slots) for details.

### Prop schemas and `@attrs`

A `.comp` can declare its props in its `<script>` with an `export const propSchema` object literal. Each entry may set `type`, `required`, `default`, and `validate`:

```html
<!-- Badge.comp -->
<script>
export const propSchema = {
  label: { required: true },
  size: { type: Number, default: 2 },
};
</script>

<template>
  <span class="badge">{{ props.label }} {{ props.size }}</span>
</template>
```

With a schema, attributes the component does not declare fall through to its root element. Mark a different element with `@attrs` to receive them instead. `@attrs` takes no value and requires a schema:

```html
<template>
  <section class="card">
    <button type="button" @attrs>{{ props.label }}</button>
  </section>
</template>
```

Components without `propSchema` do not forward attributes. `propSchema` is valid only in `.comp` files. See [Props](/guide/props) for schema options and warnings, and [Fallthrough Attributes](/guide/fallthrough-attributes) for the merge rules.

### Deferred content

`use:visibleIsland="visibleIsland(loader)"` can defer loading a component until its placeholder enters the viewport. The directive evaluates `visibleIsland` in the component's scope, so import it from `nodula-framework/island` in the `<script>`:

```html
<script>
import { visibleIsland } from 'nodula-framework/island';

const loadCard = async () => (await import('./Card.comp')).default;
</script>

<template>
  <div use:visibleIsland="visibleIsland(loadCard, 'Loading card…')"></div>
</template>
```

The loader must resolve to a component function, so return `module.default` rather than the module object. If `IntersectionObserver` is unavailable, loading starts immediately. See [Async Components](/guide/async-components) for the loader contract and [Performance](/guide/performance) for when deferral is useful.

## Limitations and troubleshooting

- Each file requires exactly one `<template>` block with exactly one root element. Group siblings under an element or supported `<template>` directive.
- `@show` and `@ref` only apply to elements; the compiler rejects them on imported component tags. Wrap the component in an element, or pass the value as a prop.
- `<script>` is JavaScript, not TypeScript. JSX, arbitrary component resolution, arbitrary two-way bindings, and full Vue/Svelte template compatibility are not provided.
- `propSchema` must be an `export const` object literal in a `.comp`; other top-level exports in `<script>` are rejected. A malformed schema throws when the module loads.
- `@attrs` takes no value and needs `propSchema` in the same file. Only one element or component tag per component can have it. It cannot be on `<slot>`, `<template>`, or `<outlet>`, or inside a loop (`@for` or `each`).
- A component with `propSchema` needs an element or component root, unless an element is marked `@attrs`. A text root or an `<outlet>` root is a compile error without `@attrs`.
- Vite must load the Nodula compiler plugin for these file extensions. If Vite reports an unknown `.page` or `.comp` import, verify plugin setup before debugging runtime code.
- A page file is not automatically a route. Register it in a router or use the optional file router.
- Scoped styles are scoped to rendered component elements, not a Shadow DOM boundary. Use custom elements when an actual web-component boundary is required.
- Browser runtime currently has no server-side rendering or hydration. Initial HTML and metadata therefore require separate prerendering/server rendering if needed before JavaScript runs.

## Related guides

- [Quick Start](/guide/quick-start) — install/run demo, create root, and mount.
- [Routing](/guide/routing) — connect page modules to URL paths.
- [Components In-Depth](/guide/components-in-depth) — component behavior and composition.
- [Specifications and Limits](/guide/specifications) — compiler and runtime boundaries.
- Compiler tests: `framework/vitest/compiler.test.js`; plugin tests: `framework/vitest/vite-plugin.test.js`.