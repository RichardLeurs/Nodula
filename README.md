## License

NodulaJS is free software licensed under the
[GNU General Public License v3.0 or later](https://www.gnu.org/licenses/gpl-3.0.html).

Copyright (C) 2026 Richard Leurs.

# Nodula

Nodula is a tiny JavaScript UI framework experiment. It pairs fine-grained signals with small DOM helpers, Vue/Svelte-inspired single-file templates, a hash router, and an optional load-on-visible component. Vite provides the development server and production bundler; the browser runtime has no framework dependency.

When the core framework entry is first loaded, it logs `This app os built with nodulaJS` to the browser console.

For recommended targets, implementation status, and current limitations, see `SPECS.MD`.

## Get started

```sh
npm install
npm run dev
```

The ideas card in the demo is the `IdeasCard` component and persists its list in browser IndexedDB through `createIndexedDBSignal`. It works without a server API; each browser profile has its own ideas. The repository also retains a separate Python/SQLite API example. To run that optional backend, start `npm run dev:api` in a second terminal; Vite proxies `/api` to it. Python 3 is required, but no Python packages or database credentials are needed. The SQLite file is stored beside the API server at `api/ideas.sqlite3` by default (override with `NODULA_DB_PATH=/absolute/path/ideas.sqlite3`). That API has its own data and does not back the home page's ideas card.

The optional Python API exposes `GET /api/info`, `GET /api/ideas`, `POST /api/ideas`, `PATCH /api/ideas/:id`, and `DELETE /api/ideas/:id`. It remains a separate backend example and does not synchronize with IndexedDB. For Hostinger deployment, `api/index.php` and `api/.htaccess` provide a separate PHP/PDO SQLite endpoint. That public demo API has **no authentication or per-user authorization**, so anyone who can reach it can change its shared data; do not use it for private or important data. Run `npm test` for JavaScript and Python API tests, or `npm run test:api` for the Python suite alone.

The demo starts in dark mode. Use the light/dark button in the header to switch themes; your choice is saved in browser storage when available. The toggle also updates the browser theme color and works without the API.

The demo app source is in `src app/`; framework runtime and build-time source is in `src framework/`. The demo build copies `src app/assets/logo-64x64.png` to `dist/assets/logo-64x64.png`, which is used as the page favicon. The shared app shell uses `src app/assets/Leaves-background.png` as a decorative, non-repeating background image positioned at the top right. The image, navigation surface, and theme toggle use light styling in light mode and dark styling in dark mode.

The **Data demo** page at `/data` uses the optional data add-on to fetch and display JSON from JSONPlaceholder. You can enter another CORS-enabled JSON URL and load it directly from the browser; see the [data requests guide](vitepress/docs/guide/data.md) for the client API.

The **Web Components** navigation page demonstrates using Iconify's external `<iconify-icon>` custom element in a `.page` route template with reactive property binding.

The demo app (not the NodulaJS framework runtime) uses Highlight.js to detect JavaScript, HTML, and CSS in code examples, including text inserted after the code element mounts. Highlight.js is a development dependency used to build and test the demo; framework consumers do not need it. Syntax tokens use a readable dark-mode palette and darker light-mode colors; unclassified code text retains the shared global `--green` color.

## VS Code syntax highlighting

The `vscode-nodula/` folder contains a small local VS Code language extension for `.page` and `.comp` files. It embeds JavaScript in `<script>`, HTML in `<template>`, and CSS in `<style>`, using the colors from the active VS Code theme (so a Vue-like color palette comes from your selected theme).

The extension manifest is `vscode-nodula/package.json` (not the repository's root `package.json`). Simply adding `contributes.languages` and `contributes.grammars` to a package file does not load an extension in your existing VS Code window. The workspace does not force `.page` or `.comp` file associations: that would label the files as Nodula without loading its grammar.

To try it from this repository, open the repository root as your VS Code workspace, go to **Run and Debug**, choose **Run Nodula Language Extension**, and press **F5**. This launches a **new Extension Development Host window** with the local extension loaded; open a `.page` or `.comp` file in that new window. Check the language indicator in the bottom-right corner: it should say **Nodula**. The matching launch configuration lives in `.vscode/launch.json`.

To use the extension in your **regular** VS Code window, package and install it (from the repository root):

```sh
cd vscode-nodula
npx --yes @vscode/vsce package --allow-missing-repository --skip-license
code --install-extension nodula-language-0.1.0.vsix
```

The extension has no repository URL or license yet, so the packaging flags bypass those checks for local use. The `.vscodeignore` file excludes generated VSIX files from the package. Before publishing or distributing the extension, add an accurate repository URL and choose a license rather than relying on those flags.

If `code` is not on your PATH, select **Extensions: Install from VSIX...** in the Command Palette and choose `vscode-nodula/nodula-language-0.1.0.vsix`. After installing, reload the regular VS Code window and reopen a `.page` or `.comp` file. Changes to the extension files require rebuilding/reinstalling the VSIX (or relaunching the Extension Development Host).

Opening the extension's `package.json` and pressing F5 alone does not reliably launch it: VS Code expects a workspace debug configuration. Alternatively, package/install the extension into your regular VS Code instance to highlight `.page` and `.comp` files there.

Create a production build with `npm run build`, preview it with `npm run preview`, and run the tests with `npm test`.

The framework and demo app have separate Vite builds. The app's Vite config remains at the project root as `vite.config.js`; framework and add-on build configs live in `config/`. `npm run build:framework` compiles the core runtime from `src framework/` to `dist/framework/nodula-framework.js` and copies its declarations to `dist/framework/nodula-framework.d.ts`, then builds the optional add-ons; each add-on build emits its own declaration file. Vite uses Lightning CSS to minify bundled CSS, and the copied framework stylesheet is minified during the framework build. `npm run build:app` builds only the demo app from `src app/` and requires the framework bundles to exist first. `npm run build` runs the framework and app builds, type-checks the emitted declarations, and creates an installable framework tarball in `dist/`. Use `npm run package:framework` to build and package only the framework, or `npm run pack:framework` to pack already-built framework files. The tarball includes the package manifest, README, license, runtime/add-on entries, declarations, and shared CSS; it excludes the demo app and its Highlight.js dependency. `npm pack --dry-run` previews the files that would be included. App and lazy `.page` chunks import `nodula-framework` for core APIs and the separate `nodula-framework/form`, `nodula-framework/router`, `nodula-framework/animation`, and `nodula-framework/dialog` entries for optional features. These resolve to `/framework/nodula-framework.js`, `/framework/nodula-form.js`, `/framework/nodula-router.js`, `/framework/nodula-animation.js`, and `/framework/nodula-dialog.js`. The add-ons import the core package externally, avoiding a second runtime instance. The `.page` compiler and Vite plugin live in `src framework/`; they are build-time Node modules and are not included in the browser bundles. `npm run dev` builds the core and add-ons before starting Vite.

TypeScript is optional. JavaScript remains the framework implementation and requires no TypeScript runtime dependency. Core API declarations live in `src framework/index.d.ts`; add-on declarations live under `src framework/addons/`. The builds copy them beside each bundle. TypeScript projects can import each package entry and pick up its adjacent declaration. `npm test` checks the source declarations; `npm run build` also checks the emitted bundle declarations. TypeScript is a development-only dependency. `.page` and `.comp` `<script setup>` blocks remain JavaScript-only.

Framework-provided dialog, modal, and drawer styles are collected in `framework/assets/nodula-framework.css` and published as the optional `nodula-framework/nodula-framework.css` stylesheet. The framework build copies it to `dist/framework/nodula-framework.css`. Import it once from your application entry (for Vite, `import 'nodula-framework/nodula-framework.css';`) to style those add-ons. Their JavaScript entries do not inject styles automatically. Styles written in your own `.page` files remain handled by the `.page` compiler and are not part of this shared stylesheet. You may override the shared rules in your app's CSS.

## Framework API

```js
import { computed, effect, h, mount, signal, Nodula } from 'nodula-framework';

Nodula.css('/assets/app.css');

const [count, setCount] = signal(0);
const doubled = computed(() => count() * 2);

function App() {
  return h('button', {
    onClick: () => setCount((value) => value + 1),
  }, () => `Count ${count()} · doubled ${doubled()}`);
}

mount('#app', App);
```

- `signal(value)` returns a getter and setter. Setters also accept updater functions.
- The optional store add-on is imported with `import { createStore } from 'nodula-framework/store'`. It returns a reactive proxy for a plain object or array. Nested plain objects and arrays update effects, computed values, and DOM bindings when read properties change. Property reads, key enumeration, and `in` checks are tracked; array mutators notify after their operation completes. Effects created inside a `createRoot` still stop on disposal; the store itself has no separate disposal step. Class instances, `Map`, and `Set` remain ordinary values.
- The optional form add-on is imported separately with `import { createForm } from 'nodula-framework/form'`. It returns reactive `values`, `errors`, and `touched` stores plus `dirty`, `valid`, `submitting`, and `submitted` accessors. Supply `validate(values)` to return field error messages and `onSubmit(values, event)` for an optional async submit callback. Use `handleChange(field)` and `handleBlur(field)` as native event handlers, `setFieldValue` / `setFieldTouched` for direct updates, `validate()` to validate all fields, and `reset()` to restore the initial values and clear form status. Form values should contain plain objects, arrays, and primitive values.
- `computed(fn)` returns a read-only getter derived from tracked signals.
- `effect(fn)` runs immediately, then reruns when a signal read inside it changes. It returns a stop function.
- `createRoot(fn)` scopes effects and cleanup callbacks; it returns the callback result and a disposer.
- `onCleanup(fn)` registers work to run when the current root or effect run is disposed.
- `Nodula.css(url)` adds a global stylesheet link once. It can be called from the app entry or a `.page` or `.comp` `<script setup>` block; these files automatically import `Nodula` when they use this helper. In Vite apps, use an asset URL import when the CSS lives under `src/` (for example, `import appCss from './assets/app.css?url'; Nodula.css(appCss);`) or place URL-addressable CSS in the public directory.
- `h(tag, props, ...children)` creates a DOM element. Function children and function-valued props are reactive; `onClick`, `onInput`, and similar `on…` props register DOM listeners.
- Custom tags such as `h('data-panel', { record: () => record(), 'on:selection-change': handler })` receive reactive values as properties, preserving object values, and support dashed custom event names. Static values remain attributes; append `.prop` to a binding name to force property assignment.
- `defineCustomElement(name, component, { props, events, shadow })` registers a Nodula component with the browser's custom-elements registry. Listed props reflect to kebab-case attributes (attributes are strings; object property values remain property-only), listed callback props dispatch bubbling/composed custom events, and the component's reactive root is disposed on disconnect. `shadow` defaults to `'open'`; use `false` to render into the host. The helper is also available as `Nodula.defineCustomElement(...)`.
- Function children reconcile compatible element trees in place on updates. Unkeyed descendants match by position, keyed template rows by key; incompatible nodes are replaced. Owned reactive props and event listeners follow the reused elements.
- `.page` and `.comp` files use `<script setup>`, one-root `<template>`, and an optional `<style>` block. Plain `<style>` remains global; `<style scoped>` adds a component-specific attribute to template elements and scopes CSS selectors (including rules inside media queries) to those elements. Keyframe selectors remain unchanged. Templates support imported `.comp` component tags with static or `:` reactive props, native event callbacks, default child content, and named slots via `<template #heading>`. Components receive `props`, `children`, and `slots` in their setup context. Templates also support `{{ expression }}` text interpolation, `:attribute="expression"` reactive attributes, native events via `@click`, `on:event`, or `@on:click`, keyed rows with `@for="item of items()" :key="item.id"`, `@if` / `@else`, `@show`, `@ref`, `<slot @slot="name">`, `@bind` / `bind:value`, and a `use:visibleIsland` action. The existing `each="item of items()" :key="item.id"` syntax remains supported. The Vite plugin compiles these files to the same DOM helpers; it is not a full Vue or Svelte compiler.
- `@show="visible()"` hides an element with `display: none` without removing it; `@ref="setElement"` calls the callback with the element and later `null` when its owner is disposed. `@on:click="handler($event)"` is explicit native event syntax with listener cleanup.
- Two-way form binding requires an explicit signal getter and setter: `@bind="draft, setDraft"` chooses `value` (or `checked` for a checkbox); `@bind:value="draft, setDraft"` and `bind:value="draft, setDraft"` bind text-like inputs, textareas, or selects. Use `@bind:checked` / `bind:checked` for checkbox or radio inputs. Only one binding per element is supported; do not combine it with `:value` or `:checked`.
- `slot(slots, name, fallback)` backs `<slot @slot="header">fallback</slot>` and the default `<slot>fallback</slot>`. For imported `.comp` component tags, pass content with `<Panel title="Static" :active="isActive()"><p>Default body</p><template #header><h2>Title</h2></template></Panel>`. The child reads `props.title`, receives the default content as `children`, and named content as `slots.header`. Slot content belongs to the rendered component's lifecycle.
- `when(condition, yes, no?)` is the DOM helper behind `@if` / `@else`. Only the active branch is mounted; switching branches disposes its effects and event listeners. Optional `<template @if>` / `<template @else>` wrappers render multiple sibling nodes without a wrapper element.
- `mount(target, component)` mounts a component and returns an unmount function.
- `list(readItems, key, render)` creates a keyed list and preserves row node identity as items move.
- The optional router add-on is imported with `import { createRouter, createFileRouter } from 'nodula-framework/router'`. `createRouter(routes, fallback, options)` provides `current`, `view()`, and `navigate(path)`. Hash navigation remains the default; `{ mode: 'history' }` reads the pathname, uses `pushState` / `popstate`, and intercepts ordinary same-origin links. It leaves external, modified-click, download, new-window, and same-page anchor links to the browser.
- The optional navigation add-on is imported from `nodula-framework/navigation`. `mountNavigation(target, router, items, options)` creates a semantic `<nav>` with mode-aware internal links, explicitly external HTTP(S) links (`{ label, href, external: true }`), reactive active state for internal routes, and returns a disposer. External links open in a new tab with `noopener noreferrer` by default; set `target: '_self'` to open in the current tab.
- The optional browser persistence add-on is imported from `nodula-framework/localstorage`. `createStorageSignal(key, initialValue, { storage? })` persists JSON in localStorage; `createIndexedDBSignal(key, initialValue, { indexedDB?, databaseName? })` provides async IndexedDB hydration and persistence and returns a signal pair with a `ready` promise and an `available` flag (check after `ready`). `getCookie`, `setCookie`, and `deleteCookie` read, write, and expire URI-encoded browser cookies with common cookie attributes. JavaScript cannot set `HttpOnly`; do not store secrets in script-readable cookies or use browser storage for authorization.
- The optional data add-on is imported from `nodula-framework/data`. `createDataClient({ baseURL, headers, fetcher })` returns `fetch`/`request` and `get`, `post`, `put`, `patch`, and `delete` helpers. It appends query parameters, JSON-serializes plain object and array bodies, parses JSON or text responses, and throws `DataError` for non-success HTTP responses with the parsed response body available as `error.data`. Network errors are propagated unchanged; authentication and retry behavior are left to the app.
- The optional PWA Vite add-on is imported from `nodula-framework/pwa`. Install `vite-plugin-pwa` in the app and add `...nodulaPWA({ manifest: { ... } })` to its Vite `plugins` list; the demo enables `...nodulaPWA()` in `vite.config.js`. It generates the manifest/service worker and precaches build assets; API runtime caching remains opt-in. The default update mode is `prompt` and dev service workers are disabled unless explicitly enabled.
- The optional animation add-on is imported from `nodula-framework/animation`. Call `enableLifecycleTransitions()` inside the app root to animate page `<outlet>` changes, `@if` / `@else` branches, and keyed `@for` / `each` rows. Leave nodes remain until their Web Animations API leave animation finishes; reduced-motion preferences are respected by default.
- The optional dialog add-on is imported from `nodula-framework/dialog`. `showDialog(message, { title, cancelText, okText })` displays a native confirmation dialog and resolves to `false` or `true`; the title is optional, button labels default to Cancel/OK, and Escape, backdrop dismissal, and owner cleanup resolve to `false`.
- The optional notifications add-on is imported from `nodula-framework/notifications`. `showNotification({ type, title, message, position, duration })` displays error, success, warning, or info notifications with a dismiss control; position defaults to `top-right`, duration defaults to 5000 ms, and `duration: 0` disables auto-dismiss. It returns `{ element, close, closed }` and closes when its owning Nodula root is disposed.
- The optional modal add-on is imported from `nodula-framework/modal`. `openModal(content, { title, closeText, closeOnBackdrop })` opens a native modal window and returns `{ element, close, closed }`; content may be safe text or a DOM node, and backdrop dismissal is enabled by default but can be disabled with `closeOnBackdrop: false`.
- The optional side-drawer add-on is imported from `nodula-framework/drawer`. `openDrawer(content, { title, closeText, closeOnBackdrop, position })` opens an accessible modal side panel from the left or right (right by default) and returns `{ element, close, closed }`; backdrop dismissal is enabled by default and can be disabled with `closeOnBackdrop: false`.
- `createFileRouter(files, fallback, options)` derives routes from Vite `import.meta.glob` page modules and accepts the same router options; `routes/index.page` maps to `/`, `routes/guide.page` to `/guide`, and `routes/ideas/[id].page` to `/ideas/:id`. Parameters are decoded and passed to page and layout components as `params`; static routes win over parameterized routes. A `layout.page` in a route folder wraps its descendant pages (root layouts wrap all routes), receiving `children` for its `<outlet :view="children" />`. Lazy glob loaders fetch only the matched page and its layouts, show `Loading page…` while loading, show `Could not load this page.` on failure, and cache successful imports. Eager modules (`{ eager: true }`) and manual route maps remain supported.
- `visibleIsland(loader, placeholder)` defers calling a dynamic-import loader until its placeholder is visible (or loads immediately when `IntersectionObserver` is unavailable).

## Store example

```js
import { effect } from 'nodula-framework';
import { createStore } from 'nodula-framework/store';

const state = createStore({ user: { name: 'Nodula' }, items: [] });
const stop = effect(() => console.log(state.user.name, state.items.length));

state.user.name = 'World';
state.items.push('Idea');
stop();
```

The store is an optional add-on and is not included in the core runtime entry unless imported.

## Form example

```js
import { createForm } from 'nodula-framework/form';

const form = createForm({ email: '', updates: false }, {
  validate: (values) => values.email.includes('@') ? {} : { email: 'Enter a valid email.' },
  onSubmit: async (values) => saveProfile(values),
});

// In a component, bind these handlers to the corresponding native events.
input.addEventListener('input', form.handleChange('email'));
input.addEventListener('blur', form.handleBlur('email'));
await form.handleSubmit(submitEvent);
```

`handleSubmit` prevents the native submission, marks fields touched, validates, and calls `onSubmit` only when valid. It resolves to `true` after a successful callback or `false` when invalid or already submitting; callback errors are rethrown after `submitting` is reset.

## File-based routes in the example app

Place route pages in `src app/routes/` using `.page`, and reusable components outside that directory using `.comp`. The app uses `createFileRouter(import.meta.glob('./routes/**/*.page'), undefined, { mode: 'history' })` from `nodula-framework/router` in `src app/AppShell.comp`. Vite discovers pages at build time and splits lazy pages and layouts into on-demand chunks; the example app includes `/guide`, `/form`, and `/ideas/1`. The `/form` page demonstrates `createForm` validation, touched fields, async submission, reactive status, and reset. `src app/routes/ideas/[id].page` reads `params.id`, and `src app/routes/ideas/layout.page` wraps it with `<outlet :view="children" />`. Navigation to another route or unmounting prevents pending loads from rendering stale content. Route parameters match one path segment; catch-all segments are not supported. **Production servers must serve `index.html` for unknown page paths** so direct visits and refreshes of history URLs can load the client router; Vite's dev and preview servers support SPA fallback.

## Template example

```html
<script setup>
import { signal } from 'nodula-framework';
const [count, setCount] = signal(0);
</script>

<template>
  <button class="counter" @click="setCount(count() + 1)">
    Clicked {{ count() }} times
  </button>
</template>

<style>
.counter { color: seagreen; }
</style>
```

Conditional branches must be inside the component's single template root; `@else` must immediately follow its `@if`, apart from whitespace:

```html
<template>
  <div>
    <p @if="connected()">Connected</p>
    <p @else>Start the API to connect.</p>
  </div>
</template>
```

Keyed loops use `@for` on an element and require `:key`; items are reactive accessors inside the row (use `item()` or `item.name` in expressions). Existing `each` templates use the same keyed runtime:

```html
<template>
  <ul>
    <li @for="item of items()" :key="item.id">{{ item.name }}</li>
  </ul>
</template>
```

## Intentional limits

Nodula is a small client-side starting point, not a replacement for the full Vue, Next/Nuxt, Solid, Svelte, or Astro toolchains. The `.page` compiler intentionally supports only a small template subset; it currently has no component tags, arbitrary two-way binding expressions, JSX, server rendering, hydration, catch-all file-based routes, automatic template-driven transitions, or accessibility automation. The optional animation add-on provides explicit Web Animations API helpers.