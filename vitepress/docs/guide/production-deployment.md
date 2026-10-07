# Production Deployment

Build the repository demo with `npm run build` and inspect the generated `dist/app/` output. The app build copies framework runtime and add-on bundles into `dist/app/nodula/`, matching the `/nodula/` URLs referenced by generated JavaScript. The build then checks that every service-worker precache entry exists in `dist/app/`; treat failures as incomplete or inconsistent build output. Deploy the contents of `dist/app/` as the site root, preserving the `nodula/` subdirectory. Build the framework before an app-only build.

## Cache and deployment order

Configure the host to revalidate shell and PWA control files, rather than keeping old copies for days:

| Files | Suggested cache policy |
|---|---|
| `index.html`, `sw.js`, `workbox-*.js`, `manifest.webmanifest` | `Cache-Control: no-cache, must-revalidate` |
| Fingerprinted files under `assets/` | `Cache-Control: public, max-age=31536000, immutable` |

Publish each build atomically: upload new assets first, then publish the new HTML and service worker together. Keep previous fingerprinted assets available for at least the maximum lifetime of open pages and installed service workers, because an existing client may still request chunks from the previous build during activation or navigation. Do not delete old chunks before clients can no longer reference them.

The demo keeps image sources in `demo_app/src/assets/images/`; its build copies the 64×64 PNG favicon from that directory to `dist/assets/logo-64x64.png`, referenced by the built `index.html`.

For history-mode routing, configure the host to return `index.html` for unknown app paths so direct visits and refreshes reach the client router. If an app needs the demo's `/api`, replace its local Python server and Vite proxy with a production-grade same-origin API, authentication/authorization, HTTPS, and persistent storage. The demo's Python `http.server` has no authentication and must not be exposed publicly. See [Getting Started](/guide/getting-started).

For an app using the optional PWA integration, deploy the generated web manifest and service worker from the build output at the configured base path, use HTTPS (except for localhost), and configure SPA navigation fallbacks without intercepting the service worker or manifest requests. Review any Workbox runtime caching rules before caching API or user-specific responses. See [Progressive Web Apps](/guide/pwa).
