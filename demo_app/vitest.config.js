// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { nodulaPlugin } from '../framework/vite-plugin.js';
import { nodulaRuntimePlugin } from './build/runtime-plugin.js';

const demoRoot = fileURLToPath(new URL('.', import.meta.url));
/**
 * Resolve a path relative to this config file.
 *
 * @param {string} path
 * @returns {string} Absolute file path.
 */
const frameworkSource = (path) => fileURLToPath(new URL(path, import.meta.url));
const addonNames = [
  'animation',
  'auth',
  'data',
  'dialog',
  'drawer',
  'form',
  'localstorage',
  'modal',
  'navigation-dropdown',
  'navigation',
  'notifications',
  'pwa',
  'router',
  'seo',
  'seo-vite',
  'store',
  'resource',
  'sortable',
  'filedrop',
];

export default defineConfig({
  root: demoRoot,
  plugins: [nodulaPlugin(), nodulaRuntimePlugin()],
  resolve: {
    alias: [
      { find: /^nodula-framework$/, replacement: frameworkSource('../framework/index.js') },
      ...addonNames.map((name) => ({
        find: `nodula-framework/${name}`,
        replacement: frameworkSource(`../framework/addons/${name}.js`),
      })),
      // The adapters live in their own folder, so they cannot follow the `${name}.js` pattern above.
      {
        find: 'nodula-framework/data-pocketbase',
        replacement: frameworkSource('../framework/addons/data-adapters/pocketbase.js'),
      },
      {
        find: 'nodula-framework/data-supabase',
        replacement: frameworkSource('../framework/addons/data-adapters/supabase.js'),
      },
      {
        find: 'nodula-framework/data-indexeddb',
        replacement: frameworkSource('../framework/addons/data-adapters/indexeddb.js'),
      },
      {
        find: 'nodula-framework/data-firebase',
        replacement: frameworkSource('../framework/addons/data-adapters/firebase.js'),
      },
      {
        find: 'nodula-framework/data-rest',
        replacement: frameworkSource('../framework/addons/data-adapters/rest.js'),
      },
    ],
  },
  test: {
    root: demoRoot,
    include: ['vitest/**/*.test.js'],
    environment: 'node',
    fileParallelism: false,
    pool: 'threads',
    maxWorkers: 1,
    css: { include: [/\.css\?inline/] },
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});