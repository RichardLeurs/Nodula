# Progressive Web Apps

Nodula's optional `nodula-framework/pwa` add-on integrates the Vite PWA plugin into a Vite app. It is a build-time integration: PWA support is not included in the Nodula browser runtime, and apps opt in by adding the returned plugins to their Vite configuration.

The Nodula demo opts in with `...nodulaPWA()` in its `vite.config.js`. Pass options when you want to provide app-specific manifest metadata, icons, or caching behavior.

Install the integration and its Vite plugin:

```
npm install -D vite-plugin-pwa
```

Then configure the PWA plugin alongside the plugins already used by the app:

```
import { defineConfig } from 'vite';
import { nodulaPWA } from 'nodula-framework/pwa';
import { nodulaPlugin } from 'nodula-framework/vite';

export default defineConfig({
  plugins: [
    nodulaPlugin(),
    ...nodulaPWA({
      registerType: 'prompt',
      manifest: {
        name: 'My Nodula App',
        short_name: 'Nodula App',
        description: 'A progressive web app built with Nodula.',
        theme_color: '#101b25',
        background_color: '#101b25',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
```

Put the referenced icons in Vite's `public/` directory. `nodulaPWA(options)` accepts the `vite-plugin-pwa` options and returns its Vite plugin list; by default it uses `registerType: 'prompt'`, so the app can decide when to reload after an update. Pass `registerType: 'autoUpdate'` only if immediate updates and page reloads are appropriate for the app.

The plugin generates a web app manifest and a service worker that precaches build assets. It does not automatically cache API responses. Add Workbox `runtimeCaching` rules only for resources whose offline and freshness behavior you have considered. During development, the service worker is off by default; set `devOptions: { enabled: true }` when you specifically need to test it locally.

Production PWA features require HTTPS (except localhost) and correct hosting of the built manifest and service-worker files under the intended app scope. Configure SPA history fallbacks on the host as usual, and test installation, update behavior, and offline navigation in a production-like build. See [Production Deployment](/guide/production-deployment) for the app build workflow.
