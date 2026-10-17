// Nodula browser checks: run the demo routes in Chromium and audit them with axe-core.
import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "framework/vitest",
  // Vitest owns the *.test.js files in this folder; Playwright runs only its *.spec.js files.
  testMatch: /\.spec\.js$/,
  // Output goes to the OS temp directory, so no untracked folders appear in the repository.
  outputDir: path.join(os.tmpdir(), "nodula-a11y"),
  reporter: [["list"]],
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5174",
    headless: true,
  },
  webServer: {
    command: "npm --prefix demo_app run dev -- --port 5174 --strictPort",
    url: "http://localhost:5174",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
