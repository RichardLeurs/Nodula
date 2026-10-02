import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computed, createRoot, effect, onCleanup, onMount, onUnmount, signal } from '../framework/reactivity.js';
import { createStore } from '../framework/addons/store.js';
import { createForm } from '../framework/addons/form.js';

describe('Nodula reactivity', () => {
  it('runs effects immediately and only when observed values change', () => {
    const [count, setCount] = signal(0);
    const values = [];
    const stop = effect(() => values.push(count()));

    setCount(1);
    setCount(1);
    stop();
    setCount(2);

    assert.deepEqual(values, [0, 1]);
  });

  it('tracks dependencies read conditionally', () => {
    const [chooseLeft, setChooseLeft] = signal(true);
    const [left, setLeft] = signal('left');
    const [right, setRight] = signal('right');
    const values = [];
    effect(() => values.push(chooseLeft() ? left() : right()));

    setChooseLeft(false);
    setLeft('also unused');
    setRight('updated');

    assert.deepEqual(values, ['left', 'right', 'updated']);
  });

  it('updates computed values and disposes root effects and cleanups', () => {
    const [count, setCount] = signal(2);
    const doubled = computed(() => count() * 2);
    const values = [];
    let cleanups = 0;
    const [, dispose] = createRoot(() => {
      effect(() => {
        doubled();
        onCleanup(() => { cleanups += 1; });
        values.push(count());
      });
    });

    setCount(3);
    dispose();
    setCount(4);

    assert.deepEqual(values, [2, 3]);
    assert.equal(doubled(), 8);
    assert.equal(cleanups, 2);
  });

  it('runs mount hooks after the current turn and unmount hooks when their scope is disposed', async () => {
    const lifecycle = [];
    const [, dispose] = createRoot(() => {
      onMount(() => lifecycle.push('mounted'));
      onUnmount(() => lifecycle.push('unmounted'));
    });

    assert.deepEqual(lifecycle, []);
    await Promise.resolve();
    assert.deepEqual(lifecycle, ['mounted']);

    dispose();
    assert.deepEqual(lifecycle, ['mounted', 'unmounted']);
  });

  it('skips the mount hook when its scope is disposed before the mount microtask', async () => {
    const lifecycle = [];
    const [, dispose] = createRoot(() => {
      onMount(() => lifecycle.push('mounted'));
      onUnmount(() => lifecycle.push('unmounted'));
    });

    dispose();
    await Promise.resolve();

    assert.deepEqual(lifecycle, ['unmounted']);
  });

  it('tracks store properties independently and reacts to nested writes and replacements', () => {
    const state = createStore({ count: 0, label: 'first', nested: { value: 1 } });
    const counts = [];
    const nested = [];
    const stopCount = effect(() => counts.push(state.count));
    const stopNested = effect(() => nested.push(state.nested.value));
    state.label = 'second';
    state.count = 1;
    state.count = 1;
    state.nested.value = 2;
    const oldNested = state.nested;
    state.nested = { value: 3 };
    oldNested.value = 4;
    assert.deepEqual(counts, [0, 1]);
    assert.deepEqual(nested, [1, 2, 3]);
    stopCount();
    stopNested();
  });

  it('tracks store keys, presence and deletion, with root-owned cleanup', () => {
    const state = createStore({ a: 1 });
    const keys = [];
    const presence = [];
    const [, dispose] = createRoot(() => {
      effect(() => keys.push(Object.keys(state).join(',')));
      effect(() => presence.push('b' in state));
    });
    state.a = 2;
    state.b = 3;
    delete state.a;
    delete state.a;
    dispose();
    state.c = 4;
    assert.deepEqual(keys, ['a', 'a,b', 'b']);
    assert.deepEqual(presence, [false, true]);
  });

  it('notifies effects once per store write even when tracking both a key and its presence', () => {
    const state = createStore({});
    const snapshots = [];
    const stop = effect(() => snapshots.push(`${'item' in state}:${Object.keys(state).length}:${state.item ?? ''}`));
    state.item = 'ready';
    delete state.item;
    assert.deepEqual(snapshots, ['false:0:', 'true:1:ready', 'false:0:']);
    stop();
  });

  it('batches array methods and updates length, indexes and iteration', () => {
    const state = createStore({ items: ['a'] });
    const snapshots = [];
    const stop = effect(() => snapshots.push(`${state.items.length}:${state.items.join(',')}`));
    state.items.push('b');
    state.items.splice(0, 1, 'c');
    state.items.length = 0;
    assert.deepEqual(snapshots, ['1:a', '2:a,b', '2:c,b', '0:']);
    stop();
  });

  it('supports computed selectors, stable nested proxies and plain-object validation', () => {
    const state = createStore({ nested: { count: 2 } });
    assert.equal(state.nested, state.nested);
    const [double, dispose] = createRoot(() => computed(() => state.nested.count * 2));
    assert.equal(double(), 4);
    state.nested.count = 3;
    assert.equal(double(), 6);
    dispose();
    state.nested.count = 4;
    assert.equal(double(), 6);
    assert.throws(() => createStore(new Date()), /plain object or array/);
    assert.throws(() => createStore(null), /plain object or array/);
  });

  it('tracks form values, touched state, validation errors, dirty state, and reset', () => {
    const form = createForm({ email: '', accepted: false }, {
      validate: (values) => ({
        ...(values.email.includes('@') ? {} : { email: 'Enter a valid email.' }),
        ...(values.accepted ? {} : { accepted: 'Please accept the terms.' }),
      }),
    });
    assert.equal(form.valid(), true);
    form.handleBlur('email')();
    assert.equal(form.errors.email, 'Enter a valid email.');
    form.handleChange('email')({ target: { value: 'nodula@example.com' } });
    form.handleChange('accepted')({ target: { type: 'checkbox', checked: true } });
    assert.equal(form.values.email, 'nodula@example.com');
    assert.equal(form.values.accepted, true);
    assert.equal(form.errors.email, undefined);
    assert.equal(form.dirty(), true);
    assert.equal(form.valid(), true);

    form.reset();
    assert.equal(form.values.email, '');
    assert.equal(form.values.accepted, false);
    assert.deepEqual(Object.keys(form.errors), []);
    assert.deepEqual(Object.keys(form.touched), []);
    assert.equal(form.dirty(), false);
  });

  it('validates before async submission and restores submitting state on completion', async () => {
    const submissions = [];
    const form = createForm({ name: '' }, {
      validate: (values) => values.name.trim() ? {} : { name: 'Name is required.' },
      onSubmit: async (values) => { submissions.push(values.name); },
    });
    let prevented = false;
    assert.equal(await form.handleSubmit({ preventDefault() { prevented = true; } }), false);
    assert.equal(prevented, true);
    assert.equal(form.touched.name, true);
    assert.equal(form.errors.name, 'Name is required.');
    assert.deepEqual(submissions, []);

    form.setFieldValue('name', 'Nodula');
    assert.equal(await form.handleSubmit({ preventDefault() {} }), true);
    assert.deepEqual(submissions, ['Nodula']);
    assert.equal(form.submitted(), true);
    assert.equal(form.submitting(), false);
    form.reset();
    assert.equal(form.submitted(), false);
  });

  it('rejects unsupported form value containers', () => {
    assert.throws(() => createForm({ created: new Date() }), /plain objects, arrays/);
    assert.throws(() => createForm([]), /object of initial form values/);
  });
});