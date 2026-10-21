// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";

/**
 * Interactive menu for the repository's common npm scripts.
 *
 * Usage: `npm run nodula` shows the menu, `npm run nodula -- <key>` runs an entry directly (e.g. `npm run nodula -- docs`).
 * Each entry only forwards to an existing npm script, so the menu never needs its own build logic.
 */

/** @typedef {{ key: string, label: string, script: string, dir?: string, plain?: boolean }} MenuOption */

/** @type {{ title: string, options: MenuOption[] }[]} */
const GROUPS = [
  {
    title: "All",
    options: [
      {
        key: "all",
        label: "Build everything (framework, demo_app, web components, docs)",
        script: "build",
      },
      { key: "test", label: "Run all tests", script: "test" },
      { key: "lint", label: "Lint", script: "lint" },
      { key: "format", label: "Check formatting", script: "format:check" },
    ],
  },
  {
    title: "Framework",
    options: [
      { key: "framework", label: "Build the framework (dist/nodula)", script: "build:framework" },
      { key: "test-framework", label: "Run the framework tests", script: "test:framework" },
      { key: "webcomponents", label: "Build the web components", script: "build:webcomponents" },
    ],
  },
  {
    title: "Demo app",
    options: [
      { key: "dev", label: "Start the dev server", script: "dev" },
      { key: "app", label: "Build the demo_app", script: "build:app" },
      { key: "test-demo", label: "Run the demo_app tests", script: "test:demo" },
    ],
  },
  {
    title: "Documentation",
    options: [
      {
        key: "docs-dev",
        label: "Start the VitePress dev server",
        script: "docs:dev",
        dir: "vitepress",
      },
      { key: "docs", label: "Build the VitePress docs", script: "build:docs" },
    ],
  },
  {
    title: "NPM",
    options: [
      {
        key: "npm",
        label: "Package the framework as an npm tarball (dist/npm)",
        script: "package:framework",
      },
      { key: "install", label: "npm install (root)", script: "install", plain: true },
    ],
  },
];

const OPTIONS = GROUPS.flatMap((group) => group.options);

// Colour only for a real terminal, and honour the NO_COLOR convention.
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const green = (text) => (useColor ? `\x1b[32m${text}\x1b[0m` : text);
const bold = (text) => (useColor ? `\x1b[1m${text}\x1b[0m` : text);

// Same logo as build-banner.mjs; String.raw keeps the backslashes of the letters as they are.
const logo = String.raw`
 _   _           _       _
| \ | | ___   __| |_   _| | __ _
|  \| |/ _ \ / _${"`"} | | | | |/ _${"`"} |
| |\  | (_) | (_| | |_| | | (_| |
|_| \_|\___/ \__,_|\__,_|_|\__,_|
`;

// npm sets npm_execpath when this runs from an npm script; running npm through Node avoids the npm.cmd shim on Windows.
const npmCli = process.env.npm_execpath;

/**
 * Print the numbered menu.
 *
 * @returns {void}
 */
function printMenu() {
  let number = 0;
  console.log(green(logo));
  for (const group of GROUPS) {
    console.log(`\n  ${bold(group.title)}`);
    for (const option of group.options) {
      number += 1;
      console.log(green(`    ${String(number).padStart(2)}) ${option.label}`));
    }
  }
  console.log(green("\n     q) Quit\n"));
}

/**
 * Find a menu entry by its number or its key.
 *
 * @param {string} answer The text typed by the user, or the CLI argument.
 * @returns {MenuOption | undefined} The matching entry.
 */
function findOption(answer) {
  const value = answer.trim().toLowerCase();
  return OPTIONS[Number(value) - 1] ?? OPTIONS.find((option) => option.key === value);
}

/**
 * Run an npm script with the terminal attached so progress and prompts stay visible.
 *
 * @param {MenuOption} option The menu entry; `plain` runs `npm <script>` instead of `npm run <script>`, `dir` sets the package folder.
 * @returns {Promise<number>} The exit code.
 */
function runScript({ script, dir, plain }) {
  const command = npmCli ? process.execPath : "npm";
  const npmArgs = plain ? [script] : ["run", script];
  const args = npmCli ? [npmCli, ...npmArgs] : npmArgs;
  return new Promise((resolve) => {
    spawn(command, args, { stdio: "inherit", cwd: dir }).on("close", (code) => resolve(code ?? 1));
  });
}

let answer = process.argv[2];

if (!answer) {
  printMenu();
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  answer = await readline.question("Choose an option: ");
  readline.close();
}

if (["q", "quit", "exit", ""].includes(answer.trim().toLowerCase())) process.exit(0);

const option = findOption(answer);

if (!option) {
  console.error(`nodula: unknown option "${answer}". Run "npm run nodula" to see the menu.`);
  process.exit(1);
}

console.log(`\n> npm ${option.plain ? "" : "run "}${option.script}\n`);
process.exit(await runScript(option));
