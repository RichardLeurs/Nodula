import { copyFile } from 'node:fs/promises';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [{
    name: 'nodula-pwa-types',
    async closeBundle() {
      await copyFile('src framework/addons/pwa.d.ts', 'dist/framework/nodula-pwa.d.ts');
    },
  }],
  build: {
    outDir: 'dist/framework',
    emptyOutDir: false,
    minify: 'oxc',
    lib: {
      entry: 'src framework/addons/pwa.js',
      formats: ['es'],
      fileName: () => 'nodula-pwa.js',
    },
    rolldownOptions: {
      external: ['vite', 'vite-plugin-pwa'],
    },
  },
});