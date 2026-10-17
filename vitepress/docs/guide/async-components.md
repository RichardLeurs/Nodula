# Async Components and Lazy Loading

Nodula has two focused ways to defer component code: the router lazy-loads matched route/page modules, and core `visibleIsland()` delays an independent component until its placeholder enters the viewport. These have different loading triggers and result contracts. Nodula does not provide a general `defineAsyncComponent` wrapper or a `Suspense` component.

## Choose loading strategy

| Need | Use | When code loads |
|---|---|---|
| Defer a route page/layout until navigation matches it | Lazy route or `createFileRouter()` loader | When router activates that route after navigation guards allow it. |
| Defer non-route content until near viewport | `visibleIsland(loader, placeholder?)` | When the placeholder intersects the viewport; immediately if `IntersectionObserver` is unavailable. |
| Load data while keeping component mounted | Signals plus `@if`/`@else` or reactive DOM | Your application calls the async operation and manages pending/error/result state. |

## Lazy route modules

### Explicit route map

An explicit router accepts a route entry with a `load()` function. The loader may resolve directly to a component function or to a module with a default component export:

```js
import { createRouter } from 'nodula-framework/router';
import { h, mount } from 'nodula-framework';

const router = createRouter({
  '/': () => h('p', {}, 'Home'),
  '/reports': {
    load: () => import('./routes/Reports.page'),
  },
});

const dispose = mount('#app', () => h('main', {}, router.view));
router.navigate('/reports');
// Call dispose() when this mounted view is removed.
```

Lazy route entries can include `context` passed to the component when rendered. The explicit router loads a matched route on first use, shows an empty text node while its module is pending, shows `Could not load this page.` if loading fails, and caches a successfully resolved route component. A lazy entry is not preloaded merely because it appears in the route map.

### File-based routes

`createFileRouter()` accepts the Vite `import.meta.glob()` result. By default, Vite supplies lazy loader functions, so only the matched `.page` module and applicable layout chain are requested:

```js
import { createFileRouter } from 'nodula-framework/router';

const router = createFileRouter(
  import.meta.glob('./routes/**/*.page'),
  undefined,
  { mode: 'history' },
);
```

The matched page and its layouts load after route guards allow navigation. Successful modules are cached. File route loaders must resolve to modules whose `default` export is a component function. `createFileRouter()` discovers `.page` route/layout files only; `.comp` child components are imported by compiled pages separately. See [Routing](/guide/routing) for route naming, layouts, guards, and history fallback requirements.

## Load non-route content when visible

`visibleIsland(loader, placeholder?, options?)` creates a placeholder `<div>` and defers invoking `loader` until that container intersects the viewport:

```html
<script>
import { visibleIsland } from 'nodula-framework';

const loadExtraCard = async () => {
  const module = await import('../components/ExtraCard.comp');
  return module.default;
};
</script>

<template>
  <main>
    <h1>Overview</h1>
    <div use:visibleIsland="visibleIsland(loadExtraCard, 'Loading extra card…')"></div>
  </main>
</template>
```

`options.errorText` replaces the English text shown when the loader fails; the element keeps `data-nodula-code="nodula-island-load-failed"` so the text can be found and translated by code.

The loader must resolve to a component function. Unlike a router loader, `visibleIsland()` does not unwrap `{ default: Component }` itself; return `module.default` as shown. On success, Nodula calls the function with no component context and replaces the placeholder content with its returned node.

If `IntersectionObserver` is unavailable, loading begins immediately. When loading fails, the placeholder displays `Could not load this section.` and the error is logged. If the owner is disposed before the loader finishes, late resolution does not insert the component. The helper disconnects its observer on cleanup.

`visibleIsland()` is a browser/DOM feature. It is not a route registration mechanism and does not provide a loading state API, retry control, cancellation of the underlying import, or error boundary.

## Pending and error UI for other async work

For data requests or other asynchronous work, store pending, error, and result state in signals and render the corresponding states explicitly:

```html
<script>
import { signal } from 'nodula-framework';

const [status, setStatus] = signal('loading');
const [message, setMessage] = signal('');

async function loadSummary() {
  try {
    const response = await fetch('/api/summary');
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const summary = await response.json();
    setMessage(summary.message);
    setStatus('ready');
  } catch {
    setStatus('error');
  }
}

void loadSummary();
</script>
```

**Compiler note:** Nodula currently supports adjacent `@if` and `@else`, not Vue-style `@else-if`. Use nested conditional templates instead:

```html
<template>
  <section>
    <p @if="status() === 'loading'">Loading summary…</p>
    <template @else>
      <p @if="status() === 'error'">Summary could not be loaded.</p>
      <p @else>{{ message() }}</p>
    </template>
  </section>
</template>
```

Each `@else` must immediately follow its paired `@if` branch (whitespace is allowed). For a full explanation of state-driven rendering, see [Conditional Rendering](/guide/conditional-rendering). 

## Errors, limitations, and troubleshooting

- **Route stays blank while loading:** a pending lazy route currently renders an empty text node; provide application-level navigation/loading UI if needed.
- **Route displays load failure:** ensure the route loader resolves to a component function or a module with a function-valued `default` export. File-router page/layout modules require the default export form.
- **Island shows failure:** ensure its loader resolves to a component function, not the dynamic-import module object itself; return `module.default`.
- **Island loads immediately:** `IntersectionObserver` may be unavailable in the environment, which intentionally falls back to immediate loading.
- **Island does not load:** confirm the placeholder can intersect the viewport and that `use:visibleIsland` uses the core helper in a compiled template.
- **Resolved component does not appear after removal:** disposal suppresses late insertion by design; mount a fresh owner to create a new placeholder.
- **Expecting suspense/fallback components:** no general async-component wrapper, Suspense boundary, built-in retry policy, or loading/error slot exists. Model those UI states explicitly or use router/island behavior.
- **Import fails in a `.page`/`.comp`:** verify Nodula's Vite compiler is configured and the import path is valid; see [Tooling](/guide/tooling).

## Related guides

- [Routing](/guide/routing) — lazy routes, route guards, layouts, and module caching.
- [Performance](/guide/performance) — evaluate deferral and loading costs.
- [Conditional Rendering](/guide/conditional-rendering) — render pending, error, and success states.
- [Single-File Components](/guide/templates) — use `visibleIsland` in compiled templates.
- Router tests: `framework/vitest/router.test.js`; island compiler coverage: `framework/vitest/compiler.test.js`.