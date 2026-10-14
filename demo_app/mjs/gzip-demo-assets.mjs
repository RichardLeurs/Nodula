import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const assetsDirectory = fileURLToPath(new URL('../../dist/app/assets/', import.meta.url));

for (const entry of await readdir(assetsDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.js')) continue;

  const file = path.join(assetsDirectory, entry.name);
  await writeFile(`${file}.gz`, gzipSync(await readFile(file)));
}