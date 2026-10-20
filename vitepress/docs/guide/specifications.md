# Specifications and Limits

**Status:** normative description of the current framework architecture and public behaviour. NodulaJS is in alpha. "Implemented" means the capability exists in the current source and public API; it does not imply support in every browser, deployment, or bundler. An "unverified target" is not a compatibility or release promise.

**Scope:** contracts, guarantees, and limits per subsystem. Option-level detail lives in each guide and in the declaration files under `framework/`. Styling conventions are in the [NodulaUI Specification](/guide/nodula-ui-specification).

**Notation:** each subsystem lists its **Contract** (what it does), **Guarantees** (what is specified and tested, with the covering suite in `framework/vitest/`), and **Limits** (what it does not do). Section 9 collects every limit in one list.

## At a glance

Applications import public package entries, never internal source files. Add-ons that depend on core externalize the core entry so consumers share one reactive runtime. Optional features stay outside the core entry.

| Entry | Provides | Guide |
|---|---|---|
| `nodula-framework` | Reactivity, ownership, DOM creation and rendering, components, error boundaries. | [Framework Core](/guide/framework-core), [Reactivity](/guide/reactivity) |
| `nodula-framework/island` | `visibleIsland`: defers a component until its placeholder is visible. | [Async Components](/guide/async-components) |
| `nodula-framework/web-components` | `defineCustomElement` registers a Nodula component as a native custom element, with typed props, opt-in attribute reflection and form-associated elements; `Nodula.css` loads a stylesheet once. | [Web Components](/guide/web-components) |
| `nodula-framework/vite` | Build-time Vite plugin for `.page` and `.comp` files. | [Single-File Components](/guide/templates), [Styles](/guide/styles) |
| `nodula-framework/router` | Hash and History routing, guards, explicit and file routes, lazy loading, load-failure handling. | [Routing](/guide/routing) |
| `nodula-framework/navigation`, `navigation-dropdown` | Router-aware navigation links; optional disclosure menu. | [Navigation](/guide/navigation), [Navigation dropdown](/guide/navigation-dropdown) |
| `nodula-framework/store` | Deep reactive plain objects and arrays. | [Store](/guide/stores) |
| `nodula-framework/form` | Values, validation, touched state, submission, reset, per-field helpers with stable IDs and ARIA attributes. | [Forms](/guide/forms) |
| `nodula-framework/resource` | Async resources with loading state, refetch, cancellation and stale-response handling. | [Async Resources](/guide/resource) |
| `nodula-framework/suspense` | A fallback while resources load for the first time. | [Suspense](/guide/suspense) |
| `nodula-framework/props` | `withProps` prop schema (types, defaults, validators, warnings) and `mergeAttrs` for opt-in attribute fallthrough. | [Props](/guide/props), [Fallthrough Attributes](/guide/fallthrough-attributes) |
| `nodula-framework/data` | Fetch-based request client and HTTP errors. | [Data](/guide/data) |
| `nodula-framework/localstorage` | localStorage and IndexedDB signals; browser-readable cookie helpers. | [Local Storage](/guide/local-storage) |
| `nodula-framework/dragdrop` | Native drag sources and accepted drop targets. | [Drag and Drop](/guide/drag-and-drop) |
| `nodula-framework/sortable` | Vertical list reordering with native drag and drop, Move Up/Down controls, announcements. | [Sortable Lists](/guide/sortable-lists) |
| `nodula-framework/filedrop`, `fileupload` | Native file picker and drop zone; file-drop uploads with progress. | [File Drop](/guide/file-drop), [File Upload](/guide/file-upload) |
| `nodula-framework/auth` | Adapter-backed client identity state and role or permission checks for the UI. | [Authentication](/guide/auth) |
| `nodula-framework/cookieconsent` | Versioned consent, preference UI, consent-gated callbacks and Google Analytics. | [Cookie Consent](/guide/cookie-consent) |
| `nodula-framework/animation` | Web Animations helpers and opt-in lifecycle transitions. | [Animation](/guide/animations) |
| `nodula-framework/dialog`, `modal`, `drawer`, `notification` | Focused browser UI helpers. | [Dialog](/guide/dialogs), [Modal](/guide/modals), [Side drawer](/guide/drawers), [Notification](/guide/notification) |
| `nodula-framework/seo`, `seo-vite` | Client route metadata, Open Graph and Twitter tags; build-time sitemap and robots. | [SEO](/guide/seo) |
| `nodula-framework/pwa` | Opt-in Vite PWA integration. | [PWA](/guide/pwa) |
| CSS entries (`dialog.css`, `modal.css`, `drawer.css`, `notifications.css`, `cookieconsent.css`, `filedrop.css`, `sortable.css`) | Standalone copies of the add-on stylesheets. The add-ons inject the same styles at runtime; import an entry only for early loading or overriding. | [Framework Stylesheets](/guide/framework-stylesheet) |

## 1. Purpose and principles

NodulaJS is a lightweight, modular JavaScript framework for browser-rendered applications. It combines fine-grained reactive state with direct DOM rendering, and keeps specialized capabilities in optional package entries.

- **Small:** keep the core runtime and default work limited.
- **Modular:** applications import optional capabilities separately.
- **Predictable:** updates, ownership, errors, and cleanup are explicit.
- **Standards-based:** prefer browser APIs and native HTML.
- **Extensible:** integrate app-owned and third-party services through explicit adapters and ordinary JavaScript composition.

Vite is the supported build and development integration for single-file components. It is not part of the browser runtime. Nodula targets client-rendered browser applications. APIs may change during alpha; public package exports and declaration files are the consumer contract (section 8).

## 2. Subsystem contracts

### 2.1 Reactivity

**Contract**

- `signal(initialValue)` returns `[read, write]`. Reading inside a running effect tracks a dependency. `write` accepts a value or an updater; values equal under `Object.is` do not notify.
- `effect(fn)` runs immediately, then reruns when a dependency read in its previous run changes. Dependencies are refreshed on each run, so conditional reads change what triggers it. It returns a stop function.
- `watch(source, callback)` tracks only `source` and calls `callback(value, oldValue)` when its value changes under `Object.is`. It is lazy, runs the callback untracked, returns a stop function, and stops with its owner like `effect`. A non-function `source` or `callback` throws `TypeError`.
- `computed(fn)` returns a read-only, effect-backed accessor. It exposes no separate disposer; create it inside an owner.
- `batch(fn)` delays notification flushing until the callback completes. `untrack(fn)` reads signals without tracking them.
- Effects are synchronous, except notifications deferred by `batch()`.

**Guarantees** (`reactivity.test.js`)

- If an effect throws during an update, the remaining queued effects still run, and the first error is rethrown from the write that triggered the update.
- Computed values settle before effects run, so an effect never reads a stale derived value.
- An effect that writes a signal it reads re-runs until stable. A computation that re-runs 100 times in one update throws a cycle error.

**Limits**

- No asynchronous scheduler; updates are not batched across microtasks.
- `computed()` cannot be disposed independently.
- `watch()` has no `immediate`, `deep`, or flush options.
- Core signals do not proxy nested object properties; use the store add-on.

### 2.2 Ownership and cleanup

**Contract**

- `createRoot(fn, options?)` creates an ownership scope and returns `[value, dispose]`. `onCleanup(fn)` registers cleanup with the current root or effect run; effect cleanup also runs before that effect reruns. `onMount` and `onUnmount` register root lifecycle work. `{ detached: true }` prevents attachment to the current owner.
- Cleanup is the integration boundary for listeners, observers, subscriptions, and other owned resources.

**Guarantees** (`reactivity.test.js`, `dom.test.js`)

- Root disposal is idempotent and runs cleanup callbacks in reverse registration order.
- If a cleanup throws, the remaining cleanups still run and the first error is rethrown.

**Limits**

- `onCleanup`, `onMount` and `onUnmount` throw outside an owner.
- Resources created outside an owner need an explicit disposer.

### 2.3 DOM, components, and rendering

**Contract**

- Core exports `h`, `fragment`, `mount`, `errorBoundary`, `list`, `each`, `when`, `slot`, `component`, `outlet`, and `registerLifecycleTransition`. Visible islands, custom element registration and the `Nodula` stylesheet helper are optional entries (section 2.7).
- `h(tag, props?, ...children)` creates native elements. Function-valued children and supported props are reactive. Event listeners, `ref`s and bindings are owned by the surrounding owner.
- `mount(target, component)` replaces target children with the rendered component and returns a disposer that removes its output and owned effects. A missing selector target throws.
- `errorBoundary(render, fallback)` renders `render()`. If it throws while its content is created, including in child components, the error is logged and `fallback(error)` renders instead, so the parent tree keeps rendering.
- Compatible dynamic nodes are reused. Unkeyed descendants reconcile by position; keyed rows by key.
- A function child returning text updates its text node in place while it keeps returning text. A function child returning a node, a fragment or an array re-runs its whole subtree when any value read while building it changes. Its components and effects are disposed and recreated, so component local state resets. Reads inside a nested function child belong to that child. Disposing it stops its updates but leaves its last DOM in place.
- `when()` and `each()` are descriptors for `h()` children. Returned from a function child they render as the text `[object Object]`.
- Components are JavaScript functions or compiled `.comp` modules. Imports are explicit and local to the file.
- `ComponentContext.attrs` holds caller attributes that a component did not declare. Core rendering never sets it; the props add-on's `withProps` does, for components with a prop schema (section 2.7).

**Guarantees** (`dom.test.js`, `function-child.test.js`, `each-moves.test.js`, `list-moves.test.js`)

- `h()` outside a root or effect throws, because there is no owner to register cleanup with.
- A malformed `ref` (not a function) or `bind` (missing `read`/`write`, or a property other than `value` or `checked`) throws a `TypeError`. A non-function `errorBoundary` argument throws a `TypeError`.
- Keyed lists reject duplicate keys before changing the DOM. Rows already in place are not re-inserted.
- On a reorder, keyed `each()` and `list()` keep the longest run of rows that are already in relative order and move only the others, so moving one row costs one DOM move (`each-moves.test.js`, `list-moves.test.js`).
- Function children that return nodes (`function-child.test.js`): fragment and array outputs update and keep sibling order; a primitive output updates the same text node; returning the same cached node again keeps its reactive content and does not call its refs again; a throwing update keeps the previous DOM; a `when()` branch removes all of its current nodes when hidden; a component returned from a function child is recreated, its local state resets, and its cleanup runs once per update; `each()` rows keep their element identity across a function child update.
- Lifecycle transition errors are logged with `console.error`; the DOM update still completes.
**Limits**

- No global component registry and no `createApp()`.
- A function child that returns a node rebuilds its subtree when any value it read changes, so components inside it reset. Prefer reactive leaves, `when()` and `each()` on hot paths. This rebuild is the documented contract, not a planned change.
- `errorBoundary` catches creation-time errors only, not errors from later reactive updates.
- `list()` renders rows into its own `<div>`, reads each row's item once per key, and applies no enter/leave transitions. `each()` is preferred for new code.
- Unkeyed insertions are not identified; incompatible element types are not reused.

### 2.4 Single-file components and templates

**Contract**

- The Vite plugin compiles `.page` and `.comp` files. A file has one `<script>`, exactly one single-root `<template>`, and at most one `<style>` block. HTML comments, `//` line comments and blank lines may appear between the blocks, for example a copyright notice. Other top-level content is rejected.
- A `.comp` may declare `export const propSchema = {…}` as an object literal in its `<script>`. The compiler moves it to module scope and wraps the component with `withProps` from `nodula-framework/props`. Other top-level exports in `<script>` are rejected. `propSchema` in a `.page` is rejected.
- `@attrs` (valid only with `propSchema`) marks the one element or component tag that receives undeclared caller attributes. Without it, a component with a schema sends them to its root element.
- Template features: `{{ expression }}`, `:attribute`, `@event` / `on:event` / `@on:event`, `@if` with adjacent `@else`, `@for` with `:key` and legacy `each`, `@show`, `@ref`, `@bind` / `@bind:value` / `@bind:checked`, default and named slots, imported `.comp` tags, `use:visibleIsland`, and `@attrs`.
- Styles: `<style>` is global; `<style scoped>` rewrites selectors; `<style module>` uses Vite CSS Modules and exposes `$style`.
- Scoping rewrites only the last compound of each selector, so `.a .b` scopes `.b`. `:global(...)` opts out and accepts one selector. `:deep(...)` reaches child-component elements. `:root`, `html` and `body` are never scoped.

**Guarantees** (`compiler.test.js`, `vite-plugin.test.js`, `sfc-css-modules.test.js`, `directives.test.js`)

- `@for` requires `:key` and cannot share an element with `each`, `@if`, or `@else`. `@else` must immediately follow `@if`.
- Bindings require a getter/setter pair and support only `value` and `checked`.
- `@show`, `@ref` and bindings on a component tag are compile errors; `@if`, `@for` and event callbacks work on component tags.
- Compile errors name the full source path in their message.
- Generated style modules register their component file as a watch dependency.
- Multi-line named imports, side-effect imports, template-literal interpolations, spreads and shorthand properties in loop expressions compile correctly.
- A nested compile does not clobber the caller's compile state, including the `@attrs` target.
- A schema is hoisted once to module scope. Braces in comments, strings and template literals do not end the scan.
- Components without `propSchema` compile to the original shape and do not import `nodula-framework/props`.
- Each `@attrs` and schema placement rule, and each invalid `propSchema` form, is a compile error that names the file (one case per error).

**Limits**

- One root element; one style block; `scoped` and `module` cannot be combined; `module` accepts no custom names.
- `<script>` is JavaScript only. No TypeScript inside component scripts.
- Not a full HTML, Vue, Svelte or JSX compiler. No scoped-slot props or arbitrary dynamic component lookup.
- `propSchema` is a `.comp` feature and must be an object literal. The compiler checks one file: it does not check a parent's attributes against a child's schema.
- Two-way bindings require an explicit getter/setter pair; arbitrary expressions are not supported.
- Do not combine a binding with a reactive `:value` or `:checked` on the same control.

### 2.5 Routing

**Contract**

- `createRouter(routes, fallback?, options?)` accepts explicit routes and defaults to hash mode. `createFileRouter(files, fallback?, options?)` discovers `routes/**/*.page` and `layout.page` files from a Vite glob. Routes may be eager or lazy; lazy modules load on first allowed visit.
- Patterns: static segments, `:name` or `[name]` for one segment, and a terminal `*name` or `[...name]` for one or more segments. Matching ranks static, then parameter, then catch-all, segment by segment. One trailing slash is ignored. Parameters are decoded; catch-all segments are decoded individually and joined with `/`. Malformed encoding does not match.
- `beforeEach(context)` runs before the initial render and each navigation. It may allow, cancel (`false`) or redirect (a path).
- `base` (History mode only) serves the app under a path prefix. The router adds it to and strips it from URLs. Internal links include it.
- `onError` and `router.loadError()` report lazy-load failures. After a successful route, a failure restores that route and its URL. Failed loads are retried on the next visit.

**Guarantees** (`router.test.js`, `navigation.test.js`)

- Unmatched file routes render the fallback; they do not redirect.
- In hash mode, a query string inside the hash is not part of the route path.
- Malformed and cross-origin navigation paths throw. Redirect loops are reported as guard failures.

**Limits**

- Guards are client-side navigation controls, not authorization.
- History mode needs a host fallback that serves the app entry for direct visits and refreshes.
- `base` is not available in hash mode, and no base path is inferred from the environment.

### 2.6 Integration and extension

Nodula has no runtime plugin registry and no `app.use()`. Integrations use explicit composition:

1. **Adapters** delegate a domain service to application-owned methods (auth is the example).
2. **Transport injection** replaces a low-level mechanism (the data add-on accepts a Fetch-compatible `fetcher`).
3. **Pipeline hooks** belong to one pipeline. Router `beforeEach` is navigation middleware, not global middleware.
4. **Build plugins** integrate at build time. `nodulaPlugin()` compiles SFCs; `nodulaPWA()` configures the PWA plugin. Neither runs in the browser.
5. **Lifecycle cleanup** belongs to the owner that created the integration, or to an explicit dispose function.

**Limits:** no general plugin manager. New integrations stay optional, vendor-neutral at the framework boundary, and tested against their adapter contract. Vendor SDK setup belongs in application code or a separate adapter package.

### 2.7 Add-ons

Add-ons are opt-in package entries. Option-level detail lives in each entry's guide (see [At a glance](#at-a-glance)).

#### Store

**Contract:** deeply reactive plain objects and arrays. Repeated reads return the same proxy, and one object has one proxy across stores, so nesting a store keeps its identity. `Object.defineProperty` is tracked.
**Guarantees:** `reactivity.test.js`.
**Limits:** plain objects and arrays only. Class instances, and the contents of `Map` and `Set`, are not tracked.

#### Form

**Contract:** reactive values, errors, touched state, dirty and valid accessors, native change and blur handlers, async `handleSubmit`, and `reset`. The opt-in `validateAsync` option takes one async check per field, which runs after the field's sync check passes, on blur and on submit. `validating()` reports the form's pending checks, and `field(name).validating()` reports one field's. `field(name).asyncError()` returns the error from a field's last failed check. `field(name)` returns per-field `value`, `error`, `touched`, `dirty`, `validating`, `asyncError`, `visibleError`, `invalid`, `ids` (`control`, `description`, `error`) and `attributes({ description })` for `id`, `aria-describedby` and `aria-invalid`. IDs come from the `idPrefix` option, which defaults to a unique prefix per form. `submitError()` records the last `onSubmit` failure, which is still rethrown. The `escapeHtml` option defaults to `true`, so `onSubmit` receives escaped values unless `escapeHtml: false` is set. The opt-in `focusInvalid` option (default `false`) focuses the first invalid field's control after a failed submit, and the opt-in `announceErrors` option (default `false`; `true` or a function) writes a failed-submit summary to a visually hidden `role="status"` region. Both throw a `TypeError` for other values.

**Guarantees** (`form-fields.test.js`, `form-submit-escaping.test.js`, `form-async-validation.test.js`, `form-a11y.test.js`, `reactivity.test.js`)

- A field's error is visible only after the field is touched or a submit is attempted; a rejected submit touches every field.
- `aria-describedby` references an element only when that element is rendered: the error element while an error is visible, and the description element only when declared.
- Unknown field names throw.
- An async check runs only for a field with no sync error, on blur or submit, never on value change alone. A passed value is not re-checked on submit until it changes.
- A value change, a new check on the same field, `reset()`, or disposal of the owning scope aborts the in-flight check, and its late result is ignored.
- A sync error takes precedence over an async message on the same field. Async messages are kept through `validate()`.
- During submit, `submitting()` is true while the async checks run. A changed checked value or a `reset()` during the checks makes submit resolve `false` without calling `onSubmit`.
- A check that throws or rejects sets `asyncError()` and logs with `console.error`, but adds no field error and does not block submit (fail open). A value change clears `asyncError()` together with the field's async message.
- Invalid `validateAsync` options (not an object, unknown field, or non-function entry) throw a `TypeError`.
- With `focusInvalid` on, a failed sync or async submit focuses the control of the first invalid field in DOM order, found by `field(name).ids.control` inside the submitted form, then the document. Fields with no rendered control are skipped, and no focus change happens when none is found.
- With `announceErrors` on, a failed submit writes one count message (`nodula-form-errors-one` or `nodula-form-errors-many`) or the text returned by the function into a `role="status"`, `aria-live="polite"` region. A repeated failure is announced again. The region is removed when the owner is disposed.
- A submit ignored because one is in progress, and a stale async result, neither focus nor announce. With both options off, the form adds no DOM and moves no focus.

**Limits:** sync validation runs in application code. Async checks are opt-in and run only on blur and submit: there are no debounced as-you-type checks and no cross-field async rules. Async checks fail open. The helpers render no markup or field messages. The announcement is the only text they write, and it is a count, not a list of fields. Focus needs control ids. Both options are opt-in and only act on a failed submit. Client validation, sync or async, is not server-side validation. `escapeHtml` is HTML-context encoding, not sanitization.

#### Resource

**Contract:** `createResource(fetcher, { source, immediate })` returns `value`, `state` (`initial`, `pending`, `ready`, `refreshing`, `errored`), `loading`, `error`, `refetch()` and `dispose()`. `fetcher(input, { signal })` runs outside the caller's reactive scope. A new request aborts the previous one, and disposal aborts the in-flight request.

**Guarantees** (`resource.test.js`)

- Superseded and disposed results are ignored.
- The last successful value is kept during refreshes and after errors.
- The thrown error is stored unchanged and cleared by a later success.
- Internal loads never produce unhandled rejections; only an explicit `refetch()` rejects.
- A resource is disposed with its owning root.

**Limits:** no cache or retry policy. `source` is the only reactive trigger. Loading fallbacks are provided by the separate Suspense add-on, not by the resource itself.

#### Suspense

**Contract:** `createSuspense(...)` and the `<Suspense :resources="[...]">` template component, with a `#fallback` template and default content, show the fallback while the given resources load for the first time, then show the content. It depends only on each resource's `state` signal.
**Guarantees:** `suspense.test.js`.

#### Props

**Contract:** `withProps(schema, render)` declares a component's props. Each schema entry takes optional `type`, `required`, `default` and `validate`. The wrapped component receives `props` (declared names, defaults applied, read-only) and `attrs` (every other caller prop). `mergeAttrs(attrs, own)` returns `h()` props that put caller attributes on an element the component renders, merging `class`, `style` and listeners as described in [Fallthrough Attributes](/guide/fallthrough-attributes#merge-rules). Components that declare `propSchema` in a `.comp` are wrapped by the compiler. A malformed schema throws a `TypeError` when `withProps` is called. Contract violations (missing required prop, type mismatch, failed `validate`) are logged with `console.warn`, once per component and message, and never thrown.

**Guarantees** (`props.test.js`, `compiler.test.js`, `tree-shaking.test.js`)

- A factory default is called once per instance; a static default is used as given.
- Writing to `props` or `attrs` throws a `TypeError`.
- `ref`, `bind` and `show` from the caller are never forwarded. A caller `false` removes an attribute. Caller listeners run after the component's own listener for the same event.
- Each malformed-schema case throws a `TypeError`.
- Validation runs again when the parent changes a declared prop, and its effect is disposed with the component.
- A consumer that imports only `withProps` does not include `mergeAttrs`.

**Limits:** no value coercion in `withProps` or `propSchema`; values are checked, not converted. Custom-element attributes are the exception: they convert by their declared `type` (see [Web components](#web-components)). No union types (use `validate`), and no TypeScript inference of prop types. Caller attributes added after a component renders are not applied. Warnings cannot be disabled and do not stop rendering. Components without a schema do not forward attributes. Function components must call `mergeAttrs` themselves. Custom elements need an explicit `props` list.

#### Data

**Contract:** Fetch-based methods, query parameters, JSON handling, configurable headers, base URL and transport. Failed responses throw `DataError` with the HTTP status and the parsed body, or the raw text when the body is not valid JSON.

**Guarantees** (`data.test.js`): a malformed error body keeps the status; a malformed success body throws `SyntaxError`.

**Limits:** no retry, authentication, authorization or proxy by default.

#### Local storage

**Contract:** `createLocalStorage(key, initial, { storage })` and `createIndexedDB(key, initial, { indexedDB, databaseName })` return signals persisted as JSON or in IndexedDB. IndexedDB signals expose `ready`, `available` and a read-only reactive `lastError`. Cookie helpers set and read URI-encoded cookies.

**Guarantees** (`localstorage.test.js`)

- A corrupt saved entry is kept until the signal is first changed. Serialization failures are logged.
- `ready` settles when the first open attempt settles, or when the open is blocked by another connection. A blocked open keeps waiting, so `available` can turn true later, and a later hydration does not overwrite a local edit made while blocked.
- An upgrade request from another tab makes this connection close and the signal continue in memory.
- A failed write does not produce an unhandled rejection. A store that could not be read is never written to.

**Limits:** no cross-tab `sync`. Cookie helpers cannot set or read `HttpOnly` cookies. IndexedDB failures do not disable the in-memory signal.

#### Drag and drop

**Contract:** native `DragEvent` and `DataTransfer` listeners with accepted-type checks, explicit disposal, and owner cleanup. The drag source writes data only after validation succeeds.

**Guarantees** (`dragdrop.test.js`)

- A failing `dragstart` writes no data and cancels the drag.
- A drop target reports one enter per target and one leave after moving through its descendants, even when the browser reports `relatedTarget` as `null`. A drop resets that state.

**Limits:** does not mutate application data, sanitize payloads, or supply keyboard or touch alternatives.

#### Sortable

**Contract:** `createSortableList(list, { onReorder, announce })` adds drag reordering and delegated Move Up/Down buttons (`data-sortable-up` and `data-sortable-down`). The insertion marker is styled with `--nodula-sortable-marker-color` and `--nodula-sortable-marker-width`.

**Guarantees** (`sortable.test.js`)

- Focus returns to the moved row's control.
- Each reorder is announced in a `role="status"` region unless `announce: false`.
- Duplicate IDs introduced by an app update are logged, not thrown from the observer. The observer ignores changes made only by the insertion marker.

**Limits:** app code owns item state and rendering. The list reports orders and does not reorder data.

#### File drop and file upload

**Contract:** an accessible native picker and drop zone with MIME and extension filtering, configurable states, and caller-supplied labels. File upload posts accepted files as `FormData`, reports byte progress, and aborts active requests on disposal.

**Guarantees:** `filedrop.test.js`, `fileupload.test.js`.

**Limits:** client-side type checks do not inspect file contents. Server validation, storage and preview policy belong to the application.

#### Auth

**Contract:** reactive identity state supplied by an adapter (`getSession`, `signIn`, `signOut`, optional `refreshSession`). `hasRole` and `hasPermission` read roles and permissions from the identity and the configured role map. While a refresh is loading, an authenticated identity keeps its roles and permissions.

**Guarantees:** `auth.test.js`. Role and permission checks stop immediately when sign-out starts; during a refresh they keep the previous identity.

**Limits:** role and permission checks affect the UI only. Servers must enforce access.

#### Navigation and navigation-dropdown

**Contract:** router-aware links with `aria-current="page"` on the active route. In history mode, internal links include the router `base`. The dropdown composes `createNavigation` with keyboard dismissal and focus return.

**Guarantees:** `navigation.test.js`, `navigation-dropdown.test.js`.

#### Cookie consent

**Contract:** versioned consent records, a banner and preferences UI, and category callbacks through `on(id, callback)`. `setupGoogleAnalytics(consent, measurementId)` integrates Google Analytics.

**Guarantees** (`cookieconsent.test.js`)

- Consent UI ids are unique per manager. A `registerCategory()` disposer runs once and does nothing after `close()`.
- The Google Analytics helper accepts GA4 `G-` IDs only. It queues consent defaults as denied, queues `js` and `config` only after analytics consent is granted, loads `gtag.js` at most once, and deletes `_ga`, `_ga_*`, `_gid` and `_gat*` cookies on withdrawal.

**Limits:** applications must prevent optional integrations from loading before consent. A loaded `gtag.js` cannot be unloaded, so withdrawal is enforced through Consent Mode. `siteName` is validated but not rendered (deprecated).

#### Dialog, modal, drawer, notification, animation

**Contract:** focused UI helpers with documented dismissal and owner cleanup. Modal and drawer backdrop clicks close only when the click is outside the dialog box.

**Guarantees:** `dialog.test.js`, `modal.test.js`, `drawer.test.js`, `notifications.test.js`, `animation.test.js`.

**Limits:** the `open`-attribute fallback of native dialogs does not polyfill focus management or background inertness.

#### Island

**Contract:** `visibleIsland(loader, placeholder?, options?)` from `nodula-framework/island` returns a placeholder `<div>` with the text `Loading section…` by default. The loader runs the first time the placeholder intersects the viewport, or immediately where `IntersectionObserver` is unavailable. The loader must resolve to a component function; the component is called with no component context. On success the component renders in its own detached root, which the island disposes when its enclosing owner is disposed. On failure the placeholder shows `options.errorText` (default `Could not load this section.`) and the error is logged with `console.error`. A non-string or empty `errorText` throws a `TypeError`. The error element always carries `data-nodula-code="nodula-island-load-failed"`. The loading placeholder carries `nodula-island-loading` only when the default text is used. Disposing the owner before the loader resolves prevents late insertion and disconnects the observer.

**Guarantees** (`dom.test.js`, `error-codes.test.js`, `text-labels.test.js`)

- A visible island gets its own owner, so `@on`, `ref` and `bind` inside it work and are cleaned up.
- A custom `errorText` replaces the default failure text and keeps its code. A non-string or empty value throws.
- The default placeholder and failure text carry their codes.

**Limits:** not a general async component or Suspense system. It has no loading-state API, retry control, cancellation of the underlying import, or error boundary. The inserted component runs in a detached root, so enclosing owners do not dispose it directly; the island disposes it through its own cleanup.

#### Web components

**Contract:** `defineCustomElement(name, render, options?)` from `nodula-framework/web-components` registers a Nodula render function with the browser's custom-elements registry. Options are `props`, `events` (callback props that dispatch bubbling, composed `CustomEvent`s), `shadow` (`'open'` by default, `'closed'`, or `false`), and `formAssociated` (`false` by default). `props` is either an array of names, which keeps the original behaviour (each name reflects and attribute text is not converted), or an object whose entries declare `type` (`String`, `Number`, `Boolean`, `Object` or `Array`, which converts attribute text), `reflect` (opt-in: a property set writes the attribute) and `attribute` (the observed name, or `false` for a property-only prop). A property set wins over later attribute changes for the life of the element. With `formAssociated`, the element attaches ElementInternals once, its render receives `props.formControl` (`internals`, `disabled()`, `onReset` and `onRestore`), and the host exposes `form`, `labels`, `validity`, `validationMessage`, `willValidate`, `checkValidity()` and `reportValidity()`. Registration validates the name, render function and options, and throws if the name is already registered or custom elements are unavailable. The element creates an owned root when it connects and disposes it when it disconnects. The `Nodula` object from the same entry is frozen and offers `css(href)`, which loads a stylesheet URL once and returns its `<link>` element, and `defineCustomElement`, the same function. `Nodula.css` requires a browser document. A `.comp` that calls `Nodula.css(...)` receives the import from this entry unless its script already imports `Nodula`.

**Guarantees** (`web-components.test.js`, `web-components.spec.js`, `core-entry.test.js`, `dom.test.js`, `compiler.test.js`)

- Attribute text converts by the declared type: `Number` gives `NaN` for empty or non-numeric text, `Boolean` is `true` when present and `false` when absent (including at connect), and `Object` and `Array` parse JSON, where invalid JSON logs a warning and leaves the prop `undefined`. Later attribute changes follow the same rules; array-form props stay text.
- Reflection happens only on a property set. A `Boolean` prop writes an empty attribute or removes it. `Number`, `String` and untyped props write their text, and object or function values leave the attribute unchanged. `Object` and `Array` props cannot reflect.
- A property set wins over later attribute changes for that element, and a reflected write does not feed back into its prop.
- Invalid declarations throw a `TypeError`: an unknown option, an unsupported type, a non-boolean `reflect`, `reflect` on `Object` or `Array`, `reflect` without an attribute, a non-lowercase attribute name, two props sharing an attribute, or a reserved form member used as a prop name.
- With `formAssociated`, internals attach once per element, and registration throws an `Error` when the browser has no `attachInternals`. The Chromium suite (`web-components.spec.js`, run by `npm run test:a11y`) checks that the element's value is submitted in `FormData`, that typed input reaches `FormData`, that a form reset runs the reset handler, that `disabled()` follows a disabled fieldset, and that `setValidity` drives `checkValidity()` and `validationMessage`.
- The core entry exports neither `defineCustomElement` nor `Nodula`; the entry exports `defineCustomElement` and a frozen `Nodula` whose `defineCustomElement` is the same function.
- `Nodula.css` loads a stylesheet once and returns the existing link for the same URL.
- A `.comp` that calls `Nodula.css` gets the generated import, and an explicit `Nodula` import is not duplicated.

**Limits:** registration needs browser custom-element APIs and a document. It is not server rendering or hydration. A tag name can be defined once per registry. Only declared props are observed. Attribute conversion covers the four types above and nothing else. Object and Array props cannot reflect. ElementInternals and `props.formControl` exist only for `formAssociated` elements, and no other element gets form behaviour. For a form-associated element, `value` is the prop, not the live text the user types; the submitted value is whatever the component passes to `setFormValue`. A property set is permanent for that element. Custom elements need an explicit `props` list (see the Props entry).

#### PWA

**Contract:** build-time integration with `vite-plugin-pwa`.

**Limits:** service-worker and cache behaviour depends on explicit configuration and platform support.

#### SEO

**Contract:** `createSEO(router, options)` updates document metadata when the route changes: title, description, keywords, author, robots, canonical, Open Graph and hreflang. Route patterns use the router's `:param` and `*catch-all` syntax with the same ranking. `twitter` adds opt-in `twitter:*` tags, falling back to Open Graph values. `update()` merges page-local metadata, including functions and individual Open Graph fields. `nodulaSEO` generates sitemap and robots files at build time from an explicit route list.

**Guarantees** (`seo.test.js`)

- A static route beats a parameter route regardless of declaration order, and a catch-all must be the last segment.
- Canonical URLs include the router `base`.
- Twitter tags are emitted only when a `twitter` object is supplied.
- `dispose()` restores the head.

**Limits:** metadata is client-side, with no server-rendered metadata. The canonical URL is also emitted in hash mode, where search engines may ignore the fragment. `seo-vite` takes an explicit route list.

## 3. Styling

Nodula uses native CSS, optional global stylesheets, scoped SFC styles and Vite CSS Modules, through `<style module>` and external `.module.css` imports. Add-ons that ship styles inject them at runtime inside `@layer nodula-addons`, so unlayered application CSS overrides them. The CSS entries are standalone copies for early loading or overriding. The stylesheets in `framework/assets/css` are listed in one build list and checked against that directory (`build-config.test.js`). See [Styles and CSS Modules](/guide/styles), [Framework Stylesheets](/guide/framework-stylesheet) and the [NodulaUI Specification](/guide/nodula-ui-specification).

## 4. Accessibility responsibilities

Nodula renders standard DOM and does not make an interface accessible by itself. Applications choose semantic elements, label controls, associate instructions and errors, preserve keyboard behaviour, expose asynchronous state, provide visible focus, and test with assistive technology.

- The form field helpers, the sortable list and the cookie-consent UI supply IDs, ARIA attributes, focus return and status announcements. The form moves focus and announces only when its opt-in `focusInvalid` or `announceErrors` option is set. The form helpers do not render application labels or field messages. The opt-in `announceErrors` option writes a failed-submit summary to a visually hidden status region, and the sortable list announces each reorder. None of these claim conformance.
- `aria-*` and `data-*` attributes are available through DOM props and template attributes.
- Native `<dialog>` add-ons use browser modal behaviour where supported. Their fallback does not polyfill focus management or inertness.

**Limits:** no automatic accessibility auditing and no conformance guarantee. See [Accessibility](/guide/accessibility).

## 5. Security and trust boundaries

- Client-side state, form validation, route guards, consent state and auth role or permission checks are not security enforcement. Validate input and authorize protected operations on the server.
- Browser requests come from the visitor's browser. Cross-origin requests need an appropriate CORS policy. Server secrets do not belong in browser code or headers.
- Use text insertion for untrusted content. `onSubmit` receives HTML-escaped values by default (`escapeHtml: true`); `escapeHtml: false` passes raw values, which must then be encoded for their output context. Escaping is HTML-context encoding only. It is not a replacement for server validation or for context-appropriate output encoding. Values that are persisted (to a database or API) should be submitted with `escapeHtml: false`, because escaped text would be stored with its entities.
- Browser cookie helpers cannot set `HttpOnly`; session-cookie policy belongs on the server.
- Consent is a browser preference, not proof that third-party code is blocked. Load optional integrations only after permission is granted.
- The repository's example Python API has no authentication or per-user authorization and must not be exposed publicly.

See [Security](/guide/security).

## 6. Error codes

Errors and messages that reach end users carry a stable `code` with the `nodula-` prefix (for example `nodula-data-http-error` on `DataError`, and `error.code` on the upload and storage errors). Framework text shown to users sits in an element with `data-nodula-code`. Messages stay in English for developers. Applications translate by code.

- The catalogue is `framework/i18n/en.json`: each code with its English text, with `{placeholder}`s for dynamic values. It is a translation source only; the runtime does not import it. A test checks that each catalogued code is used in source and that its text matches the source (`error-codes.test.js`).
- Developer-misuse errors (`TypeError`s for invalid arguments) do not carry codes.
- Browser `DOMException`s are wrapped for storage errors, so the code is always present. The original is the `cause`.
- The router's text can be replaced with `labels` (`checking`, `navigationBlocked`, `loadFailed`, `notFound`); the English defaults apply otherwise. The island's error text can be replaced with `visibleIsland(…, { errorText })`. Replacing a text keeps its code.
- The status texts "Checking route…" and "Navigation blocked." have no code. Adding one would change how the router renders them, so they are not coded yet.

## 7. Build, browser, and verification

- The runtime is modern JavaScript with TypeScript declarations for consumers. Applications do not need TypeScript. The runtime has no runtime dependency; build and test tooling has its own.
- The framework is browser-oriented and uses DOM APIs. Server rendering, hydration, JSX and universal rendering are outside scope.
- Framework tests use Vitest in a Node environment with Happy DOM where needed. Demo integration tests are under `demo_app/vitest/`.
- Tree-shaking is verified with Vite production builds of a consumer fixture for each public entry, under the tested configuration. Other bundlers and consumer setups are not exhaustively verified. Build configuration is checked against the add-on list and the package exports.
- Happy DOM is not a real browser. Layout, paint, focus behaviour in real engines and screen-reader behaviour are not verified by the test suites.
- The render benchmark (`npm run benchmark:render`) reports Happy DOM timings and operation counts for relative comparisons only. It is not a real-browser or user-latency measurement.

**Verification map**

| Subsystem | Suites in `framework/vitest/` |
|---|---|
| Reactivity, store | `reactivity.test.js`, `store.test.js` |
| DOM, components, error boundary | `dom.test.js`, `directives.test.js`, `each-moves.test.js`, `list-moves.test.js`, `function-child.test.js` |
| Web components | `web-components.test.js`; `web-components.spec.js` (Playwright, Chromium, run by `npm run test:a11y`) |
| Compiler and Vite plugin | `compiler.test.js`, `vite-plugin.test.js`, `sfc-css-modules.test.js` |
| Router and navigation | `router.test.js`, `navigation.test.js`, `navigation-dropdown.test.js` |
| Form, resource, suspense | `form-fields.test.js`, `form-submit-escaping.test.js`, `form-async-validation.test.js`, `form-a11y.test.js`, `resource.test.js`, `suspense.test.js` |
| Props, prop schema, attribute fallthrough | `props.test.js`, `compiler.test.js` |
| Storage, data, auth | `localstorage.test.js`, `data.test.js`, `auth.test.js` |
| Browser UI add-ons | `dialog.test.js`, `modal.test.js`, `drawer.test.js`, `notifications.test.js`, `animation.test.js`, `dragdrop.test.js`, `sortable.test.js`, `filedrop.test.js`, `fileupload.test.js` |
| Consent, SEO, PWA | `cookieconsent.test.js`, `seo.test.js`, `pwa.test.js` |
| Error codes | `error-codes.test.js` |
| Packaging | `core-entry.test.js`, `tree-shaking.test.js`, `build-config.test.js` |

**Repository checks**

```sh
npm test                  # typecheck, framework tests, demo tests
npm run test:framework
npm run test:demo
npm run build
npm run benchmark:render
```

**Unverified targets:** automated accessibility checks, real-browser compatibility, runtime size budgets, production code-splitting guarantees, and cross-engine benchmarks. Do not treat recommended targets as release promises. See [Testing](/guide/testing) and [Performance](/guide/performance).

## 8. Compatibility and non-goals

Nodula is in alpha. Public package exports and their declaration files are the consumer contract. Changes to them keep implementation, tests, declarations, examples and documentation aligned. Add-ons stay optional unless a documented decision justifies a core change.

Not provided, and not to be inferred from other frameworks: `createApp()` or `app.use()`, a global component registry, a `ref()` signal API (template refs are callbacks), SSR or hydration, JSX, a general plugin manager, a built-in translation catalogue, or an automatic form-field accessibility layer. The form field helpers supply IDs and ARIA attributes. Their focus and announcement behaviour is limited to the opt-in `focusInvalid` and `announceErrors` options, both off by default. Attribute fallthrough is opt-in through a prop schema; there is no `$attrs` or `inheritAttrs`, and components without a schema receive no caller attributes.

## 9. Limits

These are the boundaries Nodula does not cross. Read them before choosing it for an application. Each item summarizes the limits of a section above.

- **Rendering:** client rendering only. There is no server-side rendering or hydration, and a browser DOM is required.
- **Template subset:** one root element per component. No JSX, no TypeScript inside templates or scripts, no scoped-slot props, and no arbitrary dynamic component lookup. One style block; `scoped` and `module` cannot be combined.
- **Props:** `propSchema` is opt-in, `.comp`-only and must be an object literal. No value coercion for `propSchema` (custom-element attributes do convert by declared `type`; see [Web components](#web-components)), no union types and no TypeScript inference of prop types. Warnings go to `console.warn` only and cannot be disabled. Caller attributes added after a component renders are not applied. `@attrs` must mark one element or component tag, outside loops and slots, and requires a schema. Function components must call `mergeAttrs` themselves, and custom elements need an explicit `props` list.
- **Bindings:** an explicit getter and setter pair, for `value` or `checked` only.
- **Lists:** keys must be stable and unique. `list()` reads each row's item once per key; `each()` gives rows reactive accessors, so prefer it.
- **Reconciliation:** unkeyed insertions are not identified, and incompatible element types are not reused. A function child that returns a node rebuilds its subtree when a value it read changes, which resets components inside it.
- **Computed values:** no independent disposer; create them inside an owner.
- **Error boundaries:** catch creation-time errors only, not errors from later reactive updates.
- **Visible islands** (`nodula-framework/island`): not a general async component or Suspense system.
- **`h()`:** must run inside a root or effect; outside one it throws.
- **Forms:** sync validation runs in your code. Async field checks (`validateAsync`) are opt-in, run on blur and submit only, and fail open, so the server must validate. Field helpers provide IDs and ARIA attributes but no markup or field messages. The opt-in `focusInvalid` and `announceErrors` options act only after a failed submit, and focus needs control ids; `announceErrors` writes a count or your function's text, not per-field messages. Client validation is not server validation. `escapeHtml` is encoding only.
- **Resources:** no cache or retry policy; `source` is the only reactive trigger. Failures are reported through `error`. Loading fallbacks come from the Suspense add-on.
- **Error codes:** user-facing errors carry a `nodula-` code; the router's status texts "Checking route…" and "Navigation blocked." do not. Router and island text can be replaced through `labels` and `errorText`; the framework does not translate.
- **Storage:** no cross-tab `sync`. A blocked IndexedDB open stays memory-only until it completes. When another tab upgrades the database, this tab releases its connection and continues in memory. Cookie helpers cannot set or read `HttpOnly` cookies.
- **Routing:** guards are client-side navigation controls, not authorization. History mode needs a host fallback for direct visits and refreshes. The `base` option is History-only, and no base path is inferred.
- **Data:** no retry, authentication, authorization or proxy by default.
- **Drag and drop:** does not change your data, sanitize payloads, or provide keyboard or touch alternatives.
- **File drop and upload:** type checks do not inspect file contents. Server validation, storage and preview policy are yours.
- **Auth:** role and permission checks affect the UI only. Your server must enforce access.
- **Cookie consent:** you must stop optional integrations loading before consent. A loaded `gtag.js` cannot be unloaded, so withdrawal relies on Consent Mode. Google Analytics accepts GA4 `G-` IDs only. `siteName` is not rendered.
- **Native dialogs:** the `open`-attribute fallback has no focus management or background inertness.
- **PWA:** cache behaviour depends on your configuration.
- **SEO:** metadata is client-side, with no server-rendered tags. The canonical URL is also set in hash mode, where search engines may ignore the fragment. `seo-vite` needs an explicit route list.
- **Accessibility:** Nodula provides semantics and hooks, not an audit or a conformance guarantee. Test with assistive technology.
- **Verification:** Happy DOM only; no real-browser, screen-reader or cross-engine guarantees.
- **Security:** the repository's example Python API has no authentication or per-user authorization and must not be exposed publicly.

## 10. Maintenance

When a public behaviour changes:

1. Update the subsystem's contract, guarantees and limits in section 2.
2. Update the matching item in the limits list (section 9) and, for a new or renamed entry, the [At a glance](#at-a-glance) table.
3. Update the dedicated guide and the declaration file.

Other statements should point to the subsystem block rather than repeat it.

## Related guides

- [Framework Core](/guide/framework-core): core API and lifecycle behaviour.
- [Single-File Components](/guide/templates): compiler syntax and restrictions.
- [Routing](/guide/routing): route modes, parameters, lazy loading and hosting fallback.
- [Async Resources](/guide/resource) and [Suspense](/guide/suspense): loading state, refetch, cancellation and fallbacks.
- [Accessibility](/guide/accessibility) and [Security](/guide/security): application responsibilities.
- [Testing](/guide/testing), [Performance](/guide/performance) and [Production Deployment](/guide/production-deployment): verification and deployment boundaries.
- [Installation](/guide/installation): repository and package boundaries.
