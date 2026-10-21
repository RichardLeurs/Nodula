# Production Deployment

This guide describes building and hosting Nodula's repository demo. A separately structured application may use a different output directory, base path, API, and service-worker configuration; adapt these steps to that app's Vite config rather than assuming demo-specific paths apply unchanged.

## Build the repository demo

From the repository root, install dependencies and open the menu:

```sh
npm install
npm run nodula
```

Choose **Build everything** to build the framework package, demo app, web components and docs. `npm run build` runs the same steps directly, so CI can keep calling it.

The root `npm run build` packages the framework, checks generated declarations, builds the app, builds the web components, then builds the docs. It does not run the test suites; run `npm test` (menu entry **Run all tests**) before deploying. For an app-only rebuild after framework outputs already exist:

```sh
npm run build:app
```

An app-only build does not create framework bundles. Build those first when absent or stale:

```sh
npm run build:framework
npm run build:app
```

The demo app build writes the deployable site to `dist/app/`. It copies framework core and add-on bundles into `dist/app/nodula/`; generated application chunks refer to those `/nodula/` URLs. App CSS is emitted under `dist/app/assets/css/`, and images under `dist/app/assets/images/`, including the favicon referenced at `/assets/images/logo-64x64.png`. Deploy the complete contents of `dist/app/` as the site document root, preserving `assets/css/`, `assets/images/`, `nodula/`, `index.html`, and generated PWA files.

The demo uses root-relative paths (including `/assets/...` and `/nodula/...`). Hosting it under a URL subdirectory requires configuring Vite's base path and reviewing the manifest, service-worker scope, router URLs, and asset URLs together; changing only the upload directory is not sufficient.

## Preview and verify output

Preview the built demo locally:

```sh
npm --prefix demo_app run preview
```

The demo build runs `demo_app/mjs/verify-precache.mjs`, which verifies that every URL in the generated service-worker precache manifest points to a file in `dist/app/`. If verification fails, rebuild and deploy the complete matching output; do not publish an HTML or service worker that points to missing assets. Preview validates the app build, but does not reproduce your production CDN, headers, DNS, API, TLS, or hosting rewrites.

## Configure routing fallback

The demo uses the History API router. Configure the production host to serve the app's `index.html` for unknown application paths, while still serving real assets and API endpoints normally. Without this single-page-app fallback, direct visits and browser refreshes of routes such as `/guide` can receive a server 404 before Nodula starts.

Keep the fallback scoped to application navigation. Do not rewrite missing `/assets/...`, `/nodula/...`, service-worker, manifest, or API requests to `index.html`; returning HTML for a missing JavaScript chunk or API response hides the actual error and can break runtime behavior. Hash-mode routers do not need path-based fallback because the fragment is not sent to the server.

History fallback is hosting configuration, not a Nodula runtime feature. Test direct route visits, refreshes, unknown paths, and static asset 404s on the actual host.

## Cache headers and release ordering

Use conservative revalidation for the application shell and PWA control files, and long-lived immutable caching only for content-hashed assets:

| Files | Suggested cache policy |
|---|---|
| `index.html`, `sw.js`, `workbox-*.js`, `manifest.webmanifest` | `Cache-Control: no-cache, must-revalidate` |
| Fingerprinted files under `assets/` (and any versioned framework files, if configured) | `Cache-Control: public, max-age=31536000, immutable` |

Publish releases atomically: upload new assets first, then publish matching HTML and service-worker files. Retain old fingerprinted chunks while open pages or older service workers might still request them. Removing old chunks immediately can break an already-open client during navigation or update activation.

## API, authentication, and secrets

The demo Vite config proxies `/api` to a local development server at `http://localhost:8787`. That proxy is development tooling; it is not included as a production reverse proxy. A deployed app that needs an API must configure its own production API origin/routing, HTTPS, authentication and authorization, persistence, CORS/CSRF protections where applicable, and operational monitoring.

The repository's example Python `http.server` API has no authentication or per-user authorization and is local/demo-only. **Do not expose it publicly or use it as production infrastructure.** Client-side route guards, hidden UI, and browser-side auth checks are not access control; authorize every protected request on the server. Never embed server credentials or secrets in browser bundles. See [Security](/guide/security) and [Authentication](/guide/auth).

## Optional PWA deployment

The demo opts into `nodulaPWA()` in its Vite config. Deploy the generated manifest and service worker at paths consistent with the app's configured base and service-worker scope. Serve production PWAs over HTTPS (localhost is suitable for development). Preserve the generated files referenced by the worker and test install, offline navigation, and update behavior on the target host.

Review Workbox runtime-caching rules before caching API or user-specific responses. Do not precache private data or assume that an app-shell fallback is appropriate for every request. Coordinate service-worker navigation fallback with the host's History API fallback so neither returns the app shell for missing assets, API errors, the manifest, or worker scripts. See [Progressive Web Apps](/guide/pwa) for plugin options and caching boundaries.

## SEO and static output boundaries

The demo config generates sitemap and robots assets during the Vite build using its configured public origin and route list. Set the equivalent values to the real canonical production origin and public route set in your app's build config; do not copy the demo domain or publish private routes in a sitemap. Nodula's runtime is client-rendered and does not provide server-side rendering or hydration, so deployment of static assets alone does not produce server-rendered route HTML or per-route metadata before JavaScript runs. See [SEO](/guide/seo) and [Specifications and Limits](/guide/specifications).

## Deployment checklist

- [ ] Run the production build and resolve framework, app, and precache verification failures.
- [ ] Deploy the complete `dist/app/` output, including `nodula/` and all generated assets.
- [ ] Confirm configured base path matches asset URLs, router URLs, manifest, and service-worker scope.
- [ ] Configure History API fallback only for app routes; preserve 404 behavior for missing assets and APIs.
- [ ] Set revalidation headers on HTML/PWA control files and immutable caching on fingerprinted assets.
- [ ] Publish new assets before shell/service-worker files and retain previous hashed assets during rollout.
- [ ] Replace the local demo API and enforce authorization server-side; keep secrets out of client code.
- [ ] Test direct route refresh, API calls, PWA update/offline behavior, and asset error responses on the production-like host.
- [ ] Review canonical SEO origin, sitemap routes, robots rules, and client-rendering expectations.

## Related guides

- [Quick Start](/guide/quick-start) — build and run the reference app.
- [Tooling](/guide/tooling) — repository Vite and compiler setup.
- [Routing](/guide/routing) — History API behavior and SPA fallback requirements.
- [Progressive Web Apps](/guide/pwa) — service worker and Workbox configuration.
- [Security](/guide/security) and [Authentication](/guide/auth) — server-side trust boundaries.
- [SEO](/guide/seo) — sitemap, robots, and route metadata.
- Build verification: `demo_app/mjs/verify-precache.mjs` and `demo_app/vitest/verify-precache.test.js`.