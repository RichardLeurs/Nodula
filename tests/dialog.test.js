import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { Window } from 'happy-dom';

const window = new Window({ url: 'http://localhost/' });
globalThis.window = window;
globalThis.document = window.document;
globalThis.Node = window.Node;

const { createRoot } = await import('../dist/framework/nodula-framework.js');
const { showDialog } = await import('../dist/framework/nodula-dialog.js');

after(() => window.close());

describe('Nodula dialog add-on', () => {
  it('shows the supplied message and resolves true when OK is clicked', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();

    const result = showDialog('Save these changes? <unsafe>', { title: 'Confirm save' });
    const dialog = document.querySelector('dialog.nodula-dialog');
    assert.ok(dialog);
    const styles = document.querySelectorAll('style[data-nodula-dialog-styles]');
    assert.equal(styles.length, 1);
    assert.match(styles[0].textContent, /@layer nodula-addons/);
    assert.match(styles[0].textContent, /\.nodula-dialog/);
    assert.equal(dialog.getAttribute('role'), 'alertdialog');
    assert.equal(dialog.getAttribute('aria-modal'), 'true');
    assert.equal(dialog.querySelector('.nodula-dialog__title').textContent, 'Confirm save');
    assert.equal(dialog.querySelector('.nodula-dialog__header').parentElement, dialog);
    assert.equal(dialog.getAttribute('aria-labelledby'), dialog.querySelector('.nodula-dialog__title').id);
    assert.equal(dialog.getAttribute('aria-describedby'), dialog.querySelector('.nodula-dialog__message').id);
    assert.equal(dialog.querySelector('.nodula-dialog__message').textContent, 'Save these changes? <unsafe>');
    assert.equal(dialog.querySelector('.nodula-dialog__message').querySelector('unsafe'), null);
    assert.equal(dialog.querySelectorAll('button').length, 2);
    assert.equal(document.activeElement.textContent, 'OK');

    dialog.querySelector('.nodula-dialog__button--ok').click();

    assert.equal(await result, true);
    assert.equal(document.querySelector('dialog.nodula-dialog'), null);
    assert.equal(document.querySelectorAll('style[data-nodula-dialog-styles]').length, 1);
    assert.equal(document.activeElement, opener);
  });

  it('uses custom Cancel and OK button labels', async () => {
    const result = showDialog('Reset your changes?', {
      cancelText: 'Keep editing',
      okText: 'Reset form',
    });
    const dialog = document.querySelector('dialog.nodula-dialog');
    assert.equal(dialog.querySelector('.nodula-dialog__button--cancel').textContent, 'Keep editing');
    assert.equal(dialog.querySelector('.nodula-dialog__button--ok').textContent, 'Reset form');

    dialog.querySelector('.nodula-dialog__button--ok').click();
    assert.equal(await result, true);
  });

  it('keeps the confirmation label when no optional title is provided', async () => {
    const result = showDialog('Continue without a title?');
    const dialog = document.querySelector('.nodula-dialog');
    assert.equal(dialog.getAttribute('aria-label'), 'Confirmation dialog');
    assert.equal(dialog.querySelector('.nodula-dialog__title'), null);
    dialog.querySelector('.nodula-dialog__button--cancel').click();
    assert.equal(await result, false);
  });

  it('resolves false when Cancel or Escape dismisses the dialog', async () => {
    const canceled = showDialog('Cancel this operation?');
    document.querySelector('.nodula-dialog__button--cancel').click();
    assert.equal(await canceled, false);

    const escaped = showDialog('Escape to cancel?');
    const dialog = document.querySelector('dialog.nodula-dialog');
    dialog.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    assert.equal(await escaped, false);
    assert.equal(document.querySelector('dialog.nodula-dialog'), null);
  });

  it('resolves false and removes the dialog when its Nodula owner is disposed', async () => {
    let pending;
    const [, dispose] = createRoot(() => {
      pending = showDialog('This dialog belongs to a root.');
    });

    assert.ok(document.querySelector('dialog.nodula-dialog'));
    assert.equal(document.querySelectorAll('style[data-nodula-dialog-styles]').length, 1);
    dispose();
    assert.equal(await pending, false);
    assert.equal(document.querySelector('dialog.nodula-dialog'), null);
    assert.equal(document.querySelectorAll('style[data-nodula-dialog-styles]').length, 1);
  });

  it('rejects non-string messages and handles unavailable document context', async () => {
    assert.throws(() => showDialog(42), /message string/);
    assert.throws(() => showDialog('Invalid labels', { cancelText: 1 }), /button labels must be strings/);
    assert.throws(() => showDialog('Invalid title', { title: 42 }), /title and button labels must be strings/);
    const currentDocument = globalThis.document;
    delete globalThis.document;
    await assert.rejects(showDialog('No document'), /browser document/);
    globalThis.document = currentDocument;
  });
});