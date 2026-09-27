import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Window } from 'happy-dom';
import { createServer } from 'vite';

it('lists available add-ons on the page linked from shared navigation', async () => {
  const window = new Window({ url: 'http://localhost/' });
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.Node = window.Node;
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };

  let dispose;
  try {
    const { default: AppShell } = await server.ssrLoadModule('/src/AppShell.comp');
    const { mount } = await server.ssrLoadModule('/dist/framework/nodula-framework.js');
    dispose = mount(document.body, AppShell);

    const addonsLink = [...document.querySelectorAll('.site-nav a')]
      .find((link) => link.textContent.trim() === 'Add-ons');
    assert.ok(addonsLink);
    assert.equal(new URL(addonsLink.href).pathname, '/addons');
    const dataLink = [...document.querySelectorAll('.site-nav a')]
      .find((link) => link.textContent.trim() === 'Data');
    assert.ok(dataLink);
    assert.equal(new URL(dataLink.href).pathname, '/data');
    const webComponentsLink = [...document.querySelectorAll('.site-nav a')]
      .find((link) => link.textContent.trim() === 'Web Components');
    assert.ok(webComponentsLink);
    assert.equal(new URL(webComponentsLink.href).pathname, '/web-components');

    addonsLink.click();
    await window.happyDOM.whenAsyncComplete();
    for (let attempt = 0; attempt < 50 && !document.querySelector('.addons-page h1'); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    assert.equal(document.querySelector('.addons-page h1')?.textContent, 'Add-ons for the parts you need.');
    assert.equal(document.querySelectorAll('.addon-card').length, 10);
    for (const entry of [
      'nodula-framework/form',
      'nodula-framework/router',
      'nodula-framework/animation',
      'nodula-framework/dialog',
      'nodula-framework/modal',
      'nodula-framework/drawer',
      'nodula-framework/navigation',
      'nodula-framework/localstorage',
      'nodula-framework/data',
      'nodula-framework/store',
    ]) {
      assert.ok(document.querySelector('.addons-page').textContent.includes(entry), `missing ${entry}`);
    }

    const dataDemoLink = document.querySelector('.addons-page .addon-card__link');
    assert.equal(dataDemoLink?.getAttribute('href'), '/data');
  } finally {
    dispose?.();
    delete globalThis.IntersectionObserver;
    await server.close();
    window.close();
  }
});