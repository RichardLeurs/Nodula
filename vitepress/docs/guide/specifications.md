# Specifications and Limits

This page summarizes Nodula's implemented public behavior and known boundaries. “Implemented” means the capability exists in the current source and public API; it does not imply support in every browser, deployment, or bundler. “Unverified target” means it is not a compatibility or release promise.

## Implemented

### Runtime and rendering

- The browser runtime is JavaScript and provides typed public declarations; TypeScript is optional for consumers.
- Core reactivity includes typed signals, computed accessors, synchronous effects, batching, ownership roots, and cleanup hooks.
- Core DOM APIs include `h`, `fragment`, `mount`, reactive children/properties, event and ref cleanup, conditional rendering, and keyed list helpers.
- Compatible DOM nodes are reconciled in place. Keyed rows preserve identity through list updates/reordering when keys remain stable and unique.
- Components can be JavaScript functions or compiled `.comp` modules. Imported `.comp` tags receive props, callback props, default/named slots, and component-owned cleanup.
- `defineCustomElement()` can expose a Nodula render function through the browser custom-elements registry, with declared props/events and configurable Shadow DOM behavior.
- Core `visibleIsland()` can defer invoking a component loader until its placeholder enters the viewport.

### Compiler and templates

- The Vite plugin compiles `.page` and `.comp` files from JavaScript, a single-root `<template>`, and optional style blocks.
- Supported template features include text interpolation, reactive attributes, native events, `@if`/adjacent `@else`, keyed `@for`/`each`, `@show`, `@ref`, value/checked bindings, imported `.comp` components, default/named slots, and `use:visibleIsland`.
- Plain `<style>` blocks are global; `<style scoped>` scopes supported selectors to the component's rendered elements.
- Vite CSS Modules work through imported `.module.css` files and generated class maps used in template bindings; `<style module>` is not supported by the Nodula SFC compiler.
- The plugin is build-time tooling. The compiler is not a full Vue/Svelte compiler, and `<script setup>` blocks are JavaScript-only; TypeScript syntax is unsupported.

### Public package and optional add-ons

The framework package is ESM with a core entry, separate optional JavaScript add-on entries, corresponding declaration files, and explicit CSS exports. The following add-ons are available as separate package entries:

| Entry | Implemented capability |
|---|---|
| `nodula-framework/store` | Reactive nested plain-object and array state. |
| `nodula-framework/form` | Form state, touched/errors, validation, async submission, reset. |
| `nodula-framework/router` | Hash routing by default, opt-in History API mode, route guards, lazy route maps, and Vite file routes. |
| `nodula-framework/navigation` | Router-aware semantic navigation links and active-page state. |
| `nodula-framework/localstorage` | localStorage/IndexedDB signals and browser-readable cookie helpers. |
| `nodula-framework/data` | Fetch-based request helpers and HTTP error objects. |
| `nodula-framework/auth` | Adapter-backed reactive client auth state and UI role/permission checks. |
| `nodula-framework/dialog`, `modal`, `drawer`, `notifications` | Focused browser UI helpers with documented dismissal and owner cleanup. |
| `nodula-framework/cookieconsent` | Versioned consent choices, preference UI, and consent-gated callbacks. |
| `nodula-framework/animation` | Web Animations helpers and opt-in page/conditional/keyed-list transitions. |
| `nodula-framework/pwa` | Opt-in Vite PWA plugin integration using `vite-plugin-pwa`. |
| `nodula-framework/seo`, `nodula-framework/seo-vite` | Client route metadata and build-time sitemap/robots generation. |
| `nodula-framework/vite` | Vite plugin package entry and declaration for `.page`/`.comp` compilation. |

Optional features stay outside the core runtime entry. Check package `exports` and each add-on guide for exact options, browser/build boundaries, and peer requirements.

## Current boundaries

- **Client rendering only:** server-side rendering and hydration are not implemented. Browser DOM APIs are required for runtime rendering.
- **Template subset:** one template root is required. JSX, TypeScript inside templates, Vue/Svelte compatibility, arbitrary dynamic component lookup, prop schemas, automatic prop defaults/validation, attribute fallthrough, and scoped-slot props are not provided.
- **Bindings:** template input bindings require an explicit getter/setter pair and support `value` or `checked` on supported controls; arbitrary two-way expressions are not implemented.
- **Lists:** keys must be stable and unique. The core `list()` helper preserves existing row nodes for matching keys; its render callback is not rerun just because an item's object was replaced under the same key. Compiled `@for`/`each` rows instead receive reactive item accessors. Use signals/store state or the appropriate template row accessor when row fields must update.
- **Reconciliation:** compatible dynamic nodes can be reused; unkeyed children match by position and keyed template rows by key. Nodula does not infer identity for arbitrary unkeyed insertions or reuse incompatible element types.
- **Computed lifetime:** `computed()` is effect-backed and does not expose an independent disposer; create it in an appropriate owner scope.
- **Visible islands:** the helper calls its loader and inserts the returned component node, but does not establish a separate reactive root for that component. It is not a general async-component or Suspense system.
- **Routing:** file routes support static path segments and one-segment parameters; catch-all routes are not implemented. History-mode hosting needs an app-entry fallback for direct route visits and refreshes.
- **Security:** client route guards and auth role/permission helpers are UI controls, not authorization. The repository's example Python API has no authentication or per-user authorization and must not be exposed publicly.
- **Accessibility:** native HTML and browser APIs are available, but Nodula does not provide an accessibility automation layer or conformance guarantee. The dialog-like add-ons use native `<dialog>` where supported; their `open`-attribute fallback does not polyfill full modal focus/inertness behavior.
- **HTTP:** no core HTTP wrapper exists; the optional data add-on uses Fetch but does not implement server-side authorization or a production proxy.
- **Build/deployment:** `.page`/`.comp` compilation happens in Vite at build time. The repository's development API proxy is not a production API server.

## Verification and unverified targets

- Framework behavior is covered by Vitest suites in `framework/vitest/`; demo integration tests are under `demo_app/vitest/`.
- Vite production-consumer tests verify tree-shaking behavior for the public package entries under the tested configuration. Other bundlers and consumer configurations are not exhaustively verified.
- The render benchmark (`npm run benchmark:render`) reports Happy DOM timings and DOM operation counts for selected source-level operations. It is useful for relative comparisons, not real-browser layout/paint or user-latency claims.
- Automated accessibility checks, broad real-browser compatibility, runtime-size targets, production code-splitting guarantees, and benchmarks across browser engines remain unverified targets. Do not treat recommended targets as release promises.

Useful repository checks:

```sh
npm test
npm run test:framework
npm run test:demo
npm run benchmark:render
```

See [Testing](/guide/testing) for suite details and limitations, [Performance](/guide/performance) for benchmark interpretation, [Styles and CSS Modules](/guide/styles) for CSS integration choices, and [Getting Started](/guide/getting-started) for repository and package boundaries.

## Related guides

- [Framework Core](/guide/framework-core) — core API and lifecycle behavior.
- [Single-File Components](/guide/templates) — compiler syntax and restrictions.
- [Routing](/guide/routing) — route modes, parameters, lazy loading, and hosting fallback.
- [Accessibility](/guide/accessibility) and [Security](/guide/security) — application responsibilities.
- [Testing](/guide/testing), [Performance](/guide/performance), and [Production Deployment](/guide/production-deployment) — verification and deployment boundaries.
- The detailed repository source specification is `/docs/SPECS.md`.