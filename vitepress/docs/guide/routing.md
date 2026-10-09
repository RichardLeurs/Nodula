# Router Add-on

The optional `nodula-framework/router` add-on provides client-side hash or History API navigation. Use `createRouter` with an explicit route map, or `createFileRouter` to discover routes from a Vite `import.meta.glob` map. Routing stays outside the core runtime. Route guards control client navigation only; servers must still authorize protected data and operations.

## Install and import

Import either router from the router package entry:

```js
import { createRouter, createFileRouter } from 'nodula-framework/router';
```

For `.page` and `.comp` single-file components, configure `nodulaPlugin` from `nodula-framework/vite`. The plugin compiles those files; it is separate from the router, which consumes component modules or loaders. See [Tooling](/guide/tooling).

## Quick start: explicit routes

Route-map values can be eager component functions or lazy entries with a `load()` function:

```js
import { createRouter } from 'nodula-framework/router';
import HomePage from './routes/index.page';

const router = createRouter({
  '/': HomePage,
  '/about': { load: () => import('./routes/about.page') },
});

document.querySelector('#app').append(router.view());
router.navigate('/about');
```

Hash mode is default. Set `{ mode: 'history' }` to read paths from `window.location.pathname`, use the History API, and intercept ordinary same-origin links. Production hosting must return the app entry HTML for unknown paths; see [Hosting history routes](#hosting-history-routes).

## Quick start: file-based routes

Pass Vite’s glob result to `createFileRouter`:

```js
import { createFileRouter } from 'nodula-framework/router';

const router = createFileRouter(
  import.meta.glob('./routes/**/*.page'),
  undefined,
  { mode: 'history' },
);
```

Given this route tree:

```text
routes/
├── index.page       → /
├── guide.page       → /guide
└── ideas/
    ├── [id].page    → /ideas/:id
    └── layout.page  → layout for /ideas/:id
```

`index.page` maps to `/`. A `[id].page` segment matches exactly one path segment; its decoded value is passed in `params.id`. A `layout.page` wraps descendant pages and receives `{ params, children }`; render `children` with `<outlet :view="children" />`. Catch-all segments are not supported.

## API reference

### `createRouter(routes, fallback?, options?)`

Creates a router from an explicit route map.

| Argument / option | Type | Default | Description |
|---|---|---|---|
| `routes` | `Record<string, RouteDefinition>` | Required | Maps paths to component functions or lazy route entries. |
| `fallback` | `() => Node` | Full-viewport centered `Page not found` element | Creates the node shown when no route matches. The default fallback is styled inline; provide a custom fallback to control its presentation. |
| `options.mode` | `'hash' \| 'history'` | `'hash'` | Selects hash or History API navigation. Other values throw. |
| `options.beforeEach` | `NavigationGuard` | None | Optional async or sync guard run before initial render and each navigation. |

```ts
type NavigationGuard = (context: { to: string; from: string }) =>
  true | false | string | void | Promise<true | false | string | void>;

type LazyRoute = {
  load: () => Promise<Component | { default: Component }>;
  context?: ComponentContext;
};
```

The returned router exposes:

| Member | Type | Behavior |
|---|---|---|
| `mode` | `'hash' \| 'history'` | Active routing mode. |
| `current()` | `string` | Current route path. |
| `view()` | `Node` | Current route node, fallback, or pending/loading status node. |
| `navigate(path)` | `(path: string) => void` | Navigates to a same-origin path; throws for empty or cross-origin paths. |
| `navigationPending()` | `boolean` accessor | True while a navigation guard is pending. |
| `canRender()` | `boolean` accessor | False until the initial guarded route is allowed. |

### `createFileRouter(files, fallback?, options?)`

Discovers pages and layouts from a Vite `import.meta.glob` result and returns the same `Router` interface. File keys must match the supported `routes/**/*.page` structure. Pages and layouts may be eager modules or lazy loader functions. Duplicate or ambiguous paths and unsupported filenames are rejected.

## Behavior and lifecycle

- Lazy route modules load on first allowed visit and successful modules are cached. Pending routes render an empty node until loaded; a rejected loader logs the load error and renders `Could not load this page.`
- File-based routes load matched page and layout modules only after guards allow navigation.
- A guard returning `true` or `undefined` allows navigation; `false` cancels; a path string redirects. Redirect loops and unsupported return values are reported as guard failures.
- For the initial route, `canRender()` remains false until the guard allows a route. `navigationPending()` reflects guard execution.
- History mode intercepts ordinary same-origin links. External links, modified clicks, downloads, links opening a new window, and same-page anchors remain browser-controlled.
- The router removes its `popstate` or `hashchange` listener on owner disposal. History mode also removes its document click listener. Pending guards and lazy loads do not update a disposed router.

## Errors, limitations, and security

- `mode` must be `'hash'` or `'history'`.
- Navigation paths must be non-empty and same-origin. The router does not navigate to other origins.
- Lazy loaders must resolve to a component function or a module whose `default` export is a component function. Invalid results display the load-failure node.
- File routing supports static segments and single-segment parameters only. Catch-all routes are unsupported.
- Guards are client-side navigation UX, not access control. Enforce authorization in server routes and APIs regardless of hidden pages or guard results.
- History mode requires SPA fallback configuration on production hosts for direct visits and refreshes.

## Examples and related resources

- The demo registers routes in [`demo_app/src/routes.js`](https://github.com/RichardLeurs/nodula/blob/main/demo_app/src/routes.js) and uses a guard in `demo_app/src/demo-auth.js`.
- See [Tooling](/guide/tooling) for the `.page` compiler, [Authentication](/guide/auth) for the demo auth adapter, and [Security](/guide/security) for server authorization guidance.
- Router behavior is covered by `framework/vitest/router.test.js` and the app integration test `demo_app/vitest/admin-route.test.js`.

## Hosting history routes

In History API mode, production hosting must serve the app’s entry HTML for unknown page paths. Without that fallback, a direct visit or refresh of `/guide` can return a server 404 before the client router starts. Vite development and preview servers provide SPA fallback; hash mode does not require path-based fallback.