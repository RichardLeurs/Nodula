// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/**
 * Print the opening or closing message of a full build.
 *
 * Usage: `node framework/mjs/build-banner.mjs start|done`. The start message is the Nodula logo in ASCII
 * art followed by "Building Nodula Framework". The closing line is only reached when every earlier step in
 * the `&&` chain succeeded. Both are green in a terminal, like the step runner.
 */

// String.raw keeps the backslashes of the letters as they are.
const logo = String.raw`
 _   _           _       _
| \ | | ___   __| |_   _| | __ _
|  \| |/ _ \ / _${"`"} | | | | |/ _${"`"} |
| |\  | (_) | (_| | |_| | | (_| |
|_| \_|\___/ \__,_|\__,_|_|\__,_|
`;

const messages = { start: `${logo}\nBuilding Nodula Framework\n`, done: "\nBuild complete" };
const kind = process.argv[2];

if (!messages[kind]) {
  console.error('build-banner: expected "start" or "done".');
  process.exit(1);
}

// Same colour rules as run-steps.mjs: terminal only, honouring NO_COLOR and FORCE_COLOR.
const useColor = process.env.FORCE_COLOR ? process.env.FORCE_COLOR !== "0" : process.stdout.isTTY && !process.env.NO_COLOR;

console.log(useColor ? `\x1b[32m${messages[kind]}\x1b[0m` : messages[kind]);
