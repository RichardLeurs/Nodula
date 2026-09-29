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
    const { default: AppShell } = await server.ssrLoadModule('/src/AppShell.page');
    const { demoAuth } = await server.ssrLoadModule('/src/demo-auth.js');
    const { mount } = await server.ssrLoadModule('nodula-framework');
    dispose = mount(document.body, AppShell);

    for (let attempt = 0; attempt < 150 && document.querySelector('.page h1')?.textContent !== 'Demo sign-in'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(new URL(window.location.href).pathname, '/login');
    assert.equal(document.querySelector('.page h1')?.textContent, 'Demo sign-in');
    assert.equal(document.querySelector('.ui-site-nav a[href="/admin"]'), null);
    const authButton = document.querySelector('.ui-auth-toggle');
    assert.equal(authButton?.getAttribute('aria-label'), 'Sign in as the demo administrator');
    assert.equal(authButton?.querySelector('svg')?.getAttribute('class'), 'bi bi-person-fill-lock');

    authButton.click();
    await window.happyDOM.whenAsyncComplete();
    assert.equal(new URL(window.location.href).pathname, '/login');
    assert.equal(document.querySelector('.page h1')?.textContent, 'Demo sign-in');

    document.querySelector('.page button').click();
    for (let attempt = 0; attempt < 50 && new URL(window.location.href).pathname !== '/admin'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    for (let attempt = 0; attempt < 150 && document.querySelector('.page h1')?.textContent !== 'Admin'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    assert.equal(new URL(window.location.href).pathname, '/admin');
    assert.equal(document.querySelector('.page h1')?.textContent, 'Admin');
    assert.equal(demoAuth.user()?.name, 'Demo Administrator');
    assert.equal(authButton.getAttribute('aria-label'), 'Sign out of the demo administrator account');
    assert.equal(authButton.querySelector('svg')?.getAttribute('class'), 'bi bi-person-fill');
    assert.ok(document.querySelector('.ui-site-nav a[href="/admin"]'));

    authButton.click();
    for (let attempt = 0; attempt < 50 && new URL(window.location.href).pathname !== '/'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    for (let attempt = 0; attempt < 50 && !document.querySelector('.ui-home-hero__title'); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(new URL(window.location.href).pathname, '/');
    assert.ok(document.querySelector('.ui-home-hero__title'));
    assert.equal(authButton.getAttribute('aria-label'), 'Sign in as the demo administrator');
    assert.equal(authButton.querySelector('svg')?.getAttribute('class'), 'bi bi-person-fill-lock');
    assert.equal(document.querySelector('.ui-site-nav a[href="/admin"]'), null);
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