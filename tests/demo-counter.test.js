import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Window } from 'happy-dom';
import { createServer } from 'vite';

function createIndexedDBMock(records = new Map()) {
  const database = {
    objectStoreNames: { contains: (name) => name === 'signals' },
    createObjectStore() {},
    close() {},
    transaction(_storeName, mode) {
      const transaction = {};
      let requests = 0;
      let settled = false;
      const complete = () => {
        if (settled) return;
        requests -= 1;
        if (requests === 0) {
          settled = true;
          setTimeout(() => transaction.oncomplete?.(), 0);
        }
      };
      const makeRequest = (resolve) => {
        requests += 1;
        const request = {};
        setTimeout(() => {
          try {
            request.result = resolve();
            request.onsuccess?.();
            complete();
          } catch (error) {
            request.error = error;
            request.onerror?.();
            transaction.onerror?.();
          }
        }, 0);
        return request;
      };

      transaction.objectStore = () => ({
        get: (key) => makeRequest(() => records.get(key)),
        getKey: (key) => makeRequest(() => records.has(key) ? key : undefined),
        put: (value, key) => makeRequest(() => {
          if (mode !== 'readwrite') throw new Error('Transaction is readonly.');
          records.set(key, value);
          return key;
        }),
      });
      return transaction;
    },
  };

  return {
    records,
    indexedDB: {
      open() {
        const request = {};
        setTimeout(() => {
          request.result = database;
          request.onupgradeneeded?.();
          request.onsuccess?.();
        }, 0);
        return request;
      },
    },
  };
}

it('renders the counter and IndexedDB-backed ideas card with local CRUD and persistence', async () => {
  const window = new Window({ url: 'http://localhost/' });
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.Node = window.Node;
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };
  const nativeSetTimeout = window.setTimeout.bind(window);
  let advanceCarousel;
  window.setTimeout = (callback, delay, ...args) => {
    if (delay === 4000) {
      advanceCarousel = () => callback(...args);
      return 0;
    }
    return nativeSetTimeout(callback, delay, ...args);
  };
  const mock = createIndexedDBMock();
  globalThis.indexedDB = mock.indexedDB;

  let dispose;
  try {
    const { default: HomePage } = await server.ssrLoadModule('/src/routes/index.page');
    const { mount } = await server.ssrLoadModule('/dist/framework/nodula-framework.js');
    dispose = mount(document.body, HomePage);

    const frameworkSpecs = document.querySelector('.framework-specs');
    assert.ok(frameworkSpecs);
    assert.match(frameworkSpecs.textContent, /Fine-grained reactive DOM/);
    assert.match(frameworkSpecs.textContent, /Signals and reactive stores/);
    assert.match(frameworkSpecs.textContent, /Lazy file-based pages and layouts/);
    const carousel = document.querySelector('.textcarrousel');
    const carouselPairs = [
      ['Small pieces.', 'Big ideas.'],
      ['Everything you need.', "Nothing you don't"],
      ['Less overhead.', 'More momentum.'],
      ['Big apps.', 'Small footprint.'],
      ['Less framework.', 'More application.'],
      ['Small core.', 'Infinite possibilities.'],
      ['Small modules.', 'Big applications.'],
      ['Modular by nature.', 'Nimble by design.'],
      ['Small pieces.', 'Big ideas.'],
    ];
    for (let index = 0; index < carouselPairs.length; index += 1) {
      assert.deepEqual(
        [...carousel.querySelectorAll('.textcarrousel-line')].map((line) => line.textContent),
        carouselPairs[index],
      );
      assert.equal(carousel.classList.contains(index % 2 === 0 ? 'textcarrousel--fade-a' : 'textcarrousel--fade-b'), true);
      if (index < carouselPairs.length - 1) {
        assert.equal(typeof advanceCarousel, 'function');
        advanceCarousel();
      }
    }
    assert.doesNotMatch(document.body.textContent, /Illustration of a growing sprout/);

    const demoGrid = document.querySelector('.demo-grid');
    const counterCard = demoGrid.querySelector('.counter-card');
    const ideasCard = demoGrid.querySelector('.ideas-card');
    assert.ok(counterCard);
    assert.ok(ideasCard);
    assert.equal(counterCard.querySelector('.counter-display strong').textContent, '00');
    assert.deepEqual([...demoGrid.children].map((element) => element.className),
      ['demo-card counter-card', 'demo-card ideas-card']);

    counterCard.querySelector('button').click();
    counterCard.querySelector('button').click();
    assert.equal(counterCard.querySelector('.counter-display strong').textContent, '02');

    await window.happyDOM.whenAsyncComplete();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(document.querySelectorAll('.idea').length, 3);
    assert.match(ideasCard.querySelector('.ideas-status').textContent, /IndexedDB available\./);
    assert.equal(mock.records.get('nodula-ideas').length, 3);

    const firstIdea = document.querySelector('.idea');
    const draft = document.querySelector('.add-input');
    draft.value = 'Persistent idea';
    draft.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('.add-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await window.happyDOM.whenAsyncComplete();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(document.querySelectorAll('.idea').length, 4);
    assert.equal(mock.records.get('nodula-ideas').at(-1).text, 'Persistent idea');

    const checkbox = document.querySelector('.idea input');
    checkbox.checked = true;
    checkbox.dispatchEvent(new window.Event('change', { bubbles: true }));
    await window.happyDOM.whenAsyncComplete();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(mock.records.get('nodula-ideas')[0].done, true);
    assert.equal(document.querySelector('.idea'), firstIdea);
    assert.match(firstIdea.className, /idea--done/);

    document.querySelector('.idea .icon-button').click();
    await window.happyDOM.whenAsyncComplete();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(document.querySelectorAll('.idea').length, 3);
    assert.equal(mock.records.get('nodula-ideas').some((idea) => idea.id === 1), false);

    dispose();
    dispose = mount(document.body, HomePage);
    await window.happyDOM.whenAsyncComplete();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(document.querySelectorAll('.idea').length, 3);
    assert.equal(document.querySelector('.idea-label span').textContent, 'Make a tiny thing that feels good');
    assert.equal(document.querySelector('.idea input').checked, true);
  } finally {
    dispose?.();
    delete globalThis.IntersectionObserver;
    delete globalThis.indexedDB;
    await server.close();
    window.close();
  }
});