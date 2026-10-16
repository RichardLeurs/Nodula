import { fileURLToPath } from "node:url";
import { build as buildVitePress } from "vitepress";
import { defineConfig } from "vite";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const siteRoot = fileURLToPath(new URL("./docs", import.meta.url));

export default defineConfig({
  root: repositoryRoot,
  plugins: [
    {
      name: "nodula-vitepress-build",
      apply: "build",
      async closeBundle() {
        await buildVitePress(siteRoot);
      },
    },
  ],
  build: {
    write: false,
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL("./build-entry.js", import.meta.url)),
      formats: ["es"],
      fileName: () => "nodula-vitepress-build.js",
    },
  },
});
