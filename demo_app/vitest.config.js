import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { nodulaPlugin } from '../framework/vite-plugin.js';

const demoRoot = fileURLToPath(new URL('.', import.meta.url));
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
  'navigation',
  'notifications',
  'pwa',
  'router',
  'seo',
  'seo-vite',
  'store',
];

export default defineConfig({
  root: demoRoot,
  plugins: [nodulaPlugin()],
  resolve: {
    alias: [
      { find: /^nodula-framework$/, replacement: frameworkSource('../framework/index.js') },
      ...addonNames.map((name) => ({
        find: `nodula-framework/${name}`,
        replacement: frameworkSource(`../framework/addons/${name}.js`),
      })),
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