import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { compileNodulaComponent, compileNodulaStyle } from './compiler.js';

export function nodulaPlugin() {
  return {
    name: 'nodula-single-file-components',
    enforce: 'pre',
    resolveId(id) {
      const [encodedFilePath, query] = id.split('?');
      if (!encodedFilePath.endsWith('.module.css') || !new URLSearchParams(query).has('nodula-style-module')) return null;
      return `${path.resolve(decodeURIComponent(encodedFilePath))}?${query}`;
    },
    async load(id) {
      const [encodedFilePath, query] = id.split('?');
      const filePath = decodeURIComponent(encodedFilePath);
      const queryParameters = new URLSearchParams(query);

      if (filePath.endsWith('.module.css') && queryParameters.has('nodula-style-module')) {
        const componentPath = filePath.slice(0, -'.module.css'.length);
        const source = await readFile(componentPath, 'utf8');
        return compileNodulaStyle(source, componentPath).css;
      }

      if (!/\.(?:page|comp)$/.test(filePath)) return null;
      const source = await readFile(filePath, 'utf8');
      if (queryParameters.has('nodula-style') || queryParameters.has('nodula-style-scoped')) {
        const { css } = compileNodulaStyle(source, filePath);
        if (!css.trim()) return 'export default undefined;';
        const styleId = `nodula-style-${Buffer.from(filePath).toString('base64url')}`;
        return `const id = ${JSON.stringify(styleId)};\nconst existing = document.getElementById(id);\nif (!existing) { const style = document.createElement('style'); style.id = id; style.textContent = ${JSON.stringify(css)}; document.head.append(style); }\nexport default id;`;
      }
      return compileNodulaComponent(source, filePath);
    },
  };
}