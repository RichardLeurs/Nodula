// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Configure the optional Vite PWA integration for Nodula applications. */
import { VitePWA } from "vite-plugin-pwa";

/** Create an opt-in Vite PWA plugin configured for a Nodula application. */
export function nodulaPWA(options = {}) {
  return VitePWA({
    ...options,
    registerType: options.registerType ?? "prompt",
  });
}
