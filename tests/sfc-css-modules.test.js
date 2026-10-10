import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { it } from 'vitest';
import { build, createServer } from 'vite';
import { compileNodulaComponent, compileNodulaStyle } from '../framework/compiler.js';
import { nodulaPlugin } from '../framework/vite-plugin.js';

it('compiles SFC CSS Modules to template $style mappings', () => {
  const source = '<template><button :class="$style.primary">Save</button></template><style module>.primary { color: red; }</style>';
  const output = compileNodulaComponent(source, '/project/ActionButton.comp');

  assert.match(output, /import \$style from "\/project\/ActionButton\.comp\.module\.css\?nodula-style-module"/);
  assert.match(output, /"className": \(\) => \(\$style\.primary\)/);
  assert.deepEqual(compileNodulaStyle(source, '/project/ActionButton.comp'), {
    css: '.primary { color: red; }',
    scoped: false,
    module: true,
  });
});

it('rejects unsupported SFC style module combinations and names', () => {
  assert.throws(
    () => compileNodulaComponent('<template><div /></template><style scoped module>.card { color: red; }</style>', 'Style.comp'),
    /cannot combine "scoped" and "module"/,
  );
  assert.throws(
    () => compileNodulaComponent('<template><div /></template><style module="classes">.card { color: red; }</style>', 'Style.comp'),
    /does not accept a custom mapping name/,
  );
});

it('passes SFC module styles through Vite CSS Modules in development', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'nodula-vite-css-module-'));
  const componentPath = path.join(directory, 'Button.comp');
  const server = await createServer({
    configFile: false,
    root: directory,
    appType: 'custom',
    plugins: [nodulaPlugin()],
    resolve: {
      alias: [{ find: /^nodula-framework$/, replacement: fileURLToPath(new URL('../framework/index.js', import.meta.url)) }],
    },
    server: { middlewareMode: true },
    logLevel: 'silent',
  });

  try {
    await writeFile(componentPath, `
      <template><button :class="$style.primary">Save</button></template>
      <style module>.primary { color: rgb(1, 2, 3); }</style>
    `);

    const componentModule = await server.transformRequest('/Button.comp');
    assert.match(componentModule.code, /\$style from .*Button\.comp\.module\.css\?nodula-style-module/);

    const cssModule = await server.transformRequest('/Button.comp.module.css?nodula-style-module');
    assert.match(cssModule.code, /export default/);
    assert.match(cssModule.code, /primary_[\w-]+/);
    assert.match(cssModule.code, /rgb\(1, 2, 3\)/);
  } finally {
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('emits SFC module CSS and class mappings in production builds', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'nodula-vite-css-module-build-'));

  try {
    await writeFile(path.join(directory, 'index.html'), '<script type="module" src="/src.js"></script>');
    await writeFile(path.join(directory, 'src.js'), "import Button from './Button.comp';\nconsole.log(Button);\n");
    await writeFile(path.join(directory, 'Button.comp'), `
      <template><button :class="$style.primary">Save</button></template>
      <style module>.primary { color: rgb(4, 5, 6); }</style>
    `);

    const result = await build({
      configFile: false,
      root: directory,
      plugins: [nodulaPlugin()],
      resolve: {
        alias: [{ find: /^nodula-framework$/, replacement: fileURLToPath(new URL('../framework/index.js', import.meta.url)) }],
      },
      build: { write: false, minify: false },
      logLevel: 'silent',
    });
    const outputs = Array.isArray(result) ? result.flatMap((entry) => entry.output) : result.output;
    const stylesheet = outputs.find((output) => output.type === 'asset' && output.fileName.endsWith('.css'));
    const javascript = outputs.filter((output) => output.type === 'chunk').map((output) => output.code).join('\n');

    assert.ok(stylesheet, 'production build should emit extracted CSS');
    assert.match(String(stylesheet.source), /primary_[\w-]+/);
    assert.match(String(stylesheet.source), /rgb\(4, 5, 6\)/);
    assert.match(javascript, /primary_[\w-]+/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});