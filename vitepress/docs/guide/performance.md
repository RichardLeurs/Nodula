# Performance

Nodula's performance model favors fine-grained reactive bindings, direct DOM updates, stable keyed rows, and optional code loading. These mechanisms can reduce unnecessary work, but they do not guarantee that every application is fast: expensive application computations, large DOM trees, network requests, layout, and paint still matter. Measure the workload that users experience before optimizing.

## How Nodula updates the DOM

Signals and store properties track reads made by effects and reactive DOM bindings. A changed value schedules its dependents; function children and function-valued DOM properties update their bindings rather than asking Nodula to rerender an entire virtual component tree. Compatible nodes are reconciled in place, and keyed rows can retain their DOM identity when the list changes.

```js
import { h, mount, signal } from 'nodula-framework';

const [count, setCount] = signal(0);

function Counter() {
  return h('button', {
    type: 'button',
    title: () => `Current value: ${count()}`,
    onClick: () => setCount((value) => value + 1),
  }, () => `Count: ${count()}`);
}

const dispose = mount('#app', Counter);
```

Only bindings that read `count()` need to update. Keep reactive computations focused: avoid repeating expensive work inside several independent DOM bindings when one derived value or one precomputed result can serve them. See [Reactivity and DOM](/guide/reactivity) and [Computed Properties](/guide/computed-properties).

## Keep lists stable and bounded

Use keyed `@for`/`each` rows with unique, stable keys. Stable keys let Nodula preserve row DOM and owned behavior when items are reordered, appended, or removed; duplicate keys are errors. Avoid generating a new key on each update, because that makes unchanged items appear replaced.

```html
<template>
  <ul>
    <li @for="item of items()" :key="item.id">
      {{ item.label }}
    </li>
  </ul>
</template>
```

For very large collections, consider whether the UI needs every row in the DOM at once. Nodula does not provide a built-in virtual-scrolling component; pagination, windowing, or a purpose-built viewport strategy may be appropriate for the application. See [List Rendering](/guide/list-rendering).

Different list operations have different costs: appending one row should not require moving every existing row, while reversing a list necessarily changes many row positions. Use operation counts as well as timings to understand what a benchmark is measuring; do not expect every keyed operation to have the same cost.

## Defer work that users may not need immediately

The file-based router loads matched lazy page/layout modules on first allowed visit and caches successful imports. For non-route content, `visibleIsland(loader, placeholder)` can delay loading until a placeholder intersects the viewport. These mechanisms can reduce initial work when used selectively, but they do not reduce the cost of content that is ultimately loaded or rendered. See [Async Components and Lazy Loading](/guide/async-components) and [Routing](/guide/routing).

Keep optional integrations optional: import add-ons from their dedicated package entries only when used. Vite tree-shaking tests cover the current public JavaScript entries in the tested Vite production-consumer setup; this does not prove identical output for every bundler or configuration.

## Measure with the repository benchmark

Run the render benchmark from the repository root:

```sh
npm run benchmark:render
```

`framework/mjs/render-benchmark.mjs` uses Happy DOM and reports medians and DOM-operation counts for:

- Keyed-list append, removal, and reverse operations for the optimized `list()` helper and a simple baseline implementation.
- Mounting a 100-row tree.
- Reconciling an unchanged 100-row tree.
- Updating reactive text.
- Built core runtime bytes and gzip bytes, when `dist/nodula/nodula-core.js` exists; run `npm run build:framework` first to generate that artifact.

Defaults are `ROW_COUNT=1000`, `ROUNDS=7`, and `ITERATIONS=20`, with two warm-up rounds before measured rounds. Override them to explore a workload:

```sh
ROW_COUNT=500 ROUNDS=9 ITERATIONS=30 npm run benchmark:render
```

The benchmark is useful for relative source-level comparisons in one process and reports DOM operation counts alongside timings. Happy DOM is not a browser rendering engine: results do not measure layout, paint, GPU work, network behavior, or real-user latency. Small timing differences may be noise. Do not use these results as a cross-browser guarantee or infer app runtime size from the demo bundle.

## Profile the real application

Use a production build and a representative route/data set when investigating user-visible slowness. In a real browser's performance tools, identify whether time is spent in JavaScript, style/layout, paint, network, or long tasks before changing code. Compare the same interaction and data volume before/after a change, and check DOM node count and memory as well as elapsed time.

Useful first checks:

1. Confirm reactive bindings read only the state they need.
2. Confirm list keys are stable and duplicate-free; avoid rebuilding large DOM subtrees for one small value change.
3. Inspect effects for repeated expensive work or reads deferred outside their tracked synchronous execution.
4. Defer optional route/content modules only when users may not need them immediately.
5. Check downloaded app assets and production chunks; tree-shaking verification currently targets Vite and does not establish universal bundle sizes.

## Motion and responsiveness

Animation is an optional add-on. Nodula's animation helpers respect `prefers-reduced-motion` by default; application-authored CSS and custom effects should also provide reduced-motion behavior. Avoid animating layout-heavy properties when a transform/opacity effect meets the interaction need, and test on target devices rather than assuming desktop results transfer. See [Animations](/guide/animations) and [Accessibility](/guide/accessibility).

## Limitations and troubleshooting

- **Benchmark runtime size is missing:** build the framework first with `npm run build:framework`; the benchmark reads `dist/nodula/nodula-core.js` when present.
- **Benchmark timings differ between runs:** Happy DOM timings are comparative. Keep machine/load and benchmark variables stable; use real-browser profiling for user-visible claims.
- **List update recreates rows:** verify keys represent stable item identity and remain unique across updates.
- **Bundle still includes an optional add-on:** inspect imports and build output; production tree-shaking behavior is verified with Vite fixtures, not exhaustively across all consumer bundlers.
- **App feels slow despite quick render benchmark:** investigate network, JavaScript outside Nodula bindings, browser layout/paint, DOM size, and third-party code in the actual application.
- **Initial route/code is large:** consider lazy route modules or `visibleIsland()` for content that need not load immediately, while accounting for loading/error UX.

Runtime-size targets and broader bundler/browser recommendations remain unverified; see [Specifications and Limits](/guide/specifications). The benchmark is not part of `npm test`; run it separately when comparing rendering work.

## Related guides

- [Reactivity and DOM](/guide/reactivity) — tracked updates and bindings.
- [List Rendering](/guide/list-rendering) — stable keys and list reconciliation.
- [Async Components and Lazy Loading](/guide/async-components) — lazy routes and visible islands.
- [Animations](/guide/animations) — optional motion and reduced-motion handling.
- [Testing](/guide/testing) — test scope and browser-test limitations.
- [Specifications and Limits](/guide/specifications) — verified behavior and open performance targets.