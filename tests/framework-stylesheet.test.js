import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { it } from 'node:test';

it('publishes shared dialog, modal, and drawer styles as one framework stylesheet', async () => {
  const stylesheet = await readFile(new URL('../dist/framework/nodula-framework.css', import.meta.url), 'utf8');

  for (const selector of [
    '.nodula-dialog{',
    '.nodula-modal{',
    '.nodula-drawer{',
    '.nodula-notification{',
    '.nodula-notification--error',
    '.nodula-notification--success',
    '.nodula-notification--warning',
    '.nodula-notification--info',
    '@keyframes nodula-drawer-enter-left',
    '@keyframes nodula-notification-enter',
    '@keyframes nodula-notification-exit',
    '@media (prefers-reduced-motion:reduce)',
  ]) {
    assert.ok(stylesheet.includes(selector), `missing ${selector}`);
  }
});