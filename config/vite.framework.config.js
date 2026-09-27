import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { transform } from 'lightningcss';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [{
    name: 'nodula-framework-types',
    async closeBundle() {
      await mkdir('dist/framework', { recursive: true });
      const cssParts = await Promise.all([
        'nodula-dialog.css',
        'nodula-modal.css',
        'nodula-drawer.css',
        'nodula-notifications.css',
      ].map((file) => readFile(`src framework/assets/${file}`, 'utf8')));
      const css = Buffer.from(cssParts.join('\n'));
      const minified = transform({ filename: 'nodula-framework.css', code: css, minify: true });
      await Promise.all([
        copyFile('src framework/index.d.ts', 'dist/framework/nodula-framework.d.ts'),
        writeFile('dist/framework/nodula-framework.css', minified.code),
        rm('dist/framework/nodula.js', { force: true }),
        rm('dist/framework/nodula.d.ts', { force: true }),
      ]);
    },
  }],
  build: {
    outDir: 'dist/framework',
    emptyOutDir: false,
    minify: 'oxc',
    cssMinify: 'lightningcss',
    rolldownOptions: {
      output: {
        minify: true,
      },
    },
    lib: {
      entry: 'src framework/index.js',
      formats: ['es'],
      fileName: () => 'nodula-framework.js',
    },
  },
});