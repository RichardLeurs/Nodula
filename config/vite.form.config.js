import { copyFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const runtimeEntry = fileURLToPath(new URL('../dist/framework/nodula-framework.js', import.meta.url));
const storeEntry = fileURLToPath(new URL('../dist/framework/nodula-store.js', import.meta.url));

export default defineConfig({
  plugins: [{
    name: 'nodula-form-types',
    async closeBundle() {
      await copyFile('framework/addons/form.d.ts', 'dist/framework/nodula-form.d.ts');
    },
  }],
  build: {
    outDir: 'dist/framework',
    emptyOutDir: false,
    minify: 'oxc',
    lib: {
      entry: 'framework/addons/form.js',
      formats: ['es'],
      fileName: () => 'nodula-form.js',
    },
    rolldownOptions: {
      external: (id) => id === runtimeEntry || id === storeEntry || id === 'nodula-framework' || id === 'nodula-framework/store',
      makeAbsoluteExternalsRelative: false,
      output: {
        paths: (id) => id === runtimeEntry || id === 'nodula-framework' ? './nodula-framework.js' : id === storeEntry || id === 'nodula-framework/store' ? './nodula-store.js' : id,
      },
    },
  },
});