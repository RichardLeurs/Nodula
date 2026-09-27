import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Window } from 'happy-dom';
import { createServer } from 'vite';

it('loads and displays JSON from the editable server address', async () => {
  const window = new Window({ url: 'http://localhost/data' });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.Node = window.Node;
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(JSON.stringify({ id: requests.length, title: 'Nodula data demo' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  let dispose;
  try {
    const { default: DataPage } = await server.ssrLoadModule('/src/routes/data.page');
    const { mount } = await server.ssrLoadModule('/dist/framework/nodula-framework.js');
    dispose = mount(document.body, DataPage);
    await window.happyDOM.whenAsyncComplete();

    for (let attempt = 0; attempt < 50 && !document.querySelector('.data-demo__response code')?.textContent.includes('Nodula data demo'); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    assert.equal(requests[0].url, 'https://jsonplaceholder.typicode.com/posts/1');
    assert.match(document.querySelector('.data-demo__response code')?.textContent ?? '', /Nodula data demo/);
    assert.equal(document.querySelector('.data-demo__error')?.textContent, '');

    const endpoint = document.querySelector('#data-endpoint');
    endpoint.value = 'https://jsonplaceholder.typicode.com/posts/2';
    endpoint.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('.data-demo [type="submit"]').click();
    await window.happyDOM.whenAsyncComplete();

    assert.equal(requests[1].url, endpoint.value);
    assert.match(document.querySelector('.data-demo__response code')?.textContent ?? '', /"id": 2/);
  } finally {
    dispose?.();
    globalThis.fetch = originalFetch;
    await server.close();
    window.close();
  }
});