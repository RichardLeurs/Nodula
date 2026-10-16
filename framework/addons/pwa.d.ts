import type { Plugin } from "vite";

export interface NodulaPWAOptions {
  /** Generate a service worker that prompts before activating updates, or opts into automatic activation/reload. */
  registerType?: "prompt" | "autoUpdate";
  /** Web app manifest fields from the Web App Manifest specification. */
  manifest?: Record<string, unknown> | false;
  /** Enable service-worker support in the Vite development server (disabled by default). */
  devOptions?: { enabled?: boolean; [option: string]: unknown };
  /** Workbox generateSW options such as globPatterns and runtimeCaching. */
  workbox?: Record<string, unknown>;
  /** Use a custom service worker and inject the precache manifest. */
  strategies?: "generateSW" | "injectManifest";
  /** Other options are forwarded to vite-plugin-pwa. */
  [option: string]: unknown;
}

/** Create Vite PWA plugins for a Nodula app. Add the returned plugins to `vite.config.js`. */
export function nodulaPWA(options?: NodulaPWAOptions): Plugin[];
