import { VitePWA } from 'vite-plugin-pwa';

/** Create an opt-in Vite PWA plugin configured for a Nodula application. */
export function nodulaPWA(options = {}) {
  return VitePWA({
    ...options,
    registerType: options.registerType ?? 'prompt',
  });
}