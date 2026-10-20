// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { copyFile, cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { nodulaPlugin } from "../framework/vite-plugin.js";
import { nodulaPWA } from "../framework/addons/pwa.js";
import { nodulaSEO } from "../framework/addons/seo-vite.js";
import { nodulaRuntimePlugin } from "./build/runtime-plugin.js";

const demoRoot = fileURLToPath(new URL(".", import.meta.url));
const appOutputDirectory = fileURLToPath(new URL("../dist/app", import.meta.url));
const appFrameworkOutputDirectory = fileURLToPath(new URL("../dist/app/nodula", import.meta.url));
const frameworkOutputDirectory = fileURLToPath(new URL("../dist/nodula", import.meta.url));
const addonOutputs = [
  ["animation", "nodula-animation.js"],
  ["auth", "nodula-auth.js"],
  ["data", "nodula-data.js"],
  ["dragdrop", "nodula-dragdrop.js"],
  ["sortable", "nodula-sortable.js"],
  ["filedrop", "nodula-filedrop.js"],
  ["fileupload", "nodula-fileupload.js"],
  ["dialog", "nodula-dialog.js"],
  ["drawer", "nodula-drawer.js"],
  ["form", "nodula-form.js"],
  ["localstorage", "nodula-localstorage.js"],
  ["modal", "nodula-modal.js"],
  ["navigation", "nodula-navigation.js"],
  ["navigation-dropdown", "nodula-navigation-dropdown.js"],
  ["notification", "nodula-notification.js"],
  ["cookieconsent", "nodula-cookieconsent.js"],
  ["pwa", "nodula-pwa.js"],
  ["resource", "nodula-resource.js"],
  ["router", "nodula-router.js"],
  ["seo", "nodula-seo.js"],
  ["seo-vite", "nodula-seo-vite.js"],
  ["store", "nodula-store.js"],
  ["suspense", "nodula-suspense.js"],
  ["props", "nodula-props.js"],
  ["island", "nodula-island.js"],
  ["web-components", "nodula-web-components.js"],
];
const runtimeEntry = fileURLToPath(new URL("../dist/nodula/nodula-core.js", import.meta.url));
const cryptoShim = fileURLToPath(new URL("./build/crypto-shim.js", import.meta.url));

/**
 * Build configuration for the demo app: framework bundles are aliased to their built files, kept external, and copied into the app output.
 *
 * @returns {object} A Vite configuration.
 */
function appBuildConfig() {
  const bundledAddonEntries = addonOutputs.map(([, output]) =>
    fileURLToPath(new URL(`../dist/nodula/${output}`, import.meta.url)),
  );
  const externalEntries = new Set([
    runtimeEntry,
    ...bundledAddonEntries,
    ...addonOutputs.map(([name]) => `nodula-framework/${name}`),
  ]);
  const outputPaths = new Map([
    [runtimeEntry, "/nodula/nodula-core.js"],
    ...addonOutputs.map(([, output]) => [
      fileURLToPath(new URL(`../dist/nodula/${output}`, import.meta.url)),
      `/nodula/${output}`,
    ]),
    ...addonOutputs.map(([name, output]) => [`nodula-framework/${name}`, `/nodula/${output}`]),
  ]);
  const packageAliases = [
    { find: /^nodula-framework$/, replacement: runtimeEntry },
    ...addonOutputs.map(([name, output]) => ({
      find: `nodula-framework/${name}`,
      replacement: fileURLToPath(new URL(`../dist/nodula/${output}`, import.meta.url)),
    })),
    // The Playground runs the framework compiler in the browser, which needs this (see build/crypto-shim.js).
    { find: /^node:crypto$/, replacement: cryptoShim },
  ];
  /**
   * Choose the output path for a bundled asset: CSS and images go to their own folders, other files to `assets/`.
   *
   * @param {{ name?: string, originalFileName?: string }} assetInfo
   * @returns {string} Output file name pattern.
   */
  const appAssetFileNames = (assetInfo) => {
    const name = assetInfo.name ?? "";
    if (name.endsWith(".css")) return "assets/css/[name]-[hash][extname]";
    if (
      /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(name) ||
      /[?&]url$/.test(assetInfo.originalFileName ?? "")
    ) {
      return "assets/images/[name]-[hash][extname]";
    }
    return "assets/[name]-[hash][extname]";
  };

  return {
    root: demoRoot,
    server: {
      proxy: {
        "/api": "http://localhost:8787",
        "/upload": "http://localhost:8787",
      },
    },
    resolve: {
      dedupe: ["nodula-framework"],
      alias: packageAliases,
    },
    plugins: [
      nodulaPlugin(),
      nodulaRuntimePlugin(),
      ...nodulaPWA({
        workbox: {
          // The Playground's compiler is large and only needed on that page, so its chunk is fetched when the page opens
          // instead of being downloaded when the service worker is installed. Its name is `playground-<hash>.js` (from the route file).
          globIgnores: ["assets/playground-*.js"],
        },
      }),
      nodulaSEO({
        siteUrl: "https://nodula.richardleurs.nl",
        robots: "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /login",
        routes: [
          "/",
          "/addons",
          "/data",
          "/navigation-dropdown",
          "/dragdrop",
          "/filedrop",
          "/fileupload",
          "/democss",
          "/forms",
          "/modal",
          "/web-components",
          "/playground",
        ],
      }),
      {
        name: "nodula-copy-app-assets",
        /**
         * Copy the logo and the framework bundles into the app output once the build is written.
         */
        async closeBundle() {
          await mkdir(appFrameworkOutputDirectory, { recursive: true });
          await Promise.all([
            copyFile(
              fileURLToPath(new URL("./src/assets/images/logo-64x64.png", import.meta.url)),
              fileURLToPath(new URL("../dist/app/assets/images/logo-64x64.png", import.meta.url)),
            ),
            cp(frameworkOutputDirectory, appFrameworkOutputDirectory, { recursive: true }),
          ]);
        },
      },
    ],
    build: {
      outDir: appOutputDirectory,
      emptyOutDir: true,
      minify: "oxc",
      cssMinify: "lightningcss",
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

/**
 * Return the demo app Vite configuration.
 *
 * @returns {object}
 */
export function demoAppBuildConfig() {
  return appBuildConfig();
}

export default defineConfig(demoAppBuildConfig());
