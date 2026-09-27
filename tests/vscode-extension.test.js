import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const extension = join(root, 'vscode-nodula');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

test('Nodula extension contributes a language and its grammar from the extension folder', () => {
  const manifest = readJson(join(extension, 'package.json'));
  const language = manifest.contributes.languages.find(({ id }) => id === 'nodula');
  const grammar = manifest.contributes.grammars.find(({ language: id }) => id === 'nodula');

  assert.ok(language);
  assert.ok(grammar);
  assert.ok(language.extensions.includes('.page'));
  assert.ok(language.extensions.includes('.comp'));
  assert.equal(grammar.scopeName, 'source.nodula');
  assert.ok(readJson(resolve(extension, language.configuration)));
  assert.equal(readJson(resolve(extension, grammar.path)).scopeName, grammar.scopeName);
});

test('debug configuration loads the extension folder without forcing an unloaded language association', () => {
  const launch = readJson(join(root, '.vscode', 'launch.json'));
  const settings = readJson(join(root, '.vscode', 'settings.json'));

  assert.ok(launch.configurations.some(({ type, args }) =>
    type === 'extensionHost' && args.includes('--extensionDevelopmentPath=${workspaceFolder}/vscode-nodula')));
  assert.equal(settings['files.associations']?.['*.page'], undefined);
  assert.equal(settings['files.associations']?.['*.comp'], undefined);
});