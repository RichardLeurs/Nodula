// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { copyFile, mkdir, rm } from "node:fs/promises";
import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
/**
 * Resolve a path under `framework/` to an absolute file path.
 *
 * @param {string} path
 * @returns {string}
 */
const frameworkSource = (path) => fileURLToPath(new URL(path, import.meta.url));
const frameworkOutputDirectory = fileURLToPath(new URL("../dist/nodula", import.meta.url));
/**
 * Resolve a file name under `dist/nodula/`.
 *
 * @param {string} filename
 * @returns {string}
 */
const frameworkOutputFile = (filename) =>
  fileURLToPath(new URL(`../dist/nodula/${filename}`, import.meta.url));
const frameworkCssOutputDirectory = fileURLToPath(new URL("../dist/nodula/css", import.meta.url));
const frameworkI18nOutputDirectory = fileURLToPath(new URL("../dist/nodula/i18n", import.meta.url));
/**
 * Resolve a file name under `dist/nodula/css/`.
 *
 * @param {string} filename
 * @returns {string}
 */
const frameworkCssOutputFile = (filename) =>
  fileURLToPath(new URL(`../dist/nodula/css/${filename}`, import.meta.url));
const runtimeEntry = fileURLToPath(new URL("../dist/nodula/nodula-core.js", import.meta.url));
const reactivityEntry = fileURLToPath(new URL("./reactivity.js", import.meta.url));
const storeEntry = fileURLToPath(new URL("../dist/nodula/nodula-store.js", import.meta.url));
// Every stylesheet in framework/assets/css must be listed here so it reaches dist/nodula/css.
export const frameworkStyles = [
  "nodula-dialog.css",
  "nodula-modal.css",
  "nodula-drawer.css",
  "nodula-notifications.css",
  "nodula-cookieconsent.css",
  "nodula-filedrop.css",
  "nodula-sortable.css",
];

// Core runtime imports every add-on bundle shares: the core file and the bare package name.
const coreImports = [
  [runtimeEntry, "./nodula-core.js"],
  ["nodula-framework", "./nodula-core.js"],
];

/**
 * An add-on bundle that reads the core runtime. `imports` lists other add-on bundles it uses,
 * as [specifier, output file] pairs; each specifier is kept external and rewritten to that file.
 */
function coreAddon(name, { imports = [] } = {}) {
  const pairs = [...coreImports, ...imports];
  return {
    entry: `framework/addons/${name}.js`,
    output: `nodula-${name}.js`,
    types: `${name}.d.ts`,
    externals: pairs.map(([specifier]) => specifier),
    paths: pairs,
  };
}

const addonBuilds = {
  store: {
    entry: "framework/addons/store.js",
    output: "nodula-store.js",
    types: "store.d.ts",
    externals: [reactivityEntry],
    paths: [[reactivityEntry, "./nodula-core.js"]],
  },
  auth: coreAddon("auth"),
  form: coreAddon("form", {
    imports: [
      [storeEntry, "./nodula-store.js"],
      ["nodula-framework/store", "./nodula-store.js"],
    ],
  }),
  router: coreAddon("router"),
  animation: coreAddon("animation"),
  dialog: coreAddon("dialog"),
  notification: coreAddon("notification"),
  cookieconsent: coreAddon("cookieconsent", {
    imports: [["nodula-framework/localstorage", "./nodula-localstorage.js"]],
  }),
  modal: coreAddon("modal"),
  drawer: coreAddon("drawer"),
  navigation: coreAddon("navigation"),
  "navigation-dropdown": coreAddon("navigation-dropdown", {
    imports: [["nodula-framework/navigation", "./nodula-navigation.js"]],
  }),
  dragdrop: coreAddon("dragdrop"),
  sortable: coreAddon("sortable"),
  filedrop: coreAddon("filedrop"),
  fileupload: coreAddon("fileupload", {
    imports: [["nodula-framework/filedrop", "./nodula-filedrop.js"]],
  }),
  resource: coreAddon("resource"),
  localstorage: coreAddon("localstorage"),
  data: coreAddon("data"),
  pwa: {
    entry: "framework/addons/pwa.js",
    output: "nodula-pwa.js",
    types: "pwa.d.ts",
    externals: ["vite", "vite-plugin-pwa"],
  },
  seo: coreAddon("seo"),
  "seo-vite": {
    entry: "framework/addons/seo-vite.js",
    output: "nodula-seo-vite.js",
    types: "seo-vite.d.ts",
    externals: ["vite"],
  },
};

/**
 * Plugins for the core build: copy type declarations, stylesheets, the i18n catalogue and package files into `dist/nodula`.
 *
 * @returns {object[]}
 */
function frameworkBuildPlugins() {
  return [
    {
      name: "nodula-framework-types-and-styles",
      /**
       * Copy the core declaration file, README, licence and package config into `dist/nodula` once the bundle is written.
       */
      async closeBundle() {
        await Promise.all([
          mkdir(frameworkOutputDirectory, { recursive: true }),
          mkdir(frameworkCssOutputDirectory, { recursive: true }),
          mkdir(frameworkI18nOutputDirectory, { recursive: true }),
          rm(fileURLToPath(new URL("../dist/nodula/assets/css", import.meta.url)), {
            recursive: true,
            force: true,
          }),
          rm(frameworkOutputFile("nodula-framework.css"), { force: true }),
          rm(frameworkCssOutputFile("nodula-framework.css"), { force: true }),
          ...frameworkStyles.map((file) => rm(frameworkCssOutputFile(file), { force: true })),
        ]);
        await Promise.all([
          copyFile(frameworkSource("index.d.ts"), frameworkOutputFile("nodula-core.d.ts")),
          copyFile(
            fileURLToPath(new URL("../README.md", import.meta.url)),
            frameworkOutputFile("README.md"),
          ),
          copyFile(
            fileURLToPath(new URL("../LICENSE.md", import.meta.url)),
            frameworkOutputFile("LICENSE.md"),
          ),
          ...frameworkStyles.map((file) =>
            copyFile(frameworkSource(`assets/css/${file}`), frameworkCssOutputFile(file)),
          ),
          copyFile(frameworkSource("assets/vite.config.js"), frameworkOutputFile("vite.config.js")),
          // The English error and text catalogue, for translation tooling; the runtime does not import it.
          copyFile(frameworkSource("i18n/en.json"), path.join(frameworkI18nOutputDirectory, "en.json")),
          rm(frameworkOutputFile("nodula.js"), { force: true }),
          rm(frameworkOutputFile("nodula.d.ts"), { force: true }),
          rm(frameworkOutputFile("nodula-framework.js"), { force: true }),
          rm(frameworkOutputFile("nodula-framework.d.ts"), { force: true }),
        ]);
      },
    },
  ];
}

/**
 * Build configuration for one add-on entry, as a separate ES module bundle.
 *
 * @param {string} name Key of `addonBuilds`.
 * @returns {object} A Vite configuration.
 * @throws {Error} For an unknown add-on name.
 */
function addonBuildConfig(name) {
  const addon = addonBuilds[name];
  if (!addon) throw new Error(`Unknown Nodula add-on build mode: ${name}`);
  return {
    configFile: false,
    root: projectRoot,
    plugins: [
      {
        name: `nodula-${name}-types`,
        /**
         * Copy the add-on declaration file next to its bundle once it is written.
         */
        async closeBundle() {
          await copyFile(
            frameworkSource(`addons/${addon.types}`),
            frameworkOutputFile(addon.output.replace(/\.js$/, ".d.ts")),
          );
        },
      },
    ],
    build: {
      outDir: frameworkOutputDirectory,
      emptyOutDir: false,
      minify: "oxc",
      lib: {
        entry: addon.entry,
        formats: ["es"],
        fileName: () => addon.output,
      },
      rolldownOptions: {
        external: (id) => addon.externals.includes(id),
        makeAbsoluteExternalsRelative: false,
        output: addon.paths
          ? {
              paths: (id) => addon.paths.find(([source]) => source === id)?.[1] ?? id,
            }
          : undefined,
      },
    },
  };
}

/**
 * Build configuration for the core runtime bundle and its stylesheets.
 *
 * @returns {object} A Vite configuration.
 */
function frameworkBuildConfig() {
  return {
    configFile: false,
    root: projectRoot,
    plugins: frameworkBuildPlugins(),
    build: {
      outDir: frameworkOutputDirectory,
      emptyOutDir: false,
      minify: "oxc",
      cssMinify: "lightningcss",
      rolldownOptions: { output: { minify: true } },
      lib: {
        entry: "framework/index.js",
        formats: ["es"],
        fileName: () => "nodula-core.js",
      },
    },
  };
}

/**
 * Build configuration for the Vite plugin entry, `nodula-vite.js`.
 *
 * @returns {object} A Vite configuration.
 */
function compilerPluginBuildConfig() {
  return {
    configFile: false,
    root: projectRoot,
    plugins: [
      {
        name: "nodula-vite-plugin-types",
        /**
         * Copy the Vite plugin declaration file next to the plugin bundle once it is written.
         */
        async closeBundle() {
          await copyFile(
            frameworkSource("vite-plugin.d.ts"),
            frameworkOutputFile("nodula-vite.d.ts"),
          );
        },
      },
    ],
    build: {
      outDir: frameworkOutputDirectory,
      emptyOutDir: false,
      minify: "oxc",
      lib: {
        entry: "framework/vite-plugin.js",
        formats: ["es"],
        fileName: () => "nodula-vite.js",
      },
      rolldownOptions: {
        external: (id) => id.startsWith("node:"),
      },
    },
  };
}

/**
 * Return the Vite configuration for a build mode.
 *
 * Modes are `framework`, `compiler`, and `addon-<name>`.
 *
 * @param {string} mode
 * @returns {object}
 * @throws {Error} For an unknown mode.
 */
export function frameworkBuildConfigForMode(mode) {
  if (mode === "framework") return frameworkBuildConfig();
  if (mode === "compiler") return compilerPluginBuildConfig();
  if (mode.startsWith("addon-")) return addonBuildConfig(mode.slice("addon-".length));
  throw new Error(`Unknown framework add-on build mode: ${mode}`);
}

export default defineConfig(({ mode }) => frameworkBuildConfigForMode(mode));
