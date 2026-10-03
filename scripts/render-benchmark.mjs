import { Window } from 'happy-dom';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createRoot, effect, onCleanup, signal } from '../framework/reactivity.js';
import { h, list, mount } from '../framework/dom.js';

const ROW_COUNT = Number(process.env.ROW_COUNT ?? 1000);
const ROUNDS = Number(process.env.ROUNDS ?? 7);
const ITERATIONS = Number(process.env.ITERATIONS ?? 20);
const window = new Window({ url: 'http://localhost/' });

Object.assign(globalThis, {
  window,
  document: window.document,
  Node: window.Node,
  HTMLElement: window.HTMLElement,
  CustomEvent: window.CustomEvent,
  customElements: window.customElements,
});

const operationCounts = { append: 0, insertBefore: 0, remove: 0, movedInsertBefore: 0, attributeWrites: 0 };
const restorers = [];

function instrument(prototype, name, counter = name, when = () => true) {
  const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
  if (typeof descriptor?.value !== 'function') return;
  const original = descriptor.value;
  Object.defineProperty(prototype, name, {
    ...descriptor,
    value(...args) {
      if (when(this, args)) operationCounts[counter] += 1;
      if (name === 'insertBefore' && args[0]?.parentNode === this && args[0] !== args[1] && args[0].nextSibling !== args[1]) {
        operationCounts.movedInsertBefore += 1;
      }
      return original.apply(this, args);
    },
  });
  restorers.push(() => Object.defineProperty(prototype, name, descriptor));
}

instrument(window.Node.prototype, 'insertBefore');
for (const name of ['append', 'remove']) instrument(window.Element.prototype, name);
for (const name of ['setAttribute', 'removeAttribute']) {
  instrument(window.Element.prototype, name, 'attributeWrites', (element) => element.isConnected);
}

function resetOperations() {
  for (const name of Object.keys(operationCounts)) operationCounts[name] = 0;
}

function snapshotOperations() {
  return { ...operationCounts };
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function formatTime(milliseconds) {
  return `${milliseconds.toFixed(3)} ms`;
}

function benchmark(name, setup, update) {
  const timings = [];
  let measuredOperations;

  for (let round = 0; round < ROUNDS + 2; round += 1) {
    const state = setup();
    resetOperations();
    const start = performance.now();
    for (let iteration = 0; iteration < ITERATIONS; iteration += 1) update(state, iteration);
    if (round >= 2) {
      timings.push((performance.now() - start) / ITERATIONS);
      measuredOperations = snapshotOperations();
    }
    state.dispose();
  }

  console.log(`${name}: median ${formatTime(median(timings))}/update; operations/update ${JSON.stringify(Object.fromEntries(Object.entries(measuredOperations).map(([key, value]) => [key, value / ITERATIONS])))}`);
}

function benchmarkMount() {
  const timings = [];
  let measuredOperations;
  for (let round = 0; round < ROUNDS + 2; round += 1) {
    const containers = Array.from({ length: ITERATIONS }, () => {
      const container = document.createElement('div');
      document.body.append(container);
      return container;
    });
    const disposers = [];
    resetOperations();
    let elapsed = 0;
    for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
      const start = performance.now();
      const dispose = mount(containers[iteration], () => h('main', {}, Array.from({ length: 100 }, (_, index) => h('p', {}, `row ${index}`))));
      elapsed += performance.now() - start;
      disposers.push(dispose);
    }
    if (round >= 2) {
      timings.push(elapsed / ITERATIONS);
      measuredOperations = snapshotOperations();
    }
    for (const dispose of disposers.reverse()) dispose();
    for (const container of containers) container.remove();
  }
  console.log(`mount 100-row tree: median ${formatTime(median(timings))}/mount; operations/mount ${JSON.stringify(Object.fromEntries(Object.entries(measuredOperations).map(([key, value]) => [key, value / ITERATIONS])))}`);
}

function createBaselineList(items, key, render) {
  const container = document.createElement('div');
  const rows = new Map();
  effect(() => {
    const values = items();
    const seen = new Set();
    values.forEach((item, index) => {
      const id = key(item);
      if (seen.has(id)) throw new Error(`Duplicate list key: ${id}`);
      seen.add(id);
      let row = rows.get(id);
      if (!row) {
        const [node, dispose] = createRoot(() => render(item, index), { detached: true });
        row = { node, dispose };
        rows.set(id, row);
      }
      container.append(row.node);
    });
    for (const [id, row] of rows) {
      if (seen.has(id)) continue;
      row.dispose();
      row.node.remove();
      rows.delete(id);
    }
  });
  onCleanup(() => {
    for (const row of rows.values()) row.dispose();
    rows.clear();
  });
  return container;
}

function mountKeyedList(implementation) {
  const [items, setItems] = signal(Array.from({ length: ROW_COUNT }, (_, id) => ({ id })));
  const renderList = implementation === 'baseline' ? createBaselineList : list;
  const dispose = mount(document.body, () => h('ul', {}, renderList(items, (item) => item.id, (item) => h('li', {}, String(item.id)))));
  return { setItems, dispose };
}

function mountTreeReconciler() {
  const [version, setVersion] = signal(0);
  const dispose = mount(document.body, () => h('main', {}, () => {
    version();
    return h('section', {}, Array.from({ length: 100 }, (_, index) => h('p', { 'data-row': index }, `row ${index}`)));
  }));
  return { setVersion, dispose };
}

try {
  const packageData = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  console.log(`Happy DOM ${packageData.devDependencies['happy-dom']}; ${ROW_COUNT} rows; 2 warm-up + ${ROUNDS} rounds × ${ITERATIONS} updates`);
  try {
    const runtime = await readFile(new URL('../dist/framework/nodula-framework.js', import.meta.url));
    console.log(`Core runtime: ${runtime.length} bytes; ${gzipSync(runtime).length} gzip bytes`);
  } catch {
    console.log('Core runtime size unavailable; run npm run build:framework first.');
  }

  for (const implementation of ['baseline', 'optimized']) {
    for (const operation of ['append', 'remove', 'reverse']) {
      benchmark(`${implementation} keyed-list ${operation}`, () => {
        const state = mountKeyedList(implementation);
        let reversed = false;
        return {
          ...state,
          update() {
            if (operation === 'append') state.setItems((items) => [...items, { id: items.length }]);
            if (operation === 'remove') state.setItems((items) => items.slice(1));
            if (operation === 'reverse') {
              reversed = !reversed;
              state.setItems((items) => [...items].reverse());
            }
          },
        };
      }, (current) => current.update());
    }
  }

  benchmarkMount();
  benchmark('reconcile unchanged 100-row tree', () => mountTreeReconciler(), (state, iteration) => state.setVersion(iteration + 1));

  benchmark('reactive text update', () => {
    const [value, setValue] = signal(0);
    const dispose = mount(document.body, () => h('p', {}, () => String(value())));
    return { setValue, dispose };
  }, (current, iteration) => current.setValue(iteration + 1));
} finally {
  for (const restore of restorers.reverse()) restore();
  window.happyDOM.abort();
}