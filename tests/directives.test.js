import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Window } from 'happy-dom';
import { createServer } from 'vite';

it('runs show, ref, on and both binding spellings in a compiled component', async () => {
  const window = new Window({ url: 'http://localhost/' });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.Node = window.Node;
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  let dispose;
  try {
    const { default: DirectiveForm } = await server.ssrLoadModule('/tests/fixtures/DirectiveForm.comp');
    const { mount } = await server.ssrLoadModule('nodula-framework');
    dispose = mount(document.body, DirectiveForm);
    const [text, checkbox] = document.querySelectorAll('input');
    const paragraph = document.querySelector('p');
    const [toggle, readRef] = document.querySelectorAll('button');
    assert.equal(text.value, 'First');
    assert.equal(paragraph.textContent.trim(), 'First: false');
    text.value = 'Typed';
    text.dispatchEvent(new window.Event('input', { bubbles: true }));
    checkbox.checked = true;
    checkbox.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(paragraph.textContent.trim(), 'Typed: true');
    toggle.click();
    assert.equal(document.querySelector('p'), paragraph);
    assert.equal(paragraph.style.display, 'none');
    toggle.click();
    assert.equal(paragraph.style.display, '');
    text.value = 'From ref';
    readRef.click();
    assert.equal(paragraph.textContent.trim(), 'From ref: true');
  } finally {
    dispose?.();
    await server.close();
    window.close();
  }
});

it('renders supplied named and default slots or their fallback in a compiled component', async () => {
  const window = new Window({ url: 'http://localhost/' });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.Node = window.Node;
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  let dispose;
  try {
    const { default: SlotPanel } = await server.ssrLoadModule('/tests/fixtures/SlotPanel.comp');
    const { mount, h } = await server.ssrLoadModule('nodula-framework');
    dispose = mount(document.body, () => h('div', {},
      SlotPanel({ slots: { heading: () => h('strong', {}, 'Custom heading'), default: () => h('p', {}, 'Custom body') } }),
      SlotPanel()));
    const sections = document.querySelectorAll('section');
    assert.equal(sections[0].querySelector('header').textContent.trim(), 'Custom heading');
    assert.equal(sections[0].querySelector('main').textContent.trim(), 'Custom body');
    assert.equal(sections[1].querySelector('header').textContent.trim(), 'Fallback heading');
    assert.equal(sections[1].querySelector('main').textContent.trim(), 'Fallback body');
  } finally {
    dispose?.();
    await server.close();
    window.close();
  }
});

it('renders imported .comp component tags with reactive props, events, children, and named slots', async () => {
  const window = new Window({ url: 'http://localhost/' });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.Node = window.Node;
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  let dispose;
  try {
    const { default: ComponentConsumer } = await server.ssrLoadModule('/tests/fixtures/ComponentConsumer.comp');
    const { mount } = await server.ssrLoadModule('nodula-framework');
    dispose = mount(document.body, ComponentConsumer);

    const panels = document.querySelectorAll('.component-panel');
    assert.equal(panels.length, 2);
    assert.equal(panels[0].querySelector('h2').textContent, 'First title · Child state');
    assert.equal(panels[0].querySelector('header').textContent.trim(), 'First title from slot');
    assert.equal(panels[0].querySelector('main').textContent.trim(), 'Default body content');
    assert.equal(panels[1].querySelector('header').textContent.trim(), 'Fallback heading');
    assert.equal(panels[1].querySelector('main').textContent.trim(), 'Fallback body');

    panels[0].querySelector('button').click();
    assert.equal(document.querySelector('output').textContent, 'Child state');
    document.querySelectorAll('button')[2].click();
    assert.equal(panels[0].querySelector('h2').textContent, 'Updated title · Child state');
    assert.equal(panels[0].querySelector('header').textContent.trim(), 'Updated title from slot');
  } finally {
    dispose?.();
    await server.close();
    window.close();
  }
});

it('disposes imported component state and event listeners when a conditional branch is removed', async () => {
  const window = new Window({ url: 'http://localhost/' });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.Node = window.Node;
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  let dispose;
  try {
    const { default: ComponentPanel } = await server.ssrLoadModule('/tests/fixtures/ComponentPanel.comp');
    const { mount, signal, h, when, component } = await server.ssrLoadModule('nodula-framework');
    const [visible, setVisible] = signal(true);
    let saved = 0;
    dispose = mount(document.body, () => h('main', {}, when(visible, () => component(
      ComponentPanel,
      () => ({ title: 'Temporary', onSave: () => { saved += 1; } }),
    ))));

    const childButton = document.querySelector('.component-panel button');
    assert.ok(childButton);
    setVisible(false);
    assert.equal(document.querySelector('.component-panel'), null);
    childButton.click();
    assert.equal(saved, 0);
    setVisible(true);
    assert.ok(document.querySelector('.component-panel'));
  } finally {
    dispose?.();
    await server.close();
    window.close();
  }
});

it('scopes scoped component styles to its rendered elements', async () => {
  const window = new Window({ url: 'http://localhost/' });
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.Node = window.Node;
  const server = await createServer({ server: { middlewareMode: true, appType: 'custom' } });
  let dispose;
  try {
    const { default: ScopedPanel } = await server.ssrLoadModule('/tests/fixtures/ScopedPanel.comp');
    const { mount, h } = await server.ssrLoadModule('nodula-framework');
    dispose = mount(document.body, () => h('div', {}, ScopedPanel(), ScopedPanel(), h('p', { className: 'scoped-copy' }, 'Outside component')));

    const panels = document.querySelectorAll('.scoped-panel');
    const copies = document.querySelectorAll('.scoped-copy');
    assert.equal(panels.length, 2);
    assert.equal(copies.length, 3);
    const scopeAttributes = [...panels[0].attributes].map((attribute) => attribute.name).filter((name) => name.startsWith('data-nodula-scope-'));
    assert.equal(scopeAttributes.length, 1);
    const scopeAttribute = scopeAttributes[0];
    assert.equal(panels[1].hasAttribute(scopeAttribute), true);
    assert.equal(copies[0].hasAttribute(scopeAttribute), true);
    assert.equal(copies[1].hasAttribute(scopeAttribute), true);
    assert.equal(copies[2].hasAttribute(scopeAttribute), false);

    const style = document.querySelector('style[id^="nodula-style-"]');
    assert.ok(style.textContent.includes(`.scoped-copy[${scopeAttribute}]`));
    assert.ok(style.textContent.includes('@media (min-width: 1px)'));
    assert.ok(style.textContent.includes('@keyframes scoped-pulse'));
    const scopedCopySelector = `.scoped-copy[${scopeAttribute}]`;
    assert.equal(copies[0].matches(scopedCopySelector), true);
    assert.equal(copies[2].matches(scopedCopySelector), false);
  } finally {
    dispose?.();
    await server.close();
    window.close();
  }
});