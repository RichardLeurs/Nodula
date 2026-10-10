# Introduction

Nodula is a lightweight JavaScript framework for building browser-rendered web applications. It combines fine-grained reactive signals with direct DOM updates, a small component runtime, and Vite-compiled single-file pages and components. The core stays focused; routing, forms, persistence, animation, authentication helpers, and other specialized features are opt-in add-ons.

Nodula is currently in alpha status, version 0.1. 

## What is included?

The `nodula-framework` core package provides:

- **Reactive state:** `signal`, `computed`, and `effect` for tracking values and updating only affected work.
- **Ownership and cleanup:** roots, lifecycle callbacks, and disposers for effects, DOM listeners, and mounted UI.
- **DOM and component helpers:** `h`, `mount`, keyed lists, conditional rendering, slots, custom elements, and visible-island loading.
- **TypeScript declarations:** public types ship with the package; app code can also be plain JavaScript.

The core browser runtime does not include a router, state store, form system, network client, or server-side renderer. Separate add-on entries provide these capabilities when an app needs them. See [Framework Core](/guide/framework-core) for core APIs and [Specifications and Limits](/guide/specifications) for implemented boundaries.

## Pages and components

For Vite projects, Nodula supports `.page` and `.comp` single-file components. A file can combine JavaScript in `<script>`, one-root template markup in `<template>`, and optional global or scoped `<style>` blocks.

- **`.page` files** describe application pages. They can be connected to routing—manually or through the optional file-router API—but the Vite compiler and router are separate tools.
- **`.comp` files** describe reusable components that pages and other components can import.
- **Vite** compiles these files and builds the app. It is a build tool, not part of Nodula’s browser runtime. The `.page`/`.comp` compiler integration is configured separately from runtime package imports.

Example component:

```html
<script>
import { signal } from 'nodula-framework';

const [count, setCount] = signal(0);
</script>

<template>
  <button type="button" @click="setCount(count() + 1)">
    Clicked {{ count() }} times
  </button>
</template>

<style scoped>
button { font: inherit; }
</style>
```

Templates support a focused syntax, not all Vue or Svelte features. See [Single-File Components](/guide/templates) for syntax, imports, props, slots, conditional branches, and keyed loops.

## Optional add-ons

Add-ons use distinct package entries, so an app imports only the capabilities it uses. Examples include:

| Capability | Package entry | Guide |
|---|---|---|
| Routing | `nodula-framework/router` | [Routing](/guide/routing) |
| Navigation UI | `nodula-framework/navigation` | [Navigation](/guide/navigation) |
| Reactive object/array stores | `nodula-framework/store` | [Stores](/guide/stores) |
| Forms | `nodula-framework/form` | [Forms](/guide/forms) |
| Browser persistence | `nodula-framework/localstorage` | [Local Storage](/guide/local-storage) |
| Fetch client | `nodula-framework/data` | [Data](/guide/data) |
| Animation | `nodula-framework/animation` | [Animations](/guide/animations) |
| Dialogs, modals, drawers, notifications | `nodula-framework/dialog`, `/modal`, `/drawer`, `/notifications` | [Dialogs](/guide/dialogs), [Modals](/guide/modals), [Drawers](/guide/drawers), [Notifications](/guide/notification) |
| Cookie consent | `nodula-framework/cookieconsent` | [Cookie Consent](/guide/cookie-consent) |
| Authentication state helpers | `nodula-framework/auth` | [Authentication](/guide/auth) |
| SEO metadata and build files | `nodula-framework/seo`, `nodula-framework/seo-vite` | [SEO](/guide/seo) |
| Vite PWA integration | `nodula-framework/pwa` | [Progressive Web Apps](/guide/pwa) |

Some add-ons require peer tooling or browser APIs; consult each guide for setup and limitations. Add-ons do not turn client-side checks into server security controls.

## How to start

1. Follow [Quick Start](/guide/quick-start) to run the repository demo.
2. Read [Installation](/guide/installation) for project setup and package boundaries.
3. Learn the reactive foundation in [Reactivity and DOM](/guide/reactivity).
4. Build a page or reusable component with [Single-File Components](/guide/templates).
5. Add routing or another optional capability only when your app needs it.

Nodula currently renders in the browser and does not provide server-side rendering or hydration. For production history-mode routing, configure the host to serve the app entry for application paths. See [Production Deployment](/guide/production-deployment) before deploying.