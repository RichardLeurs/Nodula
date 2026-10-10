# Component Registration

Nodula does not maintain a global component registry. A reusable `.comp` component becomes available to a compiled file when that file imports it; its imported name is then recognized as a component tag in that file's template. This keeps dependencies explicit and avoids runtime registration order for ordinary Nodula components.

## Prerequisites

- Configure the Nodula Vite compiler plugin for `.page` and `.comp` files. See [Tooling](/guide/tooling) and [Single-File Components](/guide/templates).
- Use `.comp` files for reusable template components. `.page` files are page modules and are not recognized as child component tags.
- For JavaScript render functions without single-file templates, import and call the function directly; no tag registration is needed.

## Import and use a component

Create a component module, for example `src/components/CounterCard.comp`:

```html
<script>
import { signal } from 'nodula-framework';

const [count, setCount] = signal(0);
</script>

<template>
  <article class="counter-card">
    <h2>{{ props.title }}</h2>
    <button type="button" @click="setCount(count() + 1)">
      {{ count() }}
    </button>
  </article>
</template>
```

Import it into a `.page` or another `.comp` file and use the local imported name as its tag:

```html
<script>
import CounterCard from './components/CounterCard.comp';
</script>

<template>
  <main>
    <CounterCard title="Clicks" />
  </main>
</template>
```

The component can also receive reactive props, callback props, default child content, and named slots. See [Props](/guide/props), [Component Events](/guide/component-events), and [Slots](/guide/slots) for their exact syntax.

## What the compiler recognizes

The Vite compiler examines imports in each compiled file's `<script>` block. A default import whose module path ends in `.comp` is mapped to its imported identifier, and matching tags are compiled as component calls. Therefore:

- Import a component in every `.page` or `.comp` file whose template uses its tag; imports are file-local, not global.
- The tag name follows the imported identifier, for example `CounterCard` for `import CounterCard from './CounterCard.comp'`.
- Use a statically imported `.comp` component for template component tags. Arbitrary runtime name lookup and a global registration API are not provided.
- The plugin compiles files; it does not render or mount the application. Mount the root component or connect page modules to a router separately.

## Component registration is not route registration

An imported `.comp` is a reusable child component, not a URL. A `.page` module can be imported as an application page or supplied to the optional router, but `.page` modules are not treated as component tags inside templates. The file router discovers supported `.page` route modules from its Vite glob; it rejects `.comp` files as route entries. Keep route pages in the configured route tree and reusable components in an appropriate components directory when using file-based routing.

For app creation and mounting, use [Quick Start](/guide/quick-start). For route maps and file-based route conventions, see [Routing](/guide/routing).

## JavaScript components

JavaScript components are functions returning DOM nodes. Call them from application code or compose them with the runtime's `component(render, readProps, slots?)` helper when a component descriptor is needed:

```js
import { component, h, mount, signal } from 'nodula-framework';

function StatusLabel({ props = {} } = {}) {
  return h('span', {}, () => props.online ? 'Online' : 'Offline');
}

const [online, setOnline] = signal(true);
const status = component(StatusLabel, () => ({ online: online() }));
const dispose = mount('#app', () => h('main', {}, status));

setOnline(false);
// Call dispose() when this mounted view is removed.
```

For most application code, direct function calls and `mount()` are sufficient. `component()` is the lower-level descriptor used for reactive props and slots; it is not a registry. JavaScript APIs and owner cleanup are covered in [Components In-Depth](/guide/components-in-depth).

## Custom elements use a separate registry

When a component must be consumed from plain HTML or another framework, register a browser custom element with `defineCustomElement()`. That uses the browser's `customElements` registry and has different property, attribute, event, and lifecycle behavior than importing a `.comp` file. See [Web Components](/guide/web-components).

## Limitations and troubleshooting

- **Unknown `.comp` extension:** confirm the active Vite config installs `nodulaPlugin()` and the project follows the current compiler availability guidance in [Installation](/guide/installation).
- **Imported tag renders as an ordinary HTML tag:** verify a default `.comp` import exists in that same compiled file and that the template tag matches the imported identifier.
- **Component is not found through an app-wide name:** there is no global component registry; add a local import where the tag is used.
- **`.page` used as a child tag:** page modules are for application/router use. Create a `.comp` for reusable template children.
- **Component import does not create a URL:** configure a route map or file router separately; compilation and routing are separate features.
- **Trying Vue registration syntax:** Nodula does not provide `app.component()`, Options API registration, or Vue's global registry.

## Related guides

- [Components Basics](/guide/components-basics) — function and `.comp` component examples.
- [Components In-Depth](/guide/components-in-depth) — component context, props, slots, and ownership.
- [Single-File Components](/guide/templates) — `.page` and `.comp` structure and compiler syntax.
- [Quick Start](/guide/quick-start) — create and mount an application.
- [Routing](/guide/routing) — explicit routes, file routes, and page/layout modules.
- [Web Components](/guide/web-components) — register components for use outside Nodula.
- Compiler coverage: `framework/vitest/compiler.test.js`; integration coverage: `framework/vitest/directives.test.js`.