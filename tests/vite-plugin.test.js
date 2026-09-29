import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { it } from 'node:test';
import { nodulaPlugin } from '../framework/vite-plugin.js';

it('compiles consumer .page and .comp files without repository-specific path mappings', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'nodula-vite-plugin-'));
  const pagePath = path.join(directory, 'Page.page');
  const componentPath = path.join(directory, 'Card.comp');
  const plugin = nodulaPlugin();

  try {
    await writeFile(pagePath, `
      <script setup>
      import { signal } from 'nodula-framework';
      const [count, setCount] = signal(0);
      </script>
      <template><main><button @click="setCount(count() + 1)">{{ count() }}</button></main></template>
      <style scoped>.counter { color: black; }</style>
    `);
    await writeFile(componentPath, '<template><article>Card</article></template>');

    const pageModule = await plugin.load(pagePath);
    const componentModule = await plugin.load(componentPath);
    const styleModule = await plugin.load(`${pagePath}?nodula-style-scoped`);

    assert.match(pageModule, /import \{ h \} from "nodula-framework"/);
    assert.match(pageModule, /setCount\(count\(\) \+ 1\)/);
    assert.match(componentModule, /export default Card/);
    assert.match(styleModule, /data-nodula-scope-/);
    assert.equal(await plugin.load(path.join(directory, 'plain.js')), null);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});