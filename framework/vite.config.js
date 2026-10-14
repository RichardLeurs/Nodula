import { copyFile, cp, mkdir, rm } from 'node:fs/promises';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { nodulaPlugin } from './vite-plugin.js';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const frameworkSource = (path) => fileURLToPath(new URL(path, import.meta.url));
const frameworkOutputDirectory = fileURLToPath(new URL('../dist/nodula', import.meta.url));
const frameworkOutputFile = (filename) => fileURLToPath(new URL(`../dist/nodula/${filename}`, import.meta.url));
const frameworkCssOutputDirectory = fileURLToPath(new URL('../dist/nodula/css', import.meta.url));
const frameworkCssOutputFile = (filename) => fileURLToPath(new URL(`../dist/nodula/css/${filename}`, import.meta.url));
const runtimeEntry = fileURLToPath(new URL('../dist/nodula/nodula-core.js', import.meta.url));
const reactivityEntry = fileURLToPath(new URL('./reactivity.js', import.meta.url));
const storeEntry = fileURLToPath(new URL('../dist/nodula/nodula-store.js', import.meta.url));
const frameworkStyles = [
  'nodula-dialog.css',
  'nodula-modal.css',
  'nodula-drawer.css',
  'nodula-notifications.css',
  'nodula-cookieconsent.css',
];

const addonBuilds = {
  store: { entry: 'framework/addons/store.js', output: 'nodula-store.js', types: 'store.d.ts', externals: [reactivityEntry], paths: [[reactivityEntry, './nodula-core.js']] },
  auth: { entry: 'framework/addons/auth.js', output: 'nodula-auth.js', types: 'auth.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  form: { entry: 'framework/addons/form.js', output: 'nodula-form.js', types: 'form.d.ts', externals: [runtimeEntry, storeEntry, 'nodula-framework', 'nodula-framework/store'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js'], [storeEntry, './nodula-store.js'], ['nodula-framework/store', './nodula-store.js']] },
  router: { entry: 'framework/addons/router.js', output: 'nodula-router.js', types: 'router.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  animation: { entry: 'framework/addons/animation.js', output: 'nodula-animation.js', types: 'animation.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  dialog: { entry: 'framework/addons/dialog.js', output: 'nodula-dialog.js', types: 'dialog.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  notification: { entry: 'framework/addons/notification.js', output: 'nodula-notification.js', types: 'notification.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  cookieconsent: { entry: 'framework/addons/cookieconsent.js', output: 'nodula-cookieconsent.js', types: 'cookieconsent.d.ts', externals: [runtimeEntry, 'nodula-framework', 'nodula-framework/localstorage'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js'], ['nodula-framework/localstorage', './nodula-localstorage.js']] },
  modal: { entry: 'framework/addons/modal.js', output: 'nodula-modal.js', types: 'modal.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  drawer: { entry: 'framework/addons/drawer.js', output: 'nodula-drawer.js', types: 'drawer.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  navigation: { entry: 'framework/addons/navigation.js', output: 'nodula-navigation.js', types: 'navigation.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  'navigation-dropdown': { entry: 'framework/addons/navigation-dropdown.js', output: 'nodula-navigation-dropdown.js', types: 'navigation-dropdown.d.ts', externals: [runtimeEntry, 'nodula-framework', 'nodula-framework/navigation'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js'], ['nodula-framework/navigation', './nodula-navigation.js']] },
  dragdrop: { entry: 'framework/addons/dragdrop.js', output: 'nodula-dragdrop.js', types: 'dragdrop.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  sortable: { entry: 'framework/addons/sortable.js', output: 'nodula-sortable.js', types: 'sortable.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  filedrop: { entry: 'framework/addons/filedrop.js', output: 'nodula-filedrop.js', types: 'filedrop.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  localstorage: { entry: 'framework/addons/localstorage.js', output: 'nodula-localstorage.js', types: 'localstorage.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  data: { entry: 'framework/addons/data.js', output: 'nodula-data.js', types: 'data.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  pwa: { entry: 'framework/addons/pwa.js', output: 'nodula-pwa.js', types: 'pwa.d.ts', externals: ['vite', 'vite-plugin-pwa'] },
  seo: { entry: 'framework/addons/seo.js', output: 'nodula-seo.js', types: 'seo.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  'seo-vite': { entry: 'framework/addons/seo-vite.js', output: 'nodula-seo-vite.js', types: 'seo-vite.d.ts', externals: ['vite'] },
};

function frameworkBuildPlugins() {
  return [{
    name: 'nodula-framework-types-and-styles',
    async closeBundle() {
      await Promise.all([
        mkdir(frameworkOutputDirectory, { recursive: true }),
        mkdir(frameworkCssOutputDirectory, { recursive: true }),
        rm(fileURLToPath(new URL('../dist/nodula/assets/css', import.meta.url)), { recursive: true, force: true }),
        rm(frameworkOutputFile('nodula-framework.css'), { force: true }),
        rm(frameworkCssOutputFile('nodula-framework.css'), { force: true }),
        ...frameworkStyles.map((file) => rm(frameworkCssOutputFile(file), { force: true })),
      ]);
      await Promise.all([
        copyFile(frameworkSource('index.d.ts'), frameworkOutputFile('nodula-core.d.ts')),
        copyFile(fileURLToPath(new URL('../README.md', import.meta.url)), frameworkOutputFile('README.md')),
        copyFile(fileURLToPath(new URL('../LICENSE.md', import.meta.url)), frameworkOutputFile('LICENSE.md')),
        ...frameworkStyles.map((file) => copyFile(frameworkSource(`assets/css/${file}`), frameworkCssOutputFile(file))),
        copyFile(frameworkSource('assets/vite.config.js'), frameworkOutputFile('vite.config.js')),
        rm(frameworkOutputFile('nodula.js'), { force: true }),
        rm(frameworkOutputFile('nodula.d.ts'), { force: true }),
        rm(frameworkOutputFile('nodula-framework.js'), { force: true }),
        rm(frameworkOutputFile('nodula-framework.d.ts'), { force: true }),
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
        await copyFile(frameworkSource(`addons/${addon.types}`), frameworkOutputFile(addon.output.replace(/\.js$/, '.d.ts')));
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
        fileName: () => 'nodula-core.js',
      },
    },
  };
}

function compilerPluginBuildConfig() {
  return {
    configFile: false,
    root: projectRoot,
    plugins: [{
      name: 'nodula-vite-plugin-types',
      async closeBundle() {
        await copyFile(frameworkSource('vite-plugin.d.ts'), frameworkOutputFile('nodula-vite.d.ts'));
      },
    }],
    build: {
      outDir: frameworkOutputDirectory,
      emptyOutDir: false,
      minify: 'oxc',
      lib: {
        entry: 'framework/vite-plugin.js',
        formats: ['es'],
        fileName: () => 'nodula-vite.js',
      },
      rolldownOptions: {
        external: (id) => id.startsWith('node:'),
      },
    },
  };
}

export function frameworkBuildConfigForMode(mode) {
  if (mode === 'framework') return frameworkBuildConfig();
  if (mode === 'compiler') return compilerPluginBuildConfig();
  if (mode.startsWith('addon-')) return addonBuildConfig(mode.slice('addon-'.length));
  throw new Error(`Unknown framework build mode: ${mode}`);
}

export default defineConfig(({ mode }) => frameworkBuildConfigForMode(mode));
