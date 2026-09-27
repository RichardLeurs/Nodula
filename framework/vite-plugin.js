import { readFile } from 'node:fs/promises';
import { compileNodulaComponent, compileNodulaStyle } from './compiler.js';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const runtimeEntry = fileURLToPath(new URL('../dist/framework/nodula-framework.js', import.meta.url));

export function nodulaPlugin() {
  return {
    name: 'nodula-single-file-components',
    enforce: 'pre',
    resolveId(source) {
      if (source === 'nodula:runtime') return runtimeEntry;
      const decodedSource = decodeURIComponent(source);
      if (decodedSource.startsWith('/dist/') || decodedSource.startsWith('/tests/')) {
        return resolve(process.cwd(), decodedSource.slice(1));
      }
      if (decodedSource.startsWith('/src/')) {
        return resolve(process.cwd(), 'demo app', decodedSource.slice(1));
      }
      return null;
    },
    async load(id) {
      const [encodedFilePath, query] = id.split('?');
      const filePath = decodeURIComponent(encodedFilePath);
      if (!/\.(?:page|comp)$/.test(filePath)) return null;
      const source = await readFile(filePath, 'utf8');
      if (query === 'nodula-style' || query === 'nodula-style-scoped') {
        const { css } = compileNodulaStyle(source, filePath);
        if (!css.trim()) return 'export default undefined;';
        const styleId = `nodula-style-${Buffer.from(resolve(filePath)).toString('base64url')}`;
        return `const id = ${JSON.stringify(styleId)};\nconst existing = document.getElementById(id);\nif (!existing) { const style = document.createElement('style'); style.id = id; style.textContent = ${JSON.stringify(css)}; document.head.append(style); }\nexport default id;`;
      }
      return compileNodulaComponent(source, filePath);
    },
  };
}