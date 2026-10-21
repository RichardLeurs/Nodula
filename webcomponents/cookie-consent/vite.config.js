// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { mkdir, rm, writeFile, readFile, copyFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const outputDirectory = fileURLToPath(
  new URL("../../dist/webcomponents/cookie-consent", import.meta.url),
);

/**
 * Build configuration for one output format. No externals: the bundle is self-contained.
 *
 * Modes: `es` (module, exports the API) and `iife` (classic script, auto-registers the element).
 *
 * @param {string} mode
 * @returns {object} A Vite configuration.
 * @throws {Error} For an unknown mode.
 */
export function cookieConsentBuildConfig(mode) {
  if (mode !== "es" && mode !== "iife")
    throw new Error(`Unknown cookie consent build mode: ${mode}`);
  const fileName = mode === "es" ? "nodula-cookie-consent.js" : "nodula-cookie-consent.iife.js";
  return {
    root: projectRoot,
    plugins: [
      {
        name: "nodula-cookie-consent-output",
        /**
         * Empty the output folder before the module build, so stale files never ship.
         */
        async buildStart() {
          if (mode === "es") await rm(outputDirectory, { recursive: true, force: true });
        },
        /**
         * Write the gzip sibling of the bundle, and for the module build copy the type declarations.
         */
        async closeBundle() {
          await mkdir(outputDirectory, { recursive: true });
          const file = `${outputDirectory}/${fileName}`;
          await writeFile(`${file}.gz`, gzipSync(await readFile(file)));
          if (mode === "es")
            await copyFile(
              fileURLToPath(new URL("./index.d.ts", import.meta.url)),
              `${outputDirectory}/nodula-cookie-consent.d.ts`,
            );
        },
      },
    ],
    build: {
      outDir: outputDirectory,
      emptyOutDir: false,
      minify: "oxc",
      lib: {
        entry:
          mode === "es"
            ? "webcomponents/cookie-consent/src/index.js"
            : "webcomponents/cookie-consent/src/auto.js",
        formats: [mode],
        name: "NodulaCookieConsent",
        fileName: () => fileName,
      },
    },
  };
}

export default defineConfig(({ mode }) => cookieConsentBuildConfig(mode));
