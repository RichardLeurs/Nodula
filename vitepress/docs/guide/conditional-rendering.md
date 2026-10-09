# Conditional Rendering

Use `@if` and optional `@else` in a `.page` or `.comp` template to choose which content is mounted from a reactive condition. Use `@show` when content should stay mounted but be hidden with `display: none`.

## Prerequisites

Conditional directives are part of the Nodula Vite template compiler. Your Vite app must load the Nodula plugin for `.page` and `.comp` files. Conditions should read reactive signals or store values; see [Reactivity and DOM](/guide/reactivity).

## Core concepts

- **`@if="expression"`:** compiles to a reactive conditional branch. The expression is evaluated for truthiness when its dependencies change.
- **`@else`:** optional fallback branch paired with the immediately preceding `@if` sibling.
- **`<template @if>` / `<template @else>`:** groups multiple nodes into a branch without adding a wrapper element.
- **`@show="expression"`:** preserves the element and its state in the DOM while toggling its display. It is visibility control, not branch replacement.

## Quick start

```html
<script>
import { signal } from 'nodula-framework';

const [connected, setConnected] = signal(false);
</script>

<template>
  <main>
    <p @if="connected()">Connected</p>
    <p @else>Not connected</p>
    <button type="button" @click="setConnected(!connected())">
      Toggle connection
    </button>
  </main>
</template>
```

When `connected()` changes, Nodula removes the old branch and mounts the other one. `@else` must immediately follow its `@if` sibling; whitespace between them is allowed.

## How it works

The compiler turns the paired directives into core `when(condition, yes, no)` rendering. Nodula mounts only the active branch in a child ownership scope. On a branch change, it disposes the old branch—including its reactive effects and event listeners—before mounting the new branch. Siblings outside the conditional stay in place.

Conditions use JavaScript expression truthiness. Reads such as `connected()` are tracked, so the branch switches when the signal changes. A condition should be a pure expression; put side effects in event handlers or effects instead.

## Common patterns

### Conditional without a fallback

```html
<template>
  <p @if="error()" role="alert">{{ error() }}</p>
</template>
```

When the condition is false, no branch content is mounted.

### Group several nodes without a wrapper

```html
<template>
  <section>
    <template @if="hasAccount()">
      <h2>Account</h2>
      <p>{{ accountName() }}</p>
    </template>
    <template @else>
      <h2>Welcome</h2>
      <p>Create an account to save your work.</p>
    </template>
  </section>
</template>
```

The `<template>` wrapper is not rendered. Its children are inserted as a fragment.

### Hide without unmounting

```html
<template>
  <button type="button" @click="setHelpVisible(!helpVisible())">Toggle help</button>
  <aside @show="helpVisible()">This panel stays mounted while hidden.</aside>
</template>
```

Use `@show` when preserving the element and its local DOM state matters. Use `@if` when inactive content should be removed and its owner cleanup should run.

### Combine conditions with keyed loops

Put a conditional inside a wrapper or inside each row; do not place `@if` and `@for`/`each` on the same element:

```html
<template>
  <ul>
    <li @for="item of items()" :key="item.id">
      <span>{{ item.name }}</span>
      <span @if="item().done">Complete</span>
    </li>
  </ul>
</template>
```

See [List Rendering](/guide/list-rendering) for stable keys and row updates.

## Limitations and troubleshooting

- `@else` must immediately follow an `@if` sibling apart from whitespace. Intervening elements or non-whitespace text break the pairing.
- `@else` has no expression and cannot be used alone. Put the test on `@if`, or use a nested conditional for multiple cases.
- `@if`/`@else` and a loop (`@for` or `each`) cannot share one element. Put one directive on a parent or child element instead.
- Conditional `<template>` supports only `@if` or `@else` attributes and must be inside the component's single template root.
- Branch-local state is recreated when the branch is mounted again. Move state to the component's `<script>` scope if it must survive branch switches.
- If branch content should remain in the DOM, use `@show`; conditional rendering disposes inactive content.
- Optional [Animation](/guide/animations) lifecycle transitions can animate conditional branch entry and removal after `enableLifecycleTransitions()` is enabled.

## Related guides

- [Single-File Components](/guide/templates) — supported directives and template syntax.
- [Reactivity and DOM](/guide/reactivity) — reactive conditions and signal reads.
- [List Rendering](/guide/list-rendering) — keyed loops and per-row conditions.
- [Animations](/guide/animations) — opt-in enter/leave transitions.
- Tests: `framework/vitest/compiler.test.js` and `framework/vitest/dom.test.js`.