import { copyFile, cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { nodulaPlugin } from '../framework/vite-plugin.js';
import { nodulaPWA } from '../framework/addons/pwa.js';
import { nodulaSEO } from '../framework/addons/seo-vite.js';

const demoRoot = fileURLToPath(new URL('.', import.meta.url));
const appOutputDirectory = fileURLToPath(new URL('../dist/app', import.meta.url));
const appFrameworkOutputDirectory = fileURLToPath(new URL('../dist/app/nodula', import.meta.url));
const frameworkOutputDirectory = fileURLToPath(new URL('../dist/nodula', import.meta.url));
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
  ['notification', 'nodula-notification.js'],
  ['cookieconsent', 'nodula-cookieconsent.js'],
  ['pwa', 'nodula-pwa.js'],
  ['router', 'nodula-router.js'],
  ['seo', 'nodula-seo.js'],
  ['seo-vite', 'nodula-seo-vite.js'],
  ['store', 'nodula-store.js'],
];
const runtimeEntry = fileURLToPath(new URL('../dist/nodula/nodula-core.js', import.meta.url));

function appBuildConfig() {
  const bundledAddonEntries = addonOutputs.map(([, output]) => fileURLToPath(new URL(`../dist/nodula/${output}`, import.meta.url)));
  const externalEntries = new Set([
    runtimeEntry,
    ...bundledAddonEntries,
    ...addonOutputs.map(([name]) => `nodula-framework/${name}`),
  ]);
  const outputPaths = new Map([
    [runtimeEntry, '/nodula/nodula-core.js'],
    ...addonOutputs.map(([name, output]) => [fileURLToPath(new URL(`../dist/nodula/${output}`, import.meta.url)), `/nodula/${output}`]),
    ...addonOutputs.map(([name, output]) => [`nodula-framework/${name}`, `/nodula/${output}`]),
  ]);
  const packageAliases = [
    { find: /^nodula-framework$/, replacement: runtimeEntry },
    ...addonOutputs.map(([name, output]) => ({
      find: `nodula-framework/${name}`,
      replacement: fileURLToPath(new URL(`../dist/nodula/${output}`, import.meta.url)),
    })),
  ];
  const appAssetFileNames = (assetInfo) => {
    const name = assetInfo.name ?? '';
    if (name.endsWith('.css')) return 'assets/css/[name]-[hash][extname]';
    if (/\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(name) || /[?&]url$/.test(assetInfo.originalFileName ?? '')) {
      return 'assets/images/[name]-[hash][extname]';
    }
    return 'assets/[name]-[hash][extname]';
  };

  return {
    root: demoRoot,
    server: {
      proxy: {
        '/api': 'http://localhost:8787',
      },
    },
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
            mkdir(appFrameworkOutputDirectory, { recursive: true }),
          ]);
          await Promise.all([
            copyFile(
              fileURLToPath(new URL('./src/assets/images/logo-64x64.png', import.meta.url)),
              fileURLToPath(new URL('../dist/app/assets/images/logo-64x64.png', import.meta.url)),
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
        output: {
          paths: (id) => outputPaths.get(id) ?? id,
          assetFileNames: appAssetFileNames,
        },
      },
    },
  };
}

export function demoAppBuildConfig() {
  return appBuildConfig();
}

export default defineConfig(demoAppBuildConfig());