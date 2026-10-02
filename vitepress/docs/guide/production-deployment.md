# Production Deployment

Build the repository demo with `npm run build` and inspect the generated `dist/` output. The framework bundles are emitted separately under `dist/framework/`; build the framework before an app-only build.

The demo build also copies its 64×64 PNG favicon to `dist/assets/logo-64x64.png`, referenced by the built `index.html`.

For history-mode routing, configure the host to return `index.html` for unknown app paths so direct visits and refreshes reach the client router. If an app needs the demo's `/api`, replace its local Python server and Vite proxy with a production-grade same-origin API, authentication/authorization, HTTPS, and persistent storage. The demo's Python `http.server` has no authentication and must not be exposed publicly. See [Getting Started](/guide/getting-started).

For an app using the optional PWA integration, deploy the generated web manifest and service worker from the build output at the configured base path, use HTTPS (except for localhost), and configure SPA navigation fallbacks without intercepting the service worker or manifest requests. Review any Workbox runtime caching rules before caching API or user-specific responses. See [Progressive Web Apps](/guide/pwa).
