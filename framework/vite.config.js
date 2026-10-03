import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { transform } from 'lightningcss';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { nodulaPlugin } from './vite-plugin.js';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const frameworkSource = (path) => fileURLToPath(new URL(path, import.meta.url));
const frameworkOutputDirectory = fileURLToPath(new URL('../dist/nodula', import.meta.url));
const frameworkOutputFile = (filename) => fileURLToPath(new URL(`../dist/nodula/${filename}`, import.meta.url));
const runtimeEntry = fileURLToPath(new URL('../dist/nodula/nodula-core.js', import.meta.url));
const reactivityEntry = fileURLToPath(new URL('./reactivity.js', import.meta.url));
const storeEntry = fileURLToPath(new URL('../dist/nodula/nodula-store.js', import.meta.url));
const frameworkStyles = [
  'nodula-dialog.css',
  'nodula-modal.css',
  'nodula-drawer.css',
  'nodula-notifications.css',
];

const addonBuilds = {
  store: { entry: 'framework/addons/store.js', output: 'nodula-store.js', types: 'store.d.ts', externals: [reactivityEntry], paths: [[reactivityEntry, './nodula-core.js']] },
  auth: { entry: 'framework/addons/auth.js', output: 'nodula-auth.js', types: 'auth.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  form: { entry: 'framework/addons/form.js', output: 'nodula-form.js', types: 'form.d.ts', externals: [runtimeEntry, storeEntry, 'nodula-framework', 'nodula-framework/store'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js'], [storeEntry, './nodula-store.js'], ['nodula-framework/store', './nodula-store.js']] },
  router: { entry: 'framework/addons/router.js', output: 'nodula-router.js', types: 'router.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  animation: { entry: 'framework/addons/animation.js', output: 'nodula-animation.js', types: 'animation.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  dialog: { entry: 'framework/addons/dialog.js', output: 'nodula-dialog.js', types: 'dialog.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  notifications: { entry: 'framework/addons/notifications.js', output: 'nodula-notifications.js', types: 'notifications.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  modal: { entry: 'framework/addons/modal.js', output: 'nodula-modal.js', types: 'modal.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  drawer: { entry: 'framework/addons/drawer.js', output: 'nodula-drawer.js', types: 'drawer.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
  navigation: { entry: 'framework/addons/navigation.js', output: 'nodula-navigation.js', types: 'navigation.d.ts', externals: [runtimeEntry, 'nodula-framework'], paths: [[runtimeEntry, './nodula-core.js'], ['nodula-framework', './nodula-core.js']] },
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
      await mkdir(frameworkOutputDirectory, { recursive: true });
      const cssParts = await Promise.all(frameworkStyles.map((file) => readFile(frameworkSource(`assets/${file}`), 'utf8')));
      const minified = transform({ filename: 'nodula-framework.css', code: Buffer.from(cssParts.join('\n')), minify: true });
      await Promise.all([
        copyFile(frameworkSource('index.d.ts'), frameworkOutputFile('nodula-core.d.ts')),
        copyFile(frameworkSource('public/README.md'), frameworkOutputFile('README.md')),
        copyFile(frameworkSource('public/LICENSE.md'), frameworkOutputFile('LICENSE.md')),
        writeFile(frameworkOutputFile('nodula-framework.css'), minified.code),
        ...frameworkStyles.map((file) => copyFile(frameworkSource(`assets/${file}`), frameworkOutputFile(file))),
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
