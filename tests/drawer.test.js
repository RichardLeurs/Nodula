import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { Window } from 'happy-dom';

const window = new Window({ url: 'http://localhost/' });
globalThis.window = window;
globalThis.document = window.document;
globalThis.Node = window.Node;

const { createRoot } = await import('../dist/framework/nodula-framework.js');
const { openDrawer } = await import('../dist/framework/nodula-drawer.js');

after(() => window.close());

describe('Nodula drawer add-on', () => {
  it('opens an accessible titled side drawer with safely rendered text', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const handle = openDrawer('<strong>Plain text</strong>', { title: 'Account details' });

    const styles = document.querySelectorAll('style[data-nodula-drawer-styles]');
    assert.equal(styles.length, 1);
    assert.match(styles[0].textContent, /@layer nodula-addons/);
    assert.match(styles[0].textContent, /\.ui-drawer/);
    assert.equal(handle.element.getAttribute('role'), 'dialog');
    assert.equal(handle.element.getAttribute('aria-modal'), 'true');
    assert.equal(handle.element.querySelector('.ui-drawer__title').textContent, 'Account details');
    assert.equal(handle.element.getAttribute('aria-labelledby'), handle.element.querySelector('.ui-drawer__title').id);
    assert.equal(handle.element.querySelector('.ui-drawer__body').textContent, '<strong>Plain text</strong>');
    assert.equal(handle.element.querySelector('strong'), null);
    assert.equal(document.activeElement.textContent, 'Close');

    handle.element.querySelector('.ui-drawer__close').click();
    await handle.closed;
    assert.equal(document.querySelector('.ui-drawer'), null);
    assert.equal(document.querySelectorAll('style[data-nodula-drawer-styles]').length, 1);
    assert.equal(document.activeElement, opener);
  });

  it('opens from the requested edge and defaults to the right', async () => {
    const rightDrawer = openDrawer('Right edge');
    assert.ok(rightDrawer.element.classList.contains('ui-drawer--right'));
    rightDrawer.close();
    await rightDrawer.closed;

    const leftDrawer = openDrawer('Left edge', { position: 'left' });
    assert.ok(leftDrawer.element.classList.contains('ui-drawer--left'));
    leftDrawer.close();
    await leftDrawer.closed;
  });

  it('closes on backdrop by default and stays open when closeOnBackdrop is false', async () => {
    const defaultDrawer = openDrawer('Default dismissal');
    defaultDrawer.element.getBoundingClientRect = () => ({ left: 100, right: 500, top: 0, bottom: 600 });
    defaultDrawer.element.dispatchEvent(new window.MouseEvent('click', {
      bubbles: true,
      clientX: 250,
      clientY: 100,
    }));
    assert.ok(document.querySelector('.ui-drawer'), 'clicking inside the drawer should not close it');
    defaultDrawer.element.dispatchEvent(new window.MouseEvent('click', {
      bubbles: true,
      clientX: 50,
      clientY: 100,
    }));
    await defaultDrawer.closed;
    assert.equal(document.querySelector('.ui-drawer'), null);

    const persistentDrawer = openDrawer('Explicit close only', { closeOnBackdrop: false, closeText: 'Done' });
    persistentDrawer.element.getBoundingClientRect = () => ({ left: 100, right: 500, top: 0, bottom: 600 });
    persistentDrawer.element.dispatchEvent(new window.MouseEvent('click', {
      bubbles: true,
      clientX: 50,
      clientY: 100,
    }));
    assert.ok(document.querySelector('.ui-drawer'));
    persistentDrawer.element.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    persistentDrawer.element.dispatchEvent(new window.Event('cancel', { cancelable: true }));
    await persistentDrawer.closed;
    assert.equal(document.querySelector('.ui-drawer'), null);
  });

  it('closes and resolves its handle when its Nodula owner is disposed', async () => {
    let handle;
    const [, dispose] = createRoot(() => {
      handle = openDrawer('Owned drawer');
    });
    assert.ok(document.querySelector('.ui-drawer'));
    dispose();
    await handle.closed;
    assert.equal(document.querySelector('.ui-drawer'), null);
  });

  it('validates content and options and requires a browser document', () => {
    assert.throws(() => openDrawer(42), /text or a DOM node/);
    assert.throws(() => openDrawer('Content', { title: 42 }), /must be strings/);
    assert.throws(() => openDrawer('Content', { closeOnBackdrop: 'no' }), /closeOnBackdrop must be a boolean/);
    assert.throws(() => openDrawer('Content', { position: 'top' }), /position must be "left" or "right"/);
    const currentDocument = globalThis.document;
    delete globalThis.document;
    assert.throws(() => openDrawer('No document'), /browser document/);
    globalThis.document = currentDocument;
  });
});