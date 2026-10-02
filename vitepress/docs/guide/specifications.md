# Specifications and Limits

This page reflects the framework's current specification and implementation status. Recommended targets that are not implemented or verified are not release promises.

## Implemented

- Fine-grained signals, computed getters, synchronous effects, cleanup roots, and reactive proxies for plain objects and arrays.
- Direct DOM helpers, reactive children and properties, native event cleanup, component mounting/disposal, and keyed list reconciliation.
- Vite compilation of`.page`single-file components with the documented template subset, global/scoped styles, slots, and component imports.
- Optional`nodula-framework/router`add-on with hash routing, opt-in History API routing, parameterized file routes, nested layouts, and lazy route loading; the core also provides a load-on-visible helper.
- An optional`nodula-framework/form`add-on for form values, validation, touched state, async submission, and reset.
- An optional`nodula-framework/dialog`add-on for a message dialog with Cancel/OK results and Nodula-owner cleanup.
- An optional`nodula-framework/dialog`add-on for a message dialog with Cancel/OK results and Nodula-owner cleanup.
- An optional`nodula-framework/animation`add-on for Web Animations API playback, explicit transitions, opt-in page/`@if`/`@for`lifecycle transitions, Nodula owner cleanup, and reduced-motion handling.
- Optional TypeScript declarations for the public API; TypeScript is not required to use the JavaScript runtime.

## Current boundaries

- The`.page`Vite plugin is an internal repository source module, not a package export. See[Getting Started](/guide/getting-started)for the repository build and integration setup.
- Nodula is browser-oriented and client-rendered. Server-side rendering and hydration are not implemented.
- The template compiler supports a focused subset and JavaScript-only`<script setup>`blocks. It is not a full Vue/Svelte compiler; JSX, arbitrary two-way binding expressions, automatic transitions without importing/enabling the add-on, and accessibility automation are not provided. See the[animation add-on](/guide/animations)for opt-in lifecycle transitions.
- File-route parameters match one segment. Catch-all file routes are not supported.
- History-mode deployments need a server-side`index.html`fallback for direct visits and refreshes.
- There is no built-in HTTP wrapper. Use the browser's`fetch()`or another application-level choice.
- The example Python`http.server`API is local-only and has no authentication or per-user authorization. It must not be exposed publicly.
- Tree-shaking is verified for the public entries with Vite production-consumer tests; other bundlers/configurations are not exhaustively verified. Runtime-size and broader code-splitting recommendations remain targets.

For the detailed source specification, see the repository's `SPECS.md`.
