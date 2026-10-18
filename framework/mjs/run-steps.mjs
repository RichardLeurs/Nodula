// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { spawn } from "node:child_process";

/**
 * Run npm scripts one after another and print a step counter with the time each step took.
 *
 * Usage: `node framework/mjs/run-steps.mjs <script> [<script> ...]`
 *
 * A step's own output is kept back and only printed when that step fails, so the counter stays readable.
 * Set `NODULA_STEPS_VERBOSE=1` to stream every step's output instead.
 */

const steps = process.argv.slice(2);
const verbose = process.env.NODULA_STEPS_VERBOSE === "1";
// npm sets npm_execpath when this runs from an npm script; running npm through Node avoids the npm.cmd shim on Windows.
const npmCli = process.env.npm_execpath;

if (!steps.length) {
  console.error("run-steps: expected at least one npm script name.");
  process.exit(1);
}

/**
 * Run one npm script.
 *
 * @param {string} name The npm script name.
 * @returns {Promise<{ code: number, output: string }>} The exit code and the collected output.
 */
function runScript(name) {
  return new Promise((resolve) => {
    const [command, args] = npmCli
      ? [process.execPath, [npmCli, "run", name]]
      : ["npm", ["run", name]];
    const child = spawn(command, args, { stdio: verbose ? "inherit" : "pipe", env: process.env });
    let output = "";
    child.stdout?.on("data", (chunk) => (output += chunk));
    child.stderr?.on("data", (chunk) => (output += chunk));
    child.on("error", (error) => resolve({ code: 1, output: `${output}${error.message}\n` }));
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

/**
 * Format milliseconds as seconds with one decimal.
 *
 * @param {number} milliseconds
 * @returns {string}
 */
const seconds = (milliseconds) => `${(milliseconds / 1000).toFixed(1)}s`;

// Colour only a terminal, and honour the common NO_COLOR / FORCE_COLOR conventions.
const useColor = process.env.FORCE_COLOR ? process.env.FORCE_COLOR !== "0" : process.stdout.isTTY && !process.env.NO_COLOR;

/**
 * Wrap text in an ANSI colour when colour output is enabled.
 *
 * @param {number} code ANSI foreground colour code (32 green, 31 red).
 * @param {string} text
 * @returns {string}
 */
const paint = (code, text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);
const green = (text) => paint(32, text);
const red = (text) => paint(31, text);

const width = String(steps.length).length;
const labelWidth = Math.max(...steps.map((step) => step.length));
const started = performance.now();

for (const [index, step] of steps.entries()) {
  const counter = `[${String(index + 1).padStart(width)}/${steps.length}]`;
  if (verbose) console.log(`${counter} ${step}`);
  const stepStarted = performance.now();
  const { code, output } = await runScript(step);
  const time = seconds(performance.now() - stepStarted);

  if (code !== 0) {
    console.log(red(`${counter} ${step.padEnd(labelWidth)}  failed after ${time}`));
    if (output) process.stderr.write(output);
    process.exit(code);
  }
  if (!verbose) console.log(green(`${counter} ${step.padEnd(labelWidth)}  ${time}`));
}

console.log(green(`✓ ${steps.length} steps in ${seconds(performance.now() - started)}`));
