// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

// Ported from the Nodula OS Playground app. The framework compiler runs in the page; the result runs in a sandboxed iframe.
import { compileNodulaComponent, compileNodulaStyle } from "../../../framework/compiler.js";

const FILE_ID = "Playground.comp";

/** Error for source that cannot be compiled or is not allowed; the message is for the person writing the component. */
export class PlaygroundError extends Error {
  /**
   * @param {string} message What is wrong with the component.
   */
  constructor(message) {
    super(message);
    this.name = "PlaygroundError";
  }
}

/** The component a new Playground starts with. */
export const STARTER = `<script>
import { signal } from 'nodula-framework';

const [count, setCount] = signal(0);
</script>

<template>
  <main class="counter">
    <h1>Hello, Nodula</h1>
    <p>You clicked {{ count() }} times.</p>
    <button type="button" @click="setCount(count() + 1)">Click me</button>
  </main>
</template>

<style>
.counter { font-family: system-ui, sans-serif; padding: 24px; }
button { padding: 6px 14px; font: inherit; }
</style>
`;

/**
 * The Content-Security-Policy of the result frame: it runs its own inline scripts and blob modules and shows data: and
 * blob: images, but it cannot load or send anything over the network.
 *
 * @returns {string} The policy.
 */
export function contentSecurityPolicy() {
  return "default-src 'none'; script-src 'unsafe-inline' blob:; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src blob:";
}

/**
 * Puts a value in a `<script>` as JSON. `<` is escaped, so the text can never end the script element early.
 *
 * @param {unknown} value A JSON-able value.
 * @returns {string} JSON that is safe inside a script element.
 */
function scriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Compiles a `.comp` file with the framework compiler.
 *
 * The result runs in a frame that only has the NodulaJS runtime, so the component may only import from `nodula-framework`.
 *
 * @param {string} source Contents of the component file.
 * @returns {{ code: string, css: string }} The module source (its style import removed) and the component's CSS.
 * @throws {PlaygroundError} With the compiler's message, or when the component imports something else.
 */
export function compilePlayground(source) {
  let code;
  let css;
  try {
    code = compileNodulaComponent(source, FILE_ID);
    css = compileNodulaStyle(source, FILE_ID).css;
  } catch (error) {
    throw new PlaygroundError(error.message);
  }
  // The compiler asks the build tool to load the styles; here they are put in the frame directly.
  code = code.replace(/^import "[^"]*\?nodula-style[^"]*";\n?/m, "");
  // The Content-Security-Policy is the real enforcement: it blocks network access in the frame whatever the code does.
  // This check only gives the person writing the component a clear message. It matches `import` and `export ... from`
  // statements, which start a line or follow a `;`; the compiler leaves imports it cannot lift where they were written.
  const outside = [
    ...code.matchAll(/(?:^|[;\n])\s*(?:import|export)\s(?:[^;]*?\sfrom\s*)?["']([^"']+)["']/g),
  ]
    .map((match) => match[1])
    .filter((name) => name !== "nodula-framework");
  if (outside.length) {
    throw new PlaygroundError(
      `The Playground can only import from "nodula-framework"; this component also imports ${[...new Set(outside)].map((name) => `"${name.replace(/\?.*$/, "")}"`).join(", ")}.`,
    );
  }
  return { code, css };
}

/**
 * Builds the document the result frame shows. The runtime and the compiled component are given to it as text, and it
 * imports both from blob URLs it makes itself, because a frame with an opaque origin cannot fetch anything from this site.
 * Errors are reported to the page with postMessage.
 *
 * @param {{ code: string, css: string }} compiled From `compilePlayground()`.
 * @param {{ runtime: string, origin: string }} options `runtime`: the NodulaJS runtime as one module source; `origin`: of this page.
 * @returns {string} The document for `iframe.srcdoc`.
 */
export function buildPlaygroundDocument({ code, css }, { runtime, origin }) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy().replace(/"/g, "&quot;")}">
<style>:root { color-scheme: light dark; } body { margin: 0; }</style>
<style>${css.replace(/<\/style/gi, "<\\/style")}</style></head>
<body><div id="app"></div>
<script id="playground-data" type="application/json">${scriptJson({ runtime, code, origin })}</script>
<script type="module">
const { runtime, code, origin } = JSON.parse(document.getElementById('playground-data').textContent);
const report = (error) => parent.postMessage({ nodula: 'error', message: String(error?.message ?? error) }, origin);
addEventListener('error', (event) => report(event.error ?? event.message));
addEventListener('unhandledrejection', (event) => report(event.reason));
try {
  const runtimeUrl = URL.createObjectURL(new Blob([runtime], { type: 'text/javascript' }));
  const source = code.replace(/(from\\s*)["']nodula-framework["']/g, (match, from) => from + JSON.stringify(runtimeUrl));
  const component = await import(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })));
  const { mount } = await import(runtimeUrl);
  mount('#app', () => component.default({ props: {}, slots: {} }));
} catch (error) {
  report(error);
}
</script></body></html>`;
}
