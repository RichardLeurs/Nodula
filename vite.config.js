import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { transform } from 'lightningcss';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { nodulaPlugin } from './framework/vite-plugin.js';
import { nodulaPWA } from 'nodula-framework/pwa';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const appRoot = fileURLToPath(new URL('./demo app', import.meta.url));
const outputDirectory = fileURLToPath(new URL('./dist', import.meta.url));
const frameworkOutputDirectory = fileURLToPath(new URL('./dist/framework', import.meta.url));
const runtimeEntry = fileURLToPath(new URL('./dist/framework/nodula-framework.js', import.meta.url));
const reactivityEntry = fileURLToPath(new URL('./framework/reactivity.js', import.meta.url));
const storeEntry = fileURLToPath(new URL('./dist/framework/nodula-store.js', import.meta.url));
const frameworkStyles = [
  'nodula-dialog.css',
  'nodula-modal.css',
  'nodula-drawer.css',
  'nodula-notifications.css',
];

const addonBuilds = {
  store: { entry: 'framework/addons/store.js', output: 'nodula-store.js', types: 'store.d.ts', externals: [reactivityEntry], paths: [[reactivityEntry, './nodula-framework.js']] },
  form: { entry: 'framework/addons/form.js', output: 'nodula-form.js', types: 'form.d.ts', externals: [runtimeEntry, storeEntry, 'nodula-framework', 'nodula-framework/store'], paths: [[runtimeEntry, './nodula-framework.js'], ['nodula-framework', './nodula-framework.js'], [storeEntry, './nodula-store.js'], ['nodula-framework/store', './nodula-store.js']] },
  router: { entry: 'framework/addons/router.js', output: 'nodula-router.js', types: 'router.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-framework.js'], ['nodula-framework', './nodula-framework.js']] },
  animation: { entry: 'framework/addons/animation.js', output: 'nodula-animation.js', types: 'animation.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-framework.js'], ['nodula-framework', './nodula-framework.js']] },
  dialog: { entry: 'framework/addons/dialog.js', output: 'nodula-dialog.js', types: 'dialog.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-framework.js'], ['nodula-framework', './nodula-framework.js']] },
  notifications: { entry: 'framework/addons/notifications.js', output: 'nodula-notifications.js', types: 'notifications.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-framework.js'], ['nodula-framework', './nodula-framework.js']] },
  modal: { entry: 'framework/addons/modal.js', output: 'nodula-modal.js', types: 'modal.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-framework.js'], ['nodula-framework', './nodula-framework.js']] },
  drawer: { entry: 'framework/addons/drawer.js', output: 'nodula-drawer.js', types: 'drawer.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-framework.js'], ['nodula-framework', './nodula-framework.js']] },
  navigation: { entry: 'framework/addons/navigation.js', output: 'nodula-navigation.js', types: 'navigation.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-framework.js'], ['nodula-framework', './nodula-framework.js']] },
  localstorage: { entry: 'framework/addons/localstorage.js', output: 'nodula-localstorage.js', types: 'localstorage.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-framework.js'], ['nodula-framework', './nodula-framework.js']] },
  data: { entry: 'framework/addons/data.js', output: 'nodula-data.js', types: 'data.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-framework.js'], ['nodula-framework', './nodula-framework.js']] },
  pwa: { entry: 'framework/addons/pwa.js', output: 'nodula-pwa.js', types: 'pwa.d.ts', externals: ['vite', 'vite-plugin-pwa'] },
};

function frameworkBuildPlugins() {
  return [{
    name: 'nodula-framework-types-and-styles',
    async closeBundle() {
      await mkdir(frameworkOutputDirectory, { recursive: true });
      const cssParts = await Promise.all(frameworkStyles.map((file) => readFile(`framework/assets/${file}`, 'utf8')));
      const minified = transform({ filename: 'nodula-framework.css', code: Buffer.from(cssParts.join('\n')), minify: true });
      await Promise.all([
        copyFile('framework/index.d.ts', 'dist/framework/nodula-framework.d.ts'),
        writeFile('dist/framework/nodula-framework.css', minified.code),
        ...frameworkStyles.map((file) => copyFile(`framework/assets/${file}`, `dist/framework/${file}`)),
        rm('dist/framework/nodula.js', { force: true }),
        rm('dist/framework/nodula.d.ts', { force: true }),
      ]);
    },
  }];
}

function addonBuildConfig(name) {
  const addon = addonBuilds[name];
  if (!addon) throw new Error(`Unknown Nodula add-on build mode: ${name}`);
  return {
    configFile: false,
    root: projectRoot,
    plugins: [{
      name: `nodula-${name}-types`,
      async closeBundle() {
        await copyFile(`framework/addons/${addon.types}`, `dist/framework/${addon.output.replace(/\.js$/, '.d.ts')}`);
      },
    }],
    build: {
      outDir: frameworkOutputDirectory,
      emptyOutDir: false,
      minify: 'oxc',
      lib: {
        entry: addon.entry,
        formats: ['es'],
        fileName: () => addon.output,
      },
      rolldownOptions: {
        external: (id) => addon.externals.includes(id),
        makeAbsoluteExternalsRelative: false,
        output: addon.paths ? {
          paths: (id) => addon.paths.find(([source]) => source === id)?.[1] ?? id,
        } : undefined,
      },
    },
  };
}

function frameworkBuildConfig() {
  return {
    configFile: false,
    root: projectRoot,
    plugins: frameworkBuildPlugins(),
    build: {
      outDir: frameworkOutputDirectory,
      emptyOutDir: false,
      minify: 'oxc',
      cssMinify: 'lightningcss',
      rolldownOptions: { output: { minify: true } },
      lib: {
        entry: 'framework/index.js',
        formats: ['es'],
        fileName: () => 'nodula-framework.js',
      },
    },
  };
}

function appBuildConfig() {
  const appEntries = Object.values(addonBuilds).map(({ output }) => fileURLToPath(new URL(`./dist/framework/${output}`, import.meta.url)));
  const externalEntries = new Set([
    runtimeEntry,
    ...appEntries,
    'nodula-framework/form',
    'nodula-framework/router',
    'nodula-framework/animation',
    'nodula-framework/dialog',
    'nodula-framework/notifications',
    'nodula-framework/modal',
    'nodula-framework/drawer',
    'nodula-framework/navigation',
    'nodula-framework/localstorage',
    'nodula-framework/data',
    'nodula-framework/store',
    'nodula-framework/pwa',
  ]);
  const outputPaths = new Map([
    [runtimeEntry, '/framework/nodula-framework.js'],
    ...Object.entries(addonBuilds).map(([name, addon]) => [fileURLToPath(new URL(`./dist/framework/${addon.output}`, import.meta.url)), `/framework/${addon.output}`]),
    ...Object.entries(addonBuilds).map(([name, addon]) => [`nodula-framework/${name}`, `/framework/${addon.output}`]),
  ]);

  return {
    root: appRoot,
    resolve: {
      dedupe: ['nodula-framework'],
    },
    plugins: [
      nodulaPlugin(),
      ...nodulaPWA(),
      {
        name: 'nodula-clean-app-output',
        async buildStart() {
          await Promise.all([
            rm(new URL('./dist/assets', import.meta.url), { recursive: true, force: true }),
            rm(new URL('./dist/index.html', import.meta.url), { force: true }),
          ]);
        },
      },
      {
        name: 'nodula-copy-app-icon',
        async closeBundle() {
          const assetsDirectory = new URL('./dist/assets/', import.meta.url);
          await mkdir(assetsDirectory, { recursive: true });
          await copyFile(
            new URL('./demo app/src/assets/logo-64x64.png', import.meta.url),
            new URL('./dist/assets/logo-64x64.png', import.meta.url),
          );
        },
      },
    ],
    build: {
      outDir: outputDirectory,
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

export default defineConfig(({ mode }) => {
  if (mode === 'framework') return frameworkBuildConfig();
  if (mode.startsWith('addon-')) return addonBuildConfig(mode.slice('addon-'.length));
  return appBuildConfig();
});