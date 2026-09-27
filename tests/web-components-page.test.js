import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Window } from 'happy-dom';
import { createServer } from 'vite';

it('renders the external custom element and reactively updates its icon property', async () => {
  const window = new Window({ url: 'http://localhost/web-components' });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.Node = window.Node;
  window.customElements.define('iconify-icon', class extends window.HTMLElement {});
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  let dispose;
  try {
    const { default: WebComponentsPage } = await server.ssrLoadModule('/src%20app/routes/web-components.page');
    const { mount } = await server.ssrLoadModule('/dist/framework/nodula-framework.js');
    dispose = mount(document.body, WebComponentsPage);

    const icons = [...document.querySelectorAll('iconify-icon')];
    assert.equal(icons.length, 4);
    assert.equal(icons.at(-1).icon, 'mdi:cursor-default-click-outline');

    document.querySelector('[aria-label="Select rocket icon"]').click();
    assert.equal(document.querySelector('.web-component-selection code').textContent, 'mdi:rocket-launch');
    assert.equal(icons.at(-1).icon, 'mdi:rocket-launch');
  } finally {
    dispose?.();
    await server.close();
    window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.Node;
  }
});