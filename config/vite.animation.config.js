import { copyFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const runtimeEntry = fileURLToPath(new URL('../dist/framework/nodula-framework.js', import.meta.url));

export default defineConfig({
  plugins: [{
    name: 'nodula-animation-types',
    async closeBundle() {
      await copyFile('src framework/addons/animation.d.ts', 'dist/framework/nodula-animation.d.ts');
    },
  }],
  build: {
    outDir: 'dist/framework',
    emptyOutDir: false,
    minify: 'oxc',
    lib: {
      entry: 'src framework/addons/animation.js',
      formats: ['es'],
      fileName: () => 'nodula-animation.js',
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