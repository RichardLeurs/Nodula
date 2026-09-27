import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Window } from 'happy-dom';
import { createServer } from 'vite';

it('switches between dark and light modes and restores the saved choice', async () => {
  const window = new Window({ url: 'http://localhost/' });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.Node = window.Node;
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  document.head.append(meta);
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  let dispose;
  try {
    const { default: AppShell } = await server.ssrLoadModule('/src/AppShell.comp');
    const { mount } = await server.ssrLoadModule('nodula-framework');
    dispose = mount(document.body, AppShell);
    const logo = document.querySelector('.brand-logo');
    assert.ok(logo);
    assert.equal(logo.tagName, 'SPAN');
    assert.equal(logo.getAttribute('aria-hidden'), 'true');
    const button = document.querySelector('.theme-toggle');
    assert.equal(document.documentElement.dataset.theme, 'dark');
    assert.equal(meta.content, '#101b25');
    assert.equal(button.getAttribute('aria-label'), 'Switch to light mode');
    button.click();
    assert.equal(document.documentElement.dataset.theme, 'light');
    assert.equal(meta.content, '#f5f8f1');
    assert.equal(button.getAttribute('aria-label'), 'Switch to dark mode');
    assert.equal(button.getAttribute('aria-pressed'), 'true');
    assert.equal(window.localStorage.getItem('nodula-theme'), '"light"');
    dispose();
    dispose = mount(document.body, AppShell);
    assert.equal(document.documentElement.dataset.theme, 'light');
    document.querySelector('.theme-toggle').click();
    assert.equal(document.documentElement.dataset.theme, 'dark');
    assert.equal(window.localStorage.getItem('nodula-theme'), '"dark"');
  } finally {
    dispose?.();
    delete globalThis.IntersectionObserver;
    await server.close();
    window.close();
  }
});