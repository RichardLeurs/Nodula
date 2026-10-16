import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const outputDirectory = fileURLToPath(new URL("../../dist/nodula/", import.meta.url));

async function gzipDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name !== "css") await gzipDirectory(path.join(directory, entry.name));
      continue;
    }

    if (!entry.isFile() || entry.name.endsWith(".gz")) continue;

    const file = path.join(directory, entry.name);
    await writeFile(`${file}.gz`, gzipSync(await readFile(file)));
  }
}

await gzipDirectory(outputDirectory);
