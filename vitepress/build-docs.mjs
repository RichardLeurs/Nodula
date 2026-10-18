// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { access, cp, mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * Build the VitePress docs into dist/vitepress.
 *
 * Usage: `node vitepress/build-docs.mjs [clean|site|copy]`. Without an argument all three steps run in order,
 * so the build step runner can show them as separate steps.
 */

const docsDirectory = fileURLToPath(new URL('.', import.meta.url));
const docsOutputDirectory = fileURLToPath(new URL('./docs/.vitepress/dist', import.meta.url));
const publishDirectory = fileURLToPath(new URL('../dist/vitepress', import.meta.url));
const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));

/** Empty the published docs folder. */
async function clean() {
  await rm(publishDirectory, { recursive: true, force: true });
  await mkdir(publishDirectory, { recursive: true });
}

/** Build the VitePress site into its own output folder. */
function site() {
  const result = spawnSync(process.execPath, [vite, 'build', '--config', 'vite.config.js', '--mode', 'docs'], {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

/** Copy the built site to dist/vitepress. */
async function copy() {
  await mkdir(publishDirectory, { recursive: true });
  await cp(docsOutputDirectory, publishDirectory, { recursive: true, force: true });
  console.info('Copied VitePress output to dist/vitepress.');
}

try {
  await access(docsDirectory);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  console.info('Skipping docs build: /vitepress directory not found.');
  process.exit(0);
}

const steps = { clean, site, copy };
const step = process.argv[2];
if (step && !steps[step]) {
  console.error(`build-docs: unknown step "${step}"; expected clean, site or copy.`);
  process.exit(1);
}
for (const run of step ? [steps[step]] : Object.values(steps)) await run();
