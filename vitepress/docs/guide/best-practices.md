# Best Practices

Build Nodula applications around explicit data flow, small components, and clear ownership. Nodula is intentionally a focused browser framework—not a drop-in implementation of Vue or another framework's conventions. Prefer the APIs Nodula actually provides over recreating implicit behavior.

## Keep state close to its owner

Use `signal()` for independent values and derived values with `computed()`. Use the optional Store add-on when nested plain-object or array properties need reactive tracking; do not expect a core signal to make an object deeply reactive.

```js
import { computed, signal } from 'nodula-framework';

const [quantity, setQuantity] = signal(1);
const [unitPrice, setUnitPrice] = signal(12);
const total = computed(() => quantity() * unitPrice());

setQuantity((current) => current + 1);
console.log(total());
```

Keep state local if one component owns it. Lift a signal to a common parent or use a shared store when multiple components must coordinate. Avoid maintaining duplicate values that can be derived from existing state. See [Reactivity and DOM](/guide/reactivity), [Computed Properties](/guide/computed-properties), and [Stores](/guide/stores).

## Make ownership and cleanup explicit

Effects, DOM bindings, listeners, refs, and nested components should live within a Nodula owner that can dispose them. Keep the disposer returned by `mount()` and call it when the mounted view is removed. Use `onCleanup()` for resources such as timers or subscriptions created inside a root/effect scope; do not start owner-dependent work at module scope and expect a component to clean it up.

```js
import { mount, onCleanup, signal } from 'nodula-framework';

const [now, setNow] = signal(Date.now());

function Clock() {
  const timer = setInterval(() => setNow(Date.now()), 1000);
  onCleanup(() => clearInterval(timer));
  return document.createTextNode('Clock is ready');
}

const dispose = mount('#app', Clock);
// Call dispose() when the view is removed.
```

For component-owned DOM, prefer `h()` or compiled `.comp` templates rather than creating unmanaged nodes. See [Lifecycle Hooks](/guide/lifecycle-hooks) and [Components In-Depth](/guide/components-in-depth).

## Keep components and contracts explicit

Break UI into focused JavaScript functions or imported `.comp` files. Import `.comp` components where they are used; Nodula has no global component registry. Pass values through props, pass actions as callback props, and use slots for caller-provided content. Explicitly forward only the props a child intends to apply to its DOM; attributes do not fall through automatically.

```html
<!-- Parent.page -->
<script>
import SaveButton from './SaveButton.comp';
import { signal } from 'nodula-framework';

const [saved, setSaved] = signal(false);
</script>

<template>
  <SaveButton :saved="saved()" @save="setSaved(true)">
    Save profile
  </SaveButton>
</template>
```

Document required props and callback payloads at component boundaries. For reusable components, declare a `propSchema` so required props, types and defaults are checked and undeclared attributes fall through; Nodula has no implicit event emitters, and schema-less components inherit no attributes. See [Props](/guide/props), [Component Events](/guide/component-events), [Slots](/guide/slots), and [Fallthrough Attributes](/guide/fallthrough-attributes).

## Stay within compiler-supported templates

Use the documented `.page`/`.comp` subset and check [Specifications and Limits](/guide/specifications) before assuming syntax from another framework exists. Keep template expressions small; put multi-step logic in JavaScript functions. Use one root element, JavaScript (not TypeScript) in the compiled script block, and a unique stable key for every `@for`/`each` row.

Prefer explicit native elements and attributes. Nodula does not provide automatic accessibility semantics, event modifiers, generic attribute spreading, or a full Vue/Svelte compiler. See [Single-File Components](/guide/templates), [List Rendering](/guide/list-rendering), and [Accessibility](/guide/accessibility).

## Add optional features only when needed

Keep application imports modular: use core for rendering/reactivity, and import optional add-ons from their dedicated package entries only when the application needs them. The router, form, animation, PWA, and other integrations are not automatically enabled by importing core. Follow each add-on's lifecycle and cleanup API.

For animations, respect reduced-motion preferences; Nodula's animation helpers account for them, but application-authored CSS and other effects should do so too. See [Animations](/guide/animations), [Tooling](/guide/tooling), and [Npm Package](/guide/npm-package).

## Treat security and deployment as application responsibilities

Client-side route guards control navigation flow; they do not authorize data access. Enforce access rules in server/API handlers, validate untrusted input at the server boundary, and do not expose secrets in browser code. Do not deploy the demo API as production infrastructure without replacing its local/demo security and storage assumptions.

History-mode routing also requires the production host to serve the application entry for direct route visits. See [Security](/guide/security), [Routing](/guide/routing), and [Production Deployment](/guide/production-deployment).

## Test observable behavior

Test rendered output, user interactions, state updates, error behavior, and cleanup—not private implementation details. Cover normal cases, missing/invalid input, and teardown. Use the repository's framework and demo suites as appropriate:

```sh
npm run test:framework
npm run test:demo
npm test
```

These Vitest suites use Node with `happy-dom`; they do not replace real-browser, accessibility, or production-hosting checks. See [Testing](/guide/testing) for coverage boundaries and commands.

## Review checklist

- Does each state value have a clear owner, and can derived values be computed instead of duplicated?
- Will effects, listeners, timers, refs, and child DOM be disposed with their owner?
- Are props, callbacks, slots, and attribute forwarding explicit?
- Does template syntax match Nodula's documented compiler subset?
- Are list keys stable and unique?
- Are accessibility semantics, server authorization, and deployment fallbacks handled explicitly?
- Have behavior and cleanup been tested at the public boundary?

## Related guides

- [Quick Start](/guide/quick-start) — supported setup and mount workflow.
- [Components In-Depth](/guide/components-in-depth) — composition and ownership.
- [Reactivity and DOM](/guide/reactivity) and [State Management](/guide/state-management) — state choices.
- [Testing](/guide/testing) — test suites and limitations.
- [Specifications and Limits](/guide/specifications) — current feature boundaries.