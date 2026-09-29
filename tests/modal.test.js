import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { Window } from 'happy-dom';

const window = new Window({ url: 'http://localhost/' });
globalThis.window = window;
globalThis.document = window.document;
globalThis.Node = window.Node;

const { createRoot } = await import('../dist/framework/nodula-framework.js');
const { openModal } = await import('../dist/framework/nodula-modal.js');

after(() => window.close());

describe('Nodula modal add-on', () => {
  it('opens a titled modal with safe text content and closes by its button', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const handle = openModal('<strong>Plain text</strong>', { title: 'Example modal' });

    const styles = document.querySelectorAll('style[data-nodula-modal-styles]');
    assert.equal(styles.length, 1);
    assert.match(styles[0].textContent, /@layer nodula-addons/);
    assert.match(styles[0].textContent, /\.ui-modal/);
    assert.equal(handle.element.getAttribute('role'), 'dialog');
    assert.equal(handle.element.getAttribute('aria-modal'), 'true');
    assert.equal(handle.element.querySelector('.ui-modal__title').textContent, 'Example modal');
    assert.equal(handle.element.querySelector('.ui-modal__body').textContent, '<strong>Plain text</strong>');
    assert.equal(handle.element.querySelector('strong'), null);
    assert.equal(document.activeElement.textContent, 'Close');

    handle.element.querySelector('.ui-modal__close').click();
    await handle.closed;
    assert.equal(document.querySelector('.ui-modal'), null);
    assert.equal(document.activeElement, opener);
  });

  it('accepts DOM node content and closes on Escape or backdrop dismissal', async () => {
    const content = document.createElement('p');
    content.textContent = 'Interactive modal content';
    const first = openModal(content, { closeText: 'Done' });
    assert.equal(first.element.querySelector('.ui-modal__body > p'), content);
    first.element.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    first.element.dispatchEvent(new window.Event('cancel', { cancelable: true }));
    await first.closed;

    const second = openModal('Dismiss with backdrop');
    second.element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await second.closed;
    assert.equal(document.querySelector('.ui-modal'), null);
  });

  it('keeps the modal open on backdrop clicks when closeOnBackdrop is false', async () => {
    const handle = openModal('Stay open', { closeOnBackdrop: false });
    assert.equal(document.querySelectorAll('style[data-nodula-modal-styles]').length, 1);
    handle.element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.ok(document.querySelector('.ui-modal'));

    handle.close();
    await handle.closed;
    assert.equal(document.querySelector('.ui-modal'), null);
  });

  it('closes and resolves its handle when the owning Nodula root is disposed', async () => {
    let handle;
    const [, dispose] = createRoot(() => {
      handle = openModal('Owned modal');
    });
    assert.ok(document.querySelector('.ui-modal'));
    dispose();
    await handle.closed;
    assert.equal(document.querySelector('.ui-modal'), null);
  });

  it('validates content and options and requires a browser document', () => {
    assert.throws(() => openModal(42), /text or a DOM node/);
    assert.throws(() => openModal('Content', { title: 42 }), /must be strings/);
    assert.throws(() => openModal('Content', { closeOnBackdrop: 'no' }), /closeOnBackdrop must be a boolean/);
    const currentDocument = globalThis.document;
    delete globalThis.document;
    assert.throws(() => openModal('No document'), /browser document/);
    globalThis.document = currentDocument;
  });
});