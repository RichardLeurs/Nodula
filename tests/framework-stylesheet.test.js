import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { it } from 'node:test';

it('publishes shared dialog, modal, and drawer styles as one framework stylesheet', async () => {
  const stylesheet = await readFile(new URL('../dist/framework/nodula-framework.css', import.meta.url), 'utf8');

  for (const selector of [
    '.ui-dialog{',
    '.ui-modal{',
    '.ui-drawer{',
    '.ui-notification{',
    '.ui-notification--error',
    '.ui-notification--success',
    '.ui-notification--warning',
    '.ui-notification--info',
    '@keyframes ui-drawer-enter-left',
    '@keyframes ui-notification-enter',
    '@keyframes ui-notification-exit',
    '@media (prefers-reduced-motion:reduce)',
  ]) {
    assert.ok(stylesheet.includes(selector), `missing ${selector}`);
  }
});