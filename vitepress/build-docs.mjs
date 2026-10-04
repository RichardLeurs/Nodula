import { access, cp, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const docsDirectory = fileURLToPath(new URL('.', import.meta.url));
const docsOutputDirectory = fileURLToPath(new URL('./docs/.vitepress/dist', import.meta.url));
const publishDirectory = fileURLToPath(new URL('../dist/vitepress', import.meta.url));
const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

try {
  await access(docsDirectory);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  console.info('Skipping docs build: /vitepress directory not found.');
  process.exit(0);
}

const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const result = spawnSync(process.execPath, [vite, 'build', '--config', 'vite.config.js', '--mode', 'docs'], {
  cwd: repositoryRoot,
  stdio: 'inherit',
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

await mkdir(publishDirectory, { recursive: true });
await cp(docsOutputDirectory, publishDirectory, { recursive: true, force: true });
console.info('Copied VitePress output to dist/vitepress.');