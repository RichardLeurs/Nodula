# Routing

Nodula provides manual routing with `createRouter` and optional Vite file-based routing with `createFileRouter`. Both are client-side routers supplied by the optional `nodula-framework/router` add-on rather than the core runtime. The demo app uses `createRouter` with the explicit route map in `demo_app/src/routes.js`.

## Manual routes

Use `createRouter(routes, fallback, options)` for an explicit route map. Route values are components keyed by pathname; options can enable History API mode and navigation guards:

```
import { createRouter } from 'nodula-framework/router';
import HomePage from './routes/index.page';
import AboutPage from './routes/about.page';

const routes = {
  '/': HomePage,
  '/about': AboutPage,
};

const router = createRouter(routes, NotFoundPage, { mode: 'history' });
```

For parameterized routes, match the current path and return a component renderer with decoded params. The demo's `routes.js` demonstrates this for `/ideas/:id` and composes an ideas layout around the detail page.

## File-based routes

`createFileRouter` is a public runtime API that consumes Vite's `import.meta.glob` result; it does not compile `.page` files. To compile `.page` and `.comp` files in a Vite app, install and configure `nodulaPlugin` from `nodula-framework/vite` (see [Tooling](/guide/tooling)). To use file-based routing instead of maintaining an explicit route map:

```
import { createFileRouter } from 'nodula-framework/router';

const router = createFileRouter(
  import.meta.glob('./routes/**/*.page'),
  undefined,
  { mode: 'history' },
);
```

For the optional file-based example, pages can live under a `routes/` directory:

```
routes/
├── index.page       # /
├── guide.page       # /guide
└── ideas/
    ├── [id].page    # /ideas/:id
    └── layout.page  # wraps pages in this directory
```

`index.page` maps to `/`; `[id].page` matches one path segment and makes the decoded value available as `params.id`. Catch-all segments are not supported. A `layout.page` wraps descendant pages (a root layout wraps all routes) and receives `children`; render it with `<outlet :view="children" />`.

By default, the router uses hash navigation. Pass `{ mode: 'history' }` to use the pathname and History API. Lazy glob loaders load the matched page and its layouts on demand, show loading/error content, and cache successful imports. Manual route maps and eager glob modules are also supported.

Both routers accept an optional `beforeEach` guard. It runs before the initial route is rendered and before later navigations. Return `true` or `undefined` to allow, `false` to cancel, or a path string to redirect. Async guards are supported; `router.navigationPending()` reports a pending guard, and `router.canRender()` stays false until the initial route is allowed. With `createFileRouter`, page and layout loaders do not run until the guard allows the route.

```
const router = createFileRouter(import.meta.glob('./routes/**/*.page'), undefined, {
  mode: 'history',
  beforeEach: async ({ to }) => {
    if (to.startsWith('/account') && !auth.isAuthenticated()) return '/login';
    return true;
  },
});
```

This is client-side navigation control, not authorization security. Enforce access to protected data and APIs on the server as well.

## Manual routes

The router exposes `current`, `view()`, and `navigate(path)`. In history mode, ordinary same-origin links are intercepted; external links, modified clicks, downloads, new-window links, and same-page anchors are left to the browser.

## Hosting history routes

With history mode, production hosting must serve the app's `index.html` for unknown page paths. Without that fallback, a direct visit or refresh of `/guide` may return a server 404 before the client router starts. Vite's development and preview servers provide SPA fallback. Hash mode does not require path-based server fallback.
