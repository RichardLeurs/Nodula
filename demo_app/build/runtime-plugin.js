// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { fileURLToPath } from "node:url";
import { build } from "vite";

const VIRTUAL_ID = "virtual:nodula-runtime";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const frameworkEntry = fileURLToPath(new URL("../../framework/index.js", import.meta.url));

/**
 * Vite plugin: `import runtime from 'virtual:nodula-runtime'` gives the NodulaJS runtime as one ES module source string.
 *
 * The Playground gives it to its sandboxed frame, which cannot import the app's own modules. The runtime is built from
 * the framework source on first use and cached for the rest of the build or dev session, so no prebuilt bundle is needed.
 *
 * @returns {import('vite').Plugin}
 */
export function nodulaRuntimePlugin() {
  let source;
  return {
    name: "nodula-demo-app-runtime",
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
    /**
     * Load the runtime as a default export of its source text.
     *
     * @param {string} id Resolved module id.
     * @returns {Promise<string | undefined>} Module source, or undefined for other ids.
     */
    async load(id) {
      if (id !== RESOLVED_ID) return undefined;
      // A separate library build with no config file, so the app's aliases and externals do not apply to it.
      source ??= (async () => {
        const result = await build({
          configFile: false,
          logLevel: "silent",
          build: {
            write: false,
            minify: true,
            lib: { entry: frameworkEntry, formats: ["es"], fileName: "runtime" },
          },
        });
        return (Array.isArray(result) ? result[0] : result).output[0].code;
      })();
      return `export default ${JSON.stringify(await source)};`;
    },
  };
}
