// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { readFile } from "node:fs/promises";
import path from "node:path";
import { compileNodulaComponent, compileNodulaStyle } from "./compiler.js";

// Only a trailing Nodula query is split off. A plain "?" in a directory or file name stays in the path.
// Parameters are names with optional values, e.g. "nodula-style&t=123" from Vite's cache busting.
const NODULA_QUERY = /^[\w-]+(?:=[\w.-]*)?(?:&[\w-]+(?:=[\w.-]*)?)*$/;

/**
 * Split a Vite module id into its file path and Nodula query.
 *
 * Only a trailing query made of Nodula parameters is removed, so a `?` inside a directory or file
 * name stays part of the path.
 *
 * @param {string} id Module id, optionally followed by a query.
 * @returns {{ filePath: string, query: string }}
 */
function splitId(id) {
  const index = id.lastIndexOf("?");
  if (index < 0 || !NODULA_QUERY.test(id.slice(index + 1))) return { filePath: id, query: "" };
  return { filePath: id.slice(0, index), query: id.slice(index + 1) };
}

// Compile errors name only the file's basename; prefix the full path so editors and Vite's overlay can locate them.
/**
 * Run a compile step and prefix its error with the full file path.
 *
 * The compiler names only the file basename. The prefix lets editors and the Vite error overlay
 * find the file. The original error is kept as `cause`.
 *
 * @param {string} filePath File being compiled.
 * @param {() => string} compile Compile step that returns the generated code or CSS.
 * @returns {Promise<string>}
 */
async function compileWithPath(filePath, compile) {
  try {
    return await compile();
  } catch (error) {
    const basename = `${path.basename(filePath)}: `;
    const message = error.message.startsWith(basename)
      ? error.message.slice(basename.length)
      : error.message;
    const wrapped = new Error(`${filePath}: ${message}`, { cause: error });
    wrapped.id = filePath;
    throw wrapped;
  }
}

/**
 * Vite plugin that compiles `.page` and `.comp` files and their generated style modules.
 *
 * It runs at build time only and is not part of the browser runtime.
 *
 * @returns {import("vite").Plugin}
 */
export function nodulaPlugin() {
  return {
    name: "nodula-single-file-components",
    enforce: "pre",
    /**
     * Resolve a generated `.module.css` style id to an absolute path, keeping its query.
     *
     * @param {string} id Module id requested by an import.
     * @returns {string | null} The resolved id, or null when the id is not a Nodula style module.
     */
    resolveId(id) {
      const { filePath, query } = splitId(id);
      const queryParameters = new URLSearchParams(query);
      if (!filePath.endsWith(".module.css") || !queryParameters.has("nodula-style-module"))
        return null;
      return `${path.resolve(decodeURIComponent(filePath))}?${query}`;
    },
    /**
     * Load a `.page` or `.comp` file, or a generated style module, as compiled JavaScript or CSS.
     *
     * @param {string} id Module id requested by Vite.
     * @returns {Promise<string | null>} Generated source, or null for ids this plugin does not handle.
     */
    async load(id) {
      const { filePath: encodedFilePath, query } = splitId(id);
      const filePath = decodeURIComponent(encodedFilePath);
      const queryParameters = new URLSearchParams(query);

      if (filePath.endsWith(".module.css") && queryParameters.has("nodula-style-module")) {
        const componentPath = filePath.slice(0, -".module.css".length);
        const source = await readFile(componentPath, "utf8");
        // Vite only watches the generated module's own path, so tie it to the component's file.
        this?.addWatchFile?.(componentPath);
        return compileWithPath(componentPath, () => compileNodulaStyle(source, componentPath).css);
      }

      if (!/\.(?:page|comp)$/.test(filePath)) return null;
      const source = await readFile(filePath, "utf8");
      if (queryParameters.has("nodula-style") || queryParameters.has("nodula-style-scoped")) {
        this?.addWatchFile?.(filePath);
        const { css } = await compileWithPath(filePath, () => compileNodulaStyle(source, filePath));
        if (!css.trim()) return "export default undefined;";
        const styleId = `nodula-style-${Buffer.from(filePath).toString("base64url")}`;
        return `const id = ${JSON.stringify(styleId)};\nconst existing = document.getElementById(id);\nif (!existing) { const style = document.createElement('style'); style.id = id; style.textContent = ${JSON.stringify(css)}; document.head.append(style); }\nexport default id;`;
      }
      return compileWithPath(filePath, () => compileNodulaComponent(source, filePath));
    },
  };
}
