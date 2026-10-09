# Progressive Web Apps

Nodula's optional `nodula-framework/pwa` add-on configures `vite-plugin-pwa` for a Vite application. It is a build-time integration, not browser-runtime functionality; apps opt in by adding its returned plugins to Vite. This keeps PWA tooling optional for applications that do not need installability or service workers.

<!-- The Nodula demo opts in with `...nodulaPWA()` in its `vite.config.js`; the Add-ons page lists this PWA integration alongside other optional package entries. Pass options when you want to provide app-specific manifest metadata, icons, or caching behavior. -->

## Install and import

Install Vite and the PWA plugin in the application that uses this add-on:

```sh
npm install -D vite-plugin-pwa
```

The package declares Vite and `vite-plugin-pwa` as optional peer dependencies, so they are needed when configuring this add-on but not for unrelated Nodula package entries. Import `nodulaPWA` in the Vite configuration:

```js
import { nodulaPWA } from 'nodula-framework/pwa';
```

## Quick start

Add its returned plugin list alongside the plugins already used by the app:

```js
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

Put referenced icons in Vite's `public/` directory. `nodulaPWA(options)` accepts `NodulaPWAOptions`, forwards options to `vite-plugin-pwa`, and returns a `vite.Plugin[]`. It defaults `registerType` to `'prompt'`; a supplied `registerType` is preserved.

## API reference

### `nodulaPWA(options?)`

Creates the Vite PWA plugin list.

| Option | Type | Default | Description |
|---|---|---|---|
| `registerType` | `'prompt' \| 'autoUpdate'` | `'prompt'` | Update activation policy. Prompt mode lets the app/user decide when to activate an update; auto-update opts into automatic activation and reload behavior. |
| `manifest` | `Record<string, unknown> \| false` | Plugin default | Web App Manifest fields, or `false` to disable manifest generation. |
| `devOptions` | `{ enabled?: boolean; [option: string]: unknown }` | Development worker disabled by plugin default | Options forwarded to `vite-plugin-pwa`; set `enabled: true` only when specifically testing a dev service worker. |
| `workbox` | `Record<string, unknown>` | Plugin default | Workbox `generateSW` options, including precache patterns and `runtimeCaching`. |
| `strategies` | `'generateSW' \| 'injectManifest'` | `'generateSW'` | Generate a worker or inject the precache manifest into a custom worker. |
| Other plugin options | `unknown` | Plugin defaults | Additional options are forwarded to `vite-plugin-pwa`. |

The add-on exports the `NodulaPWAOptions` TypeScript interface. Its function returns `Plugin[]` from Vite; add every returned plugin to Vite's `plugins` array (commonly via spread).

## Behavior and lifecycle

- During production builds, `vite-plugin-pwa` generates a web app manifest and service worker by default; generated service workers precache build assets according to plugin/Workbox configuration.
- API responses are not automatically runtime-cached. Runtime caching is opt-in through Workbox options; define freshness and offline behavior per resource.
- `registerType: 'prompt'` is default. Choose `'autoUpdate'` only when automatic activation and page reloads fit the app's data-loss and user-experience requirements.
- Development service-worker support is disabled by default. `devOptions: { enabled: true }` opts in for local testing; avoid carrying development-only behavior into production settings.
- `strategies: 'injectManifest'` is available for a custom service worker; configure the corresponding plugin options and worker source as required by `vite-plugin-pwa`.
- The Nodula helper does not register a custom UI for update prompts in application code. It configures and returns Vite plugins; runtime update UX follows the chosen PWA plugin registration strategy.

## Errors, limitations, and security

- This API must run in a Vite configuration context with `vite` and `vite-plugin-pwa` installed. It is not a browser import or service-worker registration helper.
- Manifest and Workbox configuration are forwarded to the upstream plugin; invalid options or build failures are reported by Vite/`vite-plugin-pwa` rather than converted into Nodula-specific errors.
- Production service workers require a secure context (HTTPS, with localhost commonly treated as secure) and correct deployment scope. Ensure manifest and worker files are served at the expected paths and configure SPA history fallback as needed.
- Do not precache private or user-specific responses. Runtime cache rules can expose stale or sensitive data across sessions; exclude authenticated API responses unless cache partitioning, expiry, and logout invalidation are deliberately designed.
- Deploy new hashed assets before publishing a worker that references them, retain previous assets while older clients may request them, and test updates/offline behavior in a production-like environment.

## Examples and related resources

- The demo config opts in at `demo_app/vite.config.js`; its PWA route and manifest are generated as part of the production build.
- PWA build behavior is tested in `framework/vitest/pwa.test.js`.
- See [Production Deployment](/guide/production-deployment) for cache headers and rollout order, and [Security](/guide/security) before caching authenticated data.

The repository demo build verifies generated precache URLs exist in its output. Test installation, update behavior, and offline navigation in a production-like deployment.
