import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { nodulaPlugin } from './vite-plugin.js';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const source = (path) => fileURLToPath(new URL(path, import.meta.url));
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
  'sortable',
];

export default defineConfig({
  root: projectRoot,
  plugins: [nodulaPlugin()],
  resolve: {
    alias: [
      { find: /^nodula-framework$/, replacement: source('./index.js') },
      ...addonNames.map((name) => ({
        find: `nodula-framework/${name}`,
        replacement: source(`./addons/${name}.js`),
      })),
    ],
  },
  test: {
    root: projectRoot,
    include: ['framework/vitest/**/*.test.js'],
    environment: 'node',
    fileParallelism: false,
    pool: 'threads',
    maxWorkers: 1,
    css: { include: [/\.css\?inline/] },
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});