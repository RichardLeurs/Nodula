import { copyFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const runtimeEntry = fileURLToPath(new URL('../dist/framework/nodula-framework.js', import.meta.url));

export default defineConfig({
  plugins: [{
    name: 'nodula-modal-types',
    async closeBundle() {
      await copyFile('src framework/addons/modal.d.ts', 'dist/framework/nodula-modal.d.ts');
    },
  }],
  build: {
    outDir: 'dist/framework',
    emptyOutDir: false,
    minify: 'oxc',
    lib: {
      entry: 'src framework/addons/modal.js',
      formats: ['es'],
      fileName: () => 'nodula-modal.js',
    },
    rolldownOptions: {
      external: (id) => id === runtimeEntry || id === 'nodula-framework',
      makeAbsoluteExternalsRelative: false,
      output: {
        paths: (id) => id === runtimeEntry || id === 'nodula-framework' ? './nodula-framework.js' : id,
      },
    },
  },
});