import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { Window } from 'happy-dom';

const window = new Window({ url: 'http://localhost/' });
globalThis.window = window;
globalThis.document = window.document;

const { createRoot } = await import('../dist/framework/nodula-framework.js');
const { showNotification } = await import('../dist/framework/nodula-notifications.js');

after(() => window.close());

function finishClose(element) {
  element.dispatchEvent(new window.Event('animationend', { bubbles: true }));
}

describe('Nodula notification add-on', () => {
  it('renders each notification type with a title, message, and accessible role', async () => {
    const types = ['error', 'success', 'warning', 'info'];
    const handles = types.map((type) => showNotification({
      type,
      title: `${type} title`,
      message: `${type} message`,
      duration: 0,
    }));

    assert.equal(document.querySelectorAll('.nodula-notifications').length, 1);
    assert.equal(document.querySelectorAll('.nodula-notification').length, 4);
    const styles = document.querySelectorAll('style[data-nodula-notifications-styles]');
    assert.equal(styles.length, 1);
    assert.match(styles[0].textContent, /@layer nodula-addons/);
    assert.match(styles[0].textContent, /\.nodula-notification/);
    for (const [index, type] of types.entries()) {
      const { element } = handles[index];
      assert.ok(element.classList.contains(`nodula-notification--${type}`));
      assert.equal(element.querySelector('.nodula-notification__title').textContent, `${type} title`);
      assert.equal(element.querySelector('.nodula-notification__message').textContent, `${type} message`);
      assert.equal(element.getAttribute('role'), type === 'error' ? 'alert' : 'status');
      assert.equal(element.getAttribute('aria-labelledby'), element.querySelector('.nodula-notification__title').id);
      assert.equal(element.getAttribute('aria-describedby'), element.querySelector('.nodula-notification__message').id);
    }

    handles[0].element.querySelector('button').click();
    assert.ok(handles[0].element.classList.contains('nodula-notification--closing'));
    finishClose(handles[0].element);
    await handles[0].closed;
    assert.equal(handles[0].element.isConnected, false);

    for (const handle of handles.slice(1)) {
      handle.close();
      finishClose(handle.element);
      await handle.closed;
    }
    assert.equal(document.querySelector('.nodula-notifications'), null);
  });

  it('supports screen positioning and auto-dismissal', async () => {
    const handle = showNotification({
      type: 'info',
      title: 'Saved',
      message: 'Your changes were saved.',
      position: 'bottom-center',
      duration: 1,
    });
    const container = document.querySelector('.nodula-notifications');
    assert.ok(container.classList.contains('nodula-notifications--bottom-center'));

    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.ok(handle.element.classList.contains('nodula-notification--closing'));
    finishClose(handle.element);
    await handle.closed;
  });

  it('closes an owned notification when its Nodula root is disposed', async () => {
    let handle;
    const [, dispose] = createRoot(() => {
      handle = showNotification({ title: 'Owned', message: 'Root cleanup', duration: 0 });
    });

    dispose();
    assert.ok(handle.element.classList.contains('nodula-notification--closing'));
    finishClose(handle.element);
    await handle.closed;
    assert.equal(document.querySelector('.nodula-notifications'), null);
  });

  it('validates notification options', () => {
    assert.throws(() => showNotification(null), /options object/);
    assert.throws(() => showNotification({ title: '', message: 'Message' }), /non-empty strings/);
    assert.throws(() => showNotification({ title: 'Title', message: 'Message', type: 'neutral' }), /type must be/);
    assert.throws(() => showNotification({ title: 'Title', message: 'Message', position: 'middle' }), /position must be/);
    assert.throws(() => showNotification({ title: 'Title', message: 'Message', duration: -1 }), /duration must be/);
  });
});