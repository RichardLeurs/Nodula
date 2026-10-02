import { copyFile, cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { nodulaPlugin } from '../framework/vite-plugin.js';
import { nodulaPWA } from '../framework/addons/pwa.js';
import { nodulaSEO } from '../framework/addons/seo-vite.js';

const demoRoot = fileURLToPath(new URL('.', import.meta.url));
const appOutputDirectory = fileURLToPath(new URL('../dist/app', import.meta.url));
const appFrameworkOutputDirectory = fileURLToPath(new URL('../dist/app/framework', import.meta.url));
const frameworkOutputDirectory = fileURLToPath(new URL('../dist/framework', import.meta.url));
const addonOutputs = [
  ['animation', 'nodula-animation.js'],
  ['auth', 'nodula-auth.js'],
  ['data', 'nodula-data.js'],
  ['dialog', 'nodula-dialog.js'],
  ['drawer', 'nodula-drawer.js'],
  ['form', 'nodula-form.js'],
  ['localstorage', 'nodula-localstorage.js'],
  ['modal', 'nodula-modal.js'],
  ['navigation', 'nodula-navigation.js'],
  ['notifications', 'nodula-notifications.js'],
  ['pwa', 'nodula-pwa.js'],
  ['router', 'nodula-router.js'],
  ['seo', 'nodula-seo.js'],
  ['seo-vite', 'nodula-seo-vite.js'],
  ['store', 'nodula-store.js'],
];
const runtimeEntry = fileURLToPath(new URL('../dist/framework/nodula-framework.js', import.meta.url));

function appBuildConfig() {
  const bundledAddonEntries = addonOutputs.map(([, output]) => fileURLToPath(new URL(`../dist/framework/${output}`, import.meta.url)));
  const externalEntries = new Set([
    runtimeEntry,
    ...bundledAddonEntries,
    ...addonOutputs.map(([name]) => `nodula-framework/${name}`),
  ]);
  const outputPaths = new Map([
    [runtimeEntry, '/framework/nodula-framework.js'],
    ...addonOutputs.map(([name, output]) => [fileURLToPath(new URL(`../dist/framework/${output}`, import.meta.url)), `/framework/${output}`]),
    ...addonOutputs.map(([name, output]) => [`nodula-framework/${name}`, `/framework/${output}`]),
  ]);
  const packageAliases = [
    { find: /^nodula-framework$/, replacement: runtimeEntry },
    ...addonOutputs.map(([name, output]) => ({
      find: `nodula-framework/${name}`,
      replacement: fileURLToPath(new URL(`../dist/framework/${output}`, import.meta.url)),
    })),
  ];

  return {
    root: demoRoot,
    resolve: {
      dedupe: ['nodula-framework'],
      alias: packageAliases,
    },
    plugins: [
      nodulaPlugin(),
      ...nodulaPWA(),
      nodulaSEO({
        siteUrl: 'https://nodula.richardleurs.nl',
        robots: 'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /login',
        routes: [
          '/',
          '/addons',
          '/data',
          '/democss',
          '/forms',
          '/modal',
          '/web-components',
        ],
      }),
      {
        name: 'nodula-clean-app-output',
        async buildStart() {
          await Promise.all([
            rm(appFrameworkOutputDirectory, { recursive: true, force: true }),
            rm(fileURLToPath(new URL('../dist/app/assets', import.meta.url)), { recursive: true, force: true }),
            rm(fileURLToPath(new URL('../dist/app/index.html', import.meta.url)), { force: true }),
          ]);
        },
      },
      {
        name: 'nodula-copy-app-assets',
        async closeBundle() {
          await Promise.all([
            mkdir(fileURLToPath(new URL('../dist/app/assets/', import.meta.url)), { recursive: true }),
            mkdir(appFrameworkOutputDirectory, { recursive: true }),
          ]);
          await Promise.all([
            copyFile(
              fileURLToPath(new URL('./src/assets/logo-64x64.png', import.meta.url)),
              fileURLToPath(new URL('../dist/app/assets/logo-64x64.png', import.meta.url)),
            ),
            cp(frameworkOutputDirectory, appFrameworkOutputDirectory, { recursive: true }),
          ]);
        },
      },
    ],
    build: {
      outDir: appOutputDirectory,
      emptyOutDir: false,
      minify: 'oxc',
      cssMinify: 'lightningcss',
      rolldownOptions: {
        external: (id) => externalEntries.has(id),
        makeAbsoluteExternalsRelative: false,
        output: { paths: (id) => outputPaths.get(id) ?? id },
      },
    },
  };
}

export function demoAppBuildConfig() {
  return appBuildConfig();
}

export default defineConfig(demoAppBuildConfig());