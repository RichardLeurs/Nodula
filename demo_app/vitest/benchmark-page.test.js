import assert from 'node:assert/strict';
import { it } from 'vitest';
import { Window } from 'happy-dom';
import { createDemoAppTestServer } from './demo-app-test-server.js';

it('runs benchmark controls with keyed rows, selection, updates, and cleanup', async () => {
  const window = new Window({ url: 'http://localhost/benchmark' });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.Node = window.Node;
  const server = await createDemoAppTestServer();
  let dispose;

  try {
    const { default: BenchmarkPage } = await server.ssrLoadModule('/src/routes/benchmark.page');
    const { mount } = await server.ssrLoadModule('nodula-framework');
    dispose = mount(document.body, BenchmarkPage);

    assert.equal(document.querySelector('h1')?.textContent, 'NodulaJS (keyed)');
    assert.equal(document.querySelectorAll('.test-data tbody tr').length, 0);

    document.querySelector('#run').click();
    assert.equal(document.querySelectorAll('.test-data tbody tr').length, 1000);

    const firstRow = document.querySelector('.test-data tbody tr');
    const firstLabel = firstRow.querySelector('td:nth-child(2) a');
    const firstOriginalLabel = firstLabel.textContent;
    firstLabel.click();
    assert.equal(firstRow.classList.contains('danger'), true);

    document.querySelector('#update').click();
    assert.equal(document.querySelector('.test-data tbody tr'), firstRow);
    assert.equal(firstRow.querySelector('td:nth-child(2) a').textContent, `${firstOriginalLabel} !!!`);
    assert.equal(firstRow.classList.contains('danger'), true);

    const rowAtOne = document.querySelectorAll('.test-data tbody tr')[1];
    const rowAt998 = document.querySelectorAll('.test-data tbody tr')[998];
    document.querySelector('#swaprows').click();
    assert.equal(document.querySelectorAll('.test-data tbody tr')[1], rowAt998);
    assert.equal(document.querySelectorAll('.test-data tbody tr')[998], rowAtOne);

    const selectedId = firstRow.querySelector('td').textContent;
    firstRow.querySelector('td:nth-child(3) a').click();
    assert.equal(document.querySelectorAll('.test-data tbody tr').length, 999);
    assert.equal(document.querySelector(`.test-data tbody tr td:first-child`)?.textContent === selectedId, false);

    document.querySelector('#add').click();
    assert.equal(document.querySelectorAll('.test-data tbody tr').length, 1999);

    document.querySelector('#runlots').click();
    assert.equal(document.querySelectorAll('.test-data tbody tr').length, 10000);

    document.querySelector('#clear').click();
    assert.equal(document.querySelectorAll('.test-data tbody tr').length, 0);

    dispose();
    dispose = undefined;
    assert.equal(document.body.querySelector('.jumbotron'), null);
  } finally {
    dispose?.();
    await server.close();
    window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.Node;
  }
});