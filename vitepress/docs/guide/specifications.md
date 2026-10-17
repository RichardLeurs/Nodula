# Specifications and Limits

This page is the overview of what Nodula provides and where it stops. Each area links to a guide with the options and examples. “Implemented” means the capability exists in the current source and public API; it does not imply support in every browser, deployment, or bundler. “Unverified target” means it is not a compatibility or release promise.

## What Nodula provides

| Area | Provides | Guide |
|---|---|---|
| Reactivity and ownership | Signals, computed values, synchronous effects, batching, owner scopes and cleanup. | [Reactivity](/guide/reactivity), [Framework Core](/guide/framework-core) |
| DOM and components | `h`, `fragment`, `mount`, keyed lists, reactive properties, custom elements, visible islands. | [Framework Core](/guide/framework-core), [List Rendering](/guide/list-rendering) |
| Single-file components | `.page` and `.comp` files compiled by the Vite plugin: templates, scoped and module styles, bindings, slots. | [Single-File Components](/guide/templates), [Styles](/guide/styles) |
| Routing | Hash and History routing, guards, explicit and file routes, lazy loading, catch-all patterns, load-failure handling. | [Routing](/guide/routing) |
| Forms | Values, validation, touched state, submission, reset, and per-field helpers with stable IDs and ARIA attributes. | [Forms](/guide/forms) |
| Async data | Resources with loading state, refetch and cancellation; a Fetch-based data client. | [Async Resources](/guide/resource), [Data](/guide/data) |
| Storage | localStorage and IndexedDB signals, cookie helpers. | [Local Storage](/guide/local-storage) |
| Navigation and UI | Navigation links, dropdowns, dialogs, modals, drawers, notifications, animations. | [Navigation](/guide/navigation), [Modals](/guide/modals) |
| Drag and drop | Native drag sources, drop targets, sortable lists, file drop and file upload. | [Drag and Drop](/guide/drag-and-drop), [Sortable Lists](/guide/sortable-lists), [File Drop](/guide/file-drop) |
| Metadata | Client route metadata, Open Graph and Twitter tags, build-time sitemap and robots. | [SEO](/guide/seo) |
| Consent | Versioned consent, preference UI, consent-gated Google Analytics. | [Cookie Consent](/guide/cookie-consent) |
| Auth | Adapter-backed client identity state and role or permission checks for the UI. | [Authentication](/guide/auth) |
| Build | Vite plugin, tree-shaking across package entries, optional PWA integration. | [Tooling](/guide/tooling), [PWA](/guide/pwa) |

Optional features stay outside the core entry. Check the package `exports` and each guide for exact options and peer requirements.

## Limits

These are the boundaries Nodula does not cross. Read them before choosing it for an application.

- **Rendering:** client rendering only. There is no server-side rendering or hydration, and a browser DOM is required.
- **Template subset:** one root element per component. No JSX, no TypeScript inside templates, no prop schemas, no attribute fallthrough, no scoped-slot props, and no arbitrary dynamic component lookup. This is not a full Vue, Svelte or JSX compiler.
- **Bindings:** an explicit getter and setter pair, for `value` or `checked` only.
- **Lists:** keys must be stable and unique. The core `list()` helper reads each row's item once per key; `each()` in templates gives rows reactive accessors, so prefer it.
- **Reconciliation:** unkeyed insertions are not identified, and incompatible element types are not reused.
- **Computed values:** no independent disposer; create them inside an owner.
- **Visible islands:** not a general async component or Suspense system. The inserted component does not get its own reactive root.
- **`h()`:** must run inside a root or effect; outside one it throws.
- **Forms:** validation is synchronous and runs in your code. Field helpers provide IDs and ARIA attributes but no markup or messages. Client validation is not server validation.
- **Resources:** no cache, retry policy or Suspense integration. Failures are reported through `error`.
- **Storage:** no cross-tab `sync` option. A blocked IndexedDB open stays memory-only until it completes. When another tab upgrades the database, this tab releases its connection and continues in memory. Cookie helpers cannot set or read `HttpOnly` cookies.
- **Routing:** guards are client-side navigation controls, not authorization. History mode needs a host fallback for direct visits and refreshes. The `base` option is History-only, and no base path is inferred.
- **Data:** no retry, authentication, authorization or proxy by default.
- **Drag and drop:** does not change your data, sanitize payloads, or provide keyboard or touch alternatives.
- **File drop and upload:** type checks do not inspect file contents. Server validation, storage and preview policy are yours.
- **Auth:** role and permission checks affect the UI only. Your server must enforce access.
- **Cookie consent:** you must stop optional integrations loading before consent. A loaded `gtag.js` cannot be unloaded, so withdrawal relies on Consent Mode. Google Analytics accepts GA4 `G-` IDs only.
- **Native dialogs:** the `open`-attribute fallback has no focus management or background inertness.
- **PWA:** cache behaviour depends on your configuration.
- **SEO:** metadata is client-side, with no server-rendered tags. The canonical URL is also set in hash mode, where search engines may ignore the fragment. `seo-vite` needs an explicit route list.
- **Accessibility:** Nodula provides semantics and hooks, not an audit or a conformance guarantee. Test with assistive technology.
- **Security:** the repository's example Python API has no authentication or per-user authorization and must not be exposed publicly.

## Verification and unverified targets

- Framework behaviour is covered by Vitest suites in `framework/vitest/`. Demo integration tests are under `demo_app/vitest/`.
- Tree-shaking is checked with Vite production builds of a consumer fixture for each public entry, under the tested configuration. Other bundlers and consumer setups are not exhaustively verified.
- Tests run in Happy DOM, which is not a real browser. They do not establish layout, paint, focus behaviour in real engines, or screen-reader behaviour.
- The render benchmark (`npm run benchmark:render`) gives relative comparisons of Happy DOM timings. It is not a real-browser or user-latency measurement.
- Automated accessibility checks, real-browser compatibility, runtime-size targets, production code-splitting guarantees and cross-engine benchmarks remain unverified targets. Do not treat recommended targets as release promises.

Useful repository checks:

```sh
npm test
npm run test:framework
npm run test:demo
npm run benchmark:render
```

See [Testing](/guide/testing) for suite details and limitations, [Performance](/guide/performance) for benchmark interpretation, [Styles and CSS Modules](/guide/styles) for CSS integration choices, and [Installation](/guide/installation) for repository and package boundaries.

## Related guides

- [Framework Core](/guide/framework-core): core API and lifecycle behaviour.
- [Single-File Components](/guide/templates): compiler syntax and restrictions.
- [Routing](/guide/routing): route modes, parameters, lazy loading and hosting fallback.
- [Async Resources](/guide/resource): loading state, refetch and cancellation.
- [Accessibility](/guide/accessibility) and [Security](/guide/security): application responsibilities.
- [Testing](/guide/testing), [Performance](/guide/performance) and [Production Deployment](/guide/production-deployment): verification and deployment boundaries.
