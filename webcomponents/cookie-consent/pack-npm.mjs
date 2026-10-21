// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { spawnSync } from "node:child_process";
import { copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { cookieConsentOutputDirectory } from "./vite.config.js";

/**
 * Turn the built cookie consent folder into an npm package: copy package.json next to the bundles
 * and run `npm pack`, so the tarball lands in the same versioned folder.
 *
 * Usage: `node webcomponents/cookie-consent/pack-npm.mjs`, after both Vite builds have finished.
 */

await copyFile(
  fileURLToPath(new URL("./package.json", import.meta.url)),
  `${cookieConsentOutputDirectory}/package.json`,
);

const result = spawnSync(
  "npm",
  ["pack", "--pack-destination", cookieConsentOutputDirectory, "--silent"],
  { cwd: cookieConsentOutputDirectory, stdio: "inherit", shell: process.platform === "win32" },
);

if (result.status !== 0) {
  console.error("pack-npm: npm pack failed for the cookie consent web component.");
  process.exit(result.status ?? 1);
}
