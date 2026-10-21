// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { nodulaPlugin } from "./vite-plugin.js";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
/**
 * Resolve a path relative to this config file.
 *
 * @param {string} path
 * @returns {string} Absolute file path.
 */
const source = (path) => fileURLToPath(new URL(path, import.meta.url));
const addonNames = [
  "animation",
  "auth",
  "data",
  "dialog",
  "drawer",
  "form",
  "island",
  "localstorage",
  "modal",
  "navigation-dropdown",
  "navigation",
  "notifications",
  "pwa",
  "router",
  "seo",
  "seo-vite",
  "store",
  "resource",
  "suspense",
  "props",
  "sortable",
  "filedrop",
  "web-components",
];

export default defineConfig({
  root: projectRoot,
  plugins: [nodulaPlugin()],
  resolve: {
    alias: [
      { find: /^nodula-framework$/, replacement: source("./index.js") },
      ...addonNames.map((name) => ({
        find: `nodula-framework/${name}`,
        replacement: source(`./addons/${name}.js`),
      })),
      { find: "nodula-framework/data-pocketbase", replacement: source("./addons/data-adapters/pocketbase.js") },
      { find: "nodula-framework/data-supabase", replacement: source("./addons/data-adapters/supabase.js") },
      { find: "nodula-framework/data-rest", replacement: source("./addons/data-adapters/rest.js") },
    ],
  },
  test: {
    root: projectRoot,
    include: ["framework/vitest/**/*.test.js"],
    environment: "node",
    fileParallelism: false,
    pool: "threads",
    maxWorkers: 1,
    css: { include: [/\.css\?inline/] },
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
