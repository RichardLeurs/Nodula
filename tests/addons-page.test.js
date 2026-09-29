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
  globalThis.Element = window.Element;
  globalThis.MutationObserver = window.MutationObserver;
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };

  let dispose;
  let disposeCodeHighlighting;
  try {
    const { default: AppShell } = await server.ssrLoadModule('/src/AppShell.page');
    const { mount } = await server.ssrLoadModule('nodula-framework');
    const { installDemoCodeHighlighting } = await server.ssrLoadModule('/src/highlight-demo-code.js');
    dispose = mount(document.body, AppShell);
    disposeCodeHighlighting = installDemoCodeHighlighting(document.querySelector('.ui-app'));

    const addonsLink = [...document.querySelectorAll('.ui-site-nav a')]
      .find((link) => link.textContent.trim() === 'Add-ons');
    assert.ok(addonsLink);
    assert.equal(new URL(addonsLink.href).pathname, '/addons');
    const dataLink = [...document.querySelectorAll('.ui-site-nav a')]
      .find((link) => link.textContent.trim() === 'Data');
    assert.ok(dataLink);
    assert.equal(new URL(dataLink.href).pathname, '/data');
    const webComponentsLink = [...document.querySelectorAll('.ui-site-nav a')]
      .find((link) => link.textContent.trim() === 'Web Components');
    assert.ok(webComponentsLink);
    assert.equal(new URL(webComponentsLink.href).pathname, '/web-components');
    const demoCssLink = [...document.querySelectorAll('.ui-site-nav a')]
      .find((link) => link.textContent.trim() === 'NodulaUI');
    assert.ok(demoCssLink);
    assert.equal(new URL(demoCssLink.href).pathname, '/democss');

    demoCssLink.click();
    for (let attempt = 0; attempt < 100 && document.querySelectorAll('.ui-token-swatch').length !== 5; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(new URL(window.location.href).pathname, '/democss');
    assert.equal(document.querySelector('.ui-page__title')?.textContent, 'A small, composable UI vocabulary.');
    assert.equal(document.querySelectorAll('.ui-token-swatch').length, 5);
    assert.equal(document.querySelectorAll('.ui-table tbody tr').length, 3);

    const addonsNavLink = [...document.querySelectorAll('.ui-site-nav a')]
      .find((link) => link.textContent.trim() === 'Add-ons');
    assert.ok(addonsNavLink);

    addonsNavLink.click();
    await window.happyDOM.whenAsyncComplete();
    for (let attempt = 0; attempt < 50 && !document.querySelector('.ui-page__title'); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    assert.equal(document.querySelector('.ui-page__title')?.textContent, 'Add-ons for the parts you need.');
    assert.equal(document.querySelectorAll('.ui-card').length, 11);
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
      'nodula-framework/auth',
    ]) {
      assert.ok(document.querySelector('.ui-page').textContent.includes(entry), `missing ${entry}`);
    }

    const dataCard = [...document.querySelectorAll('.ui-card')]
      .find((card) => card.querySelector('.ui-card__title')?.textContent === 'Data');
    const dataDemoLink = dataCard?.querySelector('.ui-card__footer a');
    assert.equal(dataDemoLink?.getAttribute('href'), '/data');
    assert.equal(document.querySelectorAll('.ui-code-block code[data-highlight]').length, 11);
    assert.ok([...document.querySelectorAll('.ui-code-block code[data-highlight]')]
      .every((code) => code.dataset.highlighted === 'yes'));
    const authCard = [...document.querySelectorAll('.ui-card')]
      .find((card) => card.querySelector('.ui-card__title')?.textContent === 'Auth');
    assert.equal(authCard?.querySelector('.ui-card__footer a')?.getAttribute('href'), '/login');
  } finally {
    disposeCodeHighlighting?.();
    dispose?.();
    delete globalThis.IntersectionObserver;
    delete globalThis.Element;
    delete globalThis.MutationObserver;
    await server.close();
    window.close();
  }
});