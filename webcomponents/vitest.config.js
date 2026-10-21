// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  test: {
    include: ["webcomponents/**/test/**/*.test.js"],
    environment: "node",
    fileParallelism: false,
    css: { include: [/\.css\?inline/] },
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
