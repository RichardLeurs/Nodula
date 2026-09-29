import { readFile } from 'node:fs/promises';
import { compileNodulaComponent, compileNodulaStyle } from './compiler.js';

export function nodulaPlugin() {
  return {
    name: 'nodula-single-file-components',
    enforce: 'pre',
    async load(id) {
      const [encodedFilePath, query] = id.split('?');
      const filePath = decodeURIComponent(encodedFilePath);
      if (!/\.(?:page|comp)$/.test(filePath)) return null;
      const source = await readFile(filePath, 'utf8');
      if (query === 'nodula-style' || query === 'nodula-style-scoped') {
        const { css } = compileNodulaStyle(source, filePath);
        if (!css.trim()) return 'export default undefined;';
        const styleId = `nodula-style-${Buffer.from(filePath).toString('base64url')}`;
        return `const id = ${JSON.stringify(styleId)};\nconst existing = document.getElementById(id);\nif (!existing) { const style = document.createElement('style'); style.id = id; style.textContent = ${JSON.stringify(css)}; document.head.append(style); }\nexport default id;`;
      }
      return compileNodulaComponent(source, filePath);
    },
  };
}