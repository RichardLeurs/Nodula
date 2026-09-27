import { copyFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const runtimeEntry = fileURLToPath(new URL('../dist/framework/nodula-framework.js', import.meta.url));

export default defineConfig({
  plugins: [{
    name: 'nodula-notifications-types',
    async closeBundle() {
      await copyFile('framework/addons/notifications.d.ts', 'dist/framework/nodula-notifications.d.ts');
    },
  }],
  build: {
    outDir: 'dist/framework',
    emptyOutDir: false,
    minify: 'oxc',
    lib: {
      entry: 'framework/addons/notifications.js',
      formats: ['es'],
      fileName: () => 'nodula-notifications.js',
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