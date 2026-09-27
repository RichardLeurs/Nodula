import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Window } from 'happy-dom';
import { createServer } from 'vite';

it('redirects signed-out Admin visits and allows the demo administrator identity', async () => {
  const window = new Window({ url: 'http://localhost/admin' });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.Node = window.Node;
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  let dispose;
  try {
    const { default: AppShell } = await server.ssrLoadModule('/src/AppShell.comp');
    const { demoAuth } = await server.ssrLoadModule('/src/demo-auth.js');
    const { mount } = await server.ssrLoadModule('nodula-framework');
    dispose = mount(document.body, AppShell);

    for (let attempt = 0; attempt < 50 && !document.querySelector('.auth-demo-page h1'); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(new URL(window.location.href).pathname, '/login');
    assert.equal(document.querySelector('.auth-demo-page h1')?.textContent, 'Demo sign-in');
    assert.equal(document.querySelector('.site-nav a[href="/admin"]'), null);
    const authButton = document.querySelector('.auth-toggle');
    assert.equal(authButton?.textContent, 'Sign in');

    authButton.click();
    await window.happyDOM.whenAsyncComplete();
    for (let attempt = 0; attempt < 50 && document.querySelector('.auth-demo-page h1')?.textContent !== 'Admin'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    assert.equal(new URL(window.location.href).pathname, '/admin');
    assert.equal(document.querySelector('.auth-demo-page h1')?.textContent, 'Admin');
    assert.match(document.querySelector('.auth-demo-page')?.textContent ?? '', /Demo Administrator/);
    assert.equal(authButton.textContent, 'Sign out');
    assert.ok(document.querySelector('.site-nav a[href="/admin"]'));

    authButton.click();
    await window.happyDOM.whenAsyncComplete();
    for (let attempt = 0; attempt < 50 && document.querySelector('.auth-demo-page h1')?.textContent !== 'Demo sign-in'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(new URL(window.location.href).pathname, '/login');
    assert.equal(authButton.textContent, 'Sign in');
    assert.equal(document.querySelector('.site-nav a[href="/admin"]'), null);
  } finally {
    dispose?.();
    delete globalThis.IntersectionObserver;
    await server.close();
    window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.Node;
  }
});