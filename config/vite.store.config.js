import { copyFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const runtimeEntry = fileURLToPath(new URL('../src framework/reactivity.js', import.meta.url));

export default defineConfig({
  plugins: [{
    name: 'nodula-store-types',
    async closeBundle() {
      await copyFile('src framework/addons/store.d.ts', 'dist/framework/nodula-store.d.ts');
    },
  }],
  build: {
    outDir: 'dist/framework',
    emptyOutDir: false,
    minify: 'oxc',
    lib: {
      entry: 'src framework/addons/store.js',
      formats: ['es'],
      fileName: () => 'nodula-store.js',
    },
    rolldownOptions: {
      external: (id) => id === runtimeEntry,
      makeAbsoluteExternalsRelative: false,
      output: {
        paths: (id) => id === runtimeEntry ? './nodula-framework.js' : id,
      },
    },
  },
});