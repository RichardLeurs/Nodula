import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { Window } from 'happy-dom';

let window;
let document;
let dom;
let signal;
let effect;
let onCleanup;
let createStore;
let h;
let list;
let each;
let mount;
let when;
let fragment;
let slot;
let Nodula;
let defineCustomElement;

before(async () => {
  window = new Window({ url: 'http://localhost/' });
  document = window.document;
  globalThis.window = window;
  globalThis.document = document;
  globalThis.Node = window.Node;
  ({ signal, effect, onCleanup } = await import('../src framework/reactivity.js'));
  ({ createStore } = await import('../src framework/addons/store.js'));
  ({ h, list, each, mount, when, fragment, slot, defineCustomElement } = await import('../src framework/dom.js'));
  ({ Nodula } = await import('../src framework/index.js'));
});

describe('Nodula DOM helpers', () => {
  it('binds custom-element properties and dashed custom events with reactive cleanup', () => {
    const [payload, setPayload] = signal({ id: 1 });
    const [label, setLabel] = signal('first');
    const received = [];
    const dispose = mount(document.body, () => h('x-nodula-probe', {
      payload: payload,
      label: () => label(),
      status: 'ready',
      'on:selection-change': (event) => received.push(event.detail),
    }));
    const element = document.querySelector('x-nodula-probe');
    assert.equal(element.payload, payload());
    assert.equal(element.label, 'first');
    assert.equal(element.getAttribute('status'), 'ready');
    setPayload({ id: 2 });
    setLabel('second');
    assert.equal(element.payload, payload());
    assert.equal(element.label, 'second');
    element.dispatchEvent(new window.CustomEvent('selection-change', { detail: { selected: true } }));
    assert.deepEqual(received, [{ selected: true }]);
    dispose();
    element.dispatchEvent(new window.CustomEvent('selection-change', { detail: 'after-dispose' }));
    assert.deepEqual(received, [{ selected: true }]);
  });

  it('registers Nodula components with attribute/property props, custom events, and disconnect cleanup', () => {
    const tag = `x-nodula-counter-${Math.random().toString(36).slice(2)}`;
    const cleanups = [];
    defineCustomElement(tag, ({ props }) => {
      onCleanup(() => cleanups.push(props.count));
      return h('button', { onClick: () => props.onIncrement(props.count) }, () => String(props.count));
    }, { props: ['count', 'payload'], events: ['increment'], shadow: false });

    const element = document.createElement(tag);
    element.setAttribute('count', '3');
    const payload = { id: 7 };
    element.payload = payload;
    document.body.append(element);
    assert.equal(element.querySelector('button').textContent, '3');
    assert.equal(element.payload, payload);
    element.setAttribute('count', '3.5');
    assert.equal(element.querySelector('button').textContent, '3.5');
    const events = [];
    element.addEventListener('increment', (event) => events.push(event.detail));
    element.querySelector('button').click();
    assert.deepEqual(events, ['3.5']);
    element.count = '4';
    assert.equal(element.querySelector('button').textContent, '4');
    element.remove();
    assert.deepEqual(cleanups, ['4']);
  });

  it('loads each global stylesheet URL only once', () => {
    const first = Nodula.css('/assets/app.css');
    const second = Nodula.css('/assets/app.css');

    assert.equal(first, second);
    assert.equal(first.rel, 'stylesheet');
    assert.equal(first.getAttribute('href'), 'http://localhost/assets/app.css');
    assert.equal(document.head.querySelectorAll('link[rel="stylesheet"]').length, 1);
    first.remove();
  });

  it('keeps shown elements mounted and cleans up refs and event handlers', () => {
    const [visible, setVisible] = signal(true);
    const refs = [];
    const clicks = [];
    const dispose = mount(document.body, () => h('div', {},
      h('button', { show: visible, ref: (node) => refs.push(node), onClick: () => clicks.push('clicked') }, 'Press')));
    const button = document.querySelector('button');
    setVisible(false);
    assert.equal(document.querySelector('button'), button);
    assert.equal(button.style.display, 'none');
    setVisible(true);
    assert.equal(button.style.display, '');
    button.click();
    assert.deepEqual(clicks, ['clicked']);
    dispose();
    assert.deepEqual(refs, [button, null]);
    button.click();
    assert.deepEqual(clicks, ['clicked']);
    setVisible(false);
    assert.equal(button.style.display, '');
  });

  it('restores the original inline display regardless of prop order', () => {
    const [visible, setVisible] = signal(false);
    const dispose = mount(document.body, () => h('p', { show: visible, style: { display: 'inline-flex' } }, 'Preserved'));
    const paragraph = document.querySelector('p');
    assert.equal(paragraph.style.display, 'none');
    setVisible(true);
    assert.equal(paragraph.style.display, 'inline-flex');
    dispose();
  });

  it('initializes a bound select after its option children are appended', () => {
    const [selection, setSelection] = signal('b');
    const dispose = mount(document.body, () => h('select', { bind: { property: 'value', read: selection, write: setSelection } },
      h('option', { value: 'a' }, 'A'), h('option', { value: 'b' }, 'B')));
    const select = document.querySelector('select');
    assert.equal(select.value, 'b');
    select.value = 'a';
    select.dispatchEvent(new window.Event('input'));
    assert.equal(selection(), 'a');
    dispose();
  });

  it('binds text and checked values both ways without leaking listeners', () => {
    const [name, setName] = signal('First');
    const [done, setDone] = signal(false);
    const dispose = mount(document.body, () => h('div', {},
      h('input', { bind: { property: 'value', read: name, write: setName } }),
      h('input', { type: 'checkbox', bind: { property: 'checked', read: done, write: setDone } }),
      h('span', {}, () => `${name()}:${done()}`)));
    const [text, checkbox] = document.querySelectorAll('input');
    assert.equal(text.value, 'First');
    assert.equal(checkbox.checked, false);
    setName('Updated');
    setDone(true);
    assert.equal(text.value, 'Updated');
    assert.equal(checkbox.checked, true);
    text.value = 'Typed';
    text.dispatchEvent(new window.Event('input', { bubbles: true }));
    checkbox.checked = false;
    checkbox.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(document.querySelector('span').textContent, 'Typed:false');
    dispose();
    text.value = 'Detached';
    text.dispatchEvent(new window.Event('input'));
    assert.equal(name(), 'Typed');
    setDone(true);
    assert.equal(checkbox.checked, false);
  });

  it('renders supplied and fallback slots without extra elements', () => {
    const dispose = mount(document.body, () => h('main', {},
      h('section', {}, slot({ header: () => h('b', {}, 'Custom') }, 'header', () => fragment(h('i', {}, 'Fallback')))),
      h('section', {}, slot({}, 'header', () => fragment(h('i', {}, 'Fallback')))),
      h('section', {}, slot({}, 'toString', () => fragment(h('i', {}, 'Inherited fallback'))))));
    const sections = document.querySelectorAll('section');
    assert.equal(sections[0].textContent, 'Custom');
    assert.equal(sections[0].querySelectorAll('i').length, 0);
    assert.equal(sections[1].textContent, 'Fallback');
    assert.equal(sections[2].textContent, 'Inherited fallback');
    dispose();
    assert.equal(document.body.textContent, '');
  });

  it('disposes slotted content when its conditional owner is removed', () => {
    const [visible, setVisible] = signal(true);
    const [label, setLabel] = signal('First');
    const refs = [];
    const dispose = mount(document.body, () => h('section', {},
      when(visible, () => h('article', {},
        slot({ default: () => h('button', { ref: (node) => refs.push(node) }, () => label()) },
          'default', () => fragment(h('span', {}, 'Fallback')))))));
    const button = document.querySelector('button');
    assert.equal(button.textContent, 'First');
    setVisible(false);
    assert.equal(document.querySelector('button'), null);
    assert.equal(refs.at(-1), null);
    setLabel('Second');
    assert.equal(button.textContent, 'First');
    setVisible(true);
    assert.equal(document.querySelector('button').textContent, 'Second');
    dispose();
  });
  it('switches conditional branches, disposes removed listeners and effects, and keeps siblings', () => {
    const [online, setOnline] = signal(false);
    const [label, setLabel] = signal('first');
    const clicks = [];
    const dispose = mount(document.body, () => h('section', {},
      h('span', {}, 'Before'),
      when(online, () => h('button', { onClick: () => clicks.push(label()) }, () => label()), () => h('p', {}, 'Offline')),
      h('span', {}, 'After')));
    assert.equal(document.querySelector('section').textContent, 'BeforeOfflineAfter');
    const offline = document.querySelector('p');
    setOnline(true);
    assert.equal(document.querySelector('p'), null);
    assert.equal(document.querySelector('section').textContent, 'BeforefirstAfter');
    const button = document.querySelector('button');
    setLabel('second');
    assert.equal(button.textContent, 'second');
    button.click();
    setOnline(false);
    assert.equal(document.querySelector('button'), null);
    button.click();
    setLabel('third');
    assert.equal(button.textContent, 'second');
    assert.deepEqual(clicks, ['second']);
    assert.notEqual(document.querySelector('p'), offline);
    dispose();
    setOnline(true);
    assert.equal(document.body.textContent, '');
  });

  it('renders conditional fragments between siblings and responds to only the condition', () => {
    const [show, setShow] = signal(true);
    const [label, setLabel] = signal('A');
    let branchRuns = 0;
    const dispose = mount(document.body, () => h('div', {}, 'start',
      when(show, () => { branchRuns += 1; return fragment(h('b', {}, () => label()), h('i', {}, 'two')); }), 'end'));
    assert.equal(document.querySelector('div').textContent, 'startAtwoend');
    setLabel('B');
    assert.equal(branchRuns, 1);
    assert.equal(document.querySelector('div').textContent, 'startBtwoend');
    setShow(false);
    assert.equal(document.querySelector('div').textContent, 'startend');
    setShow(true);
    assert.equal(branchRuns, 2);
    assert.equal(document.querySelector('div').textContent, 'startBtwoend');
    dispose();
  });

  it('keeps conditional branches reactive after reconciling their parent', () => {
    const [version, setVersion] = signal(0);
    const [online, setOnline] = signal(false);
    const dispose = mount(document.body, () => h('main', {}, () => {
      version();
      return h('section', {}, 'Before', when(online,
        () => h('strong', {}, 'Online'), () => h('em', {}, 'Offline')), 'After');
    }));
    setVersion(1);
    assert.equal(document.querySelector('section').textContent, 'BeforeOfflineAfter');
    setOnline(true);
    assert.equal(document.querySelector('section').textContent, 'BeforeOnlineAfter');
    assert.equal(document.querySelectorAll('strong').length, 1);
    setOnline(false);
    assert.equal(document.querySelector('section').textContent, 'BeforeOfflineAfter');
    dispose();
  });

  it('updates nested conditional template branches after their fragment is attached', () => {
    const [outer, setOuter] = signal(true);
    const [inner, setInner] = signal(false);
    const dispose = mount(document.body, () => h('div', {}, 'Before', when(outer,
      () => fragment(h('span', {}, 'Left'), when(inner, () => h('b', {}, 'Yes'), () => h('i', {}, 'No')), h('span', {}, 'Right'))), 'After'));
    assert.equal(document.querySelector('div').textContent, 'BeforeLeftNoRightAfter');
    setInner(true);
    assert.equal(document.querySelector('div').textContent, 'BeforeLeftYesRightAfter');
    setOuter(false);
    assert.equal(document.querySelector('div').textContent, 'BeforeAfter');
    setInner(false);
    setOuter(true);
    assert.equal(document.querySelector('div').textContent, 'BeforeLeftNoRightAfter');
    dispose();
  });
  it('updates dynamic text and attributes and cleans up on unmount', () => {
    const [name, setName] = signal('Nodula');
    const dispose = mount(document.body, () => h('p', { title: () => name() }, () => `Hello, ${name()}!`));

    assert.equal(document.querySelector('p').textContent, 'Hello, Nodula!');
    setName('World');
    assert.equal(document.querySelector('p').textContent, 'Hello, World!');
    assert.equal(document.querySelector('p').title, 'World');
    dispose();
    setName('Again');
    assert.equal(document.body.childNodes.length, 0);
  });

  it('updates DOM bindings from store writes and stops updating after unmount', () => {
    const state = createStore({ user: { name: 'Nodula' }, visits: 0 });
    const dispose = mount(document.body, () => h('p', { title: () => state.user.name },
      () => `${state.user.name}: ${state.visits}`));
    const paragraph = document.querySelector('p');
    state.user.name = 'World';
    state.visits += 1;
    assert.equal(paragraph.title, 'World');
    assert.equal(paragraph.textContent, 'World: 1');
    dispose();
    state.visits += 1;
    assert.equal(document.body.textContent, '');
    assert.equal(paragraph.textContent, 'World: 1');
  });

  it('preserves keyed row nodes and rejects duplicate keys', () => {
    const [items, setItems] = signal([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]);
    const dispose = mount(document.body, () => h('ul', {}, list(items, (item) => item.id, (item) => h('li', {}, item.label))));
    const firstRow = document.querySelector('li');

    setItems([{ id: 'b', label: 'B' }, { id: 'a', label: 'A' }]);
    assert.equal(document.querySelectorAll('li')[1], firstRow);
    assert.throws(() => setItems([{ id: 'same' }, { id: 'same' }]), /Duplicate list key/);
    dispose();
  });

  it('preserves keyed template rows and updates replaced row data', () => {
    const [items, setItems] = signal([{ id: 'nodula', label: 'First' }]);
    const dispose = mount(document.body, () => h('ul', {}, each(items, (item) => item.id, (item) =>
      h('li', {}, () => item().label))));
    const row = document.querySelector('li');

    setItems([{ id: 'nodula', label: 'Updated' }]);
    assert.equal(document.querySelector('li'), row);
    assert.equal(row.textContent, 'Updated');
    dispose();
  });

  it('reconciles nested component trees while updating props, text, listeners, and refs', () => {
    const [name, setName] = signal('first');
    const [count, setCount] = signal(0);
    const clicks = [];
    let ref;
    const dispose = mount(document.body, () => h('main', {}, () => h('section', { title: () => name() },
      h('button', { ref: (node) => { ref = node; }, onClick: () => clicks.push(name()) },
        h('span', {}, () => `${name()} ${count()}`)))));
    const section = document.querySelector('section');
    const button = document.querySelector('button');
    const span = document.querySelector('span');

    setName('second');
    assert.equal(document.querySelector('section'), section);
    assert.equal(document.querySelector('button'), button);
    assert.equal(document.querySelector('span'), span);
    assert.equal(ref, button);
    assert.equal(section.title, 'second');
    assert.equal(span.textContent, 'second 0');
    button.click();
    assert.deepEqual(clicks, ['second']);

    setCount(1);
    assert.equal(document.querySelector('button'), button);
    assert.equal(span.textContent, 'second 1');
    button.click();
    assert.deepEqual(clicks, ['second', 'second']);
    dispose();
    setName('third');
    assert.equal(document.body.childNodes.length, 0);
    button.click();
    assert.deepEqual(clicks, ['second', 'second']);
  });

  it('replaces incompatible dynamic roots and drops removed descendants', () => {
    const [tag, setTag] = signal('div');
    const [show, setShow] = signal(true);
    const dispose = mount(document.body, () => h('main', {}, () =>
      h(tag(), {}, show() ? h('strong', {}, 'visible') : h('em', {}, 'changed'))));
    const original = document.querySelector('div');
    setShow(false);
    assert.equal(document.querySelector('div'), original);
    assert.equal(document.querySelector('strong'), null);
    assert.equal(document.querySelector('em').textContent, 'changed');
    setTag('aside');
    assert.equal(document.querySelector('div'), null);
    assert.equal(document.querySelector('aside').textContent, 'changed');
    dispose();
  });

  it('keeps dynamic text nodes and updates replacement component handlers', () => {
    const [label, setLabel] = signal('one');
    const [version, setVersion] = signal(0);
    const calls = [];
    const dispose = mount(document.body, () => h('div', {},
      () => label(),
      () => h('button', { onClick: () => calls.push(version()) }, label())));
    const text = document.querySelector('div').childNodes[1];
    const button = document.querySelector('button');
    setLabel('two');
    assert.equal(document.querySelector('div').childNodes[1], text);
    assert.equal(document.querySelector('button'), button);
    button.click();
    assert.deepEqual(calls, [0]);
    setVersion(1);
    button.click();
    assert.deepEqual(calls, [0, 1]);
    dispose();
    button.click();
    assert.deepEqual(calls, [0, 1]);
  });

  it('updates nested dynamic children and keyed loops after reconciling their parent', () => {
    const [version, setVersion] = signal(0);
    const [name, setName] = signal('initial');
    const [items, setItems] = signal([{ id: 1, label: 'A' }]);
    const dispose = mount(document.body, () => h('main', {}, () => {
      version();
      return h('section', {}, h('p', {}, () => name()), h('ul', {}, each(items,
        (item) => item.id, (item) => h('li', {}, () => item().label))));
    }));
    const paragraph = document.querySelector('p');
    const row = document.querySelector('li');
    setVersion(1);
    assert.equal(document.querySelector('li'), row);
    setName('updated');
    setItems([{ id: 1, label: 'B' }, { id: 2, label: 'C' }]);
    assert.equal(document.querySelector('p'), paragraph);
    assert.equal(paragraph.textContent, 'updated');
    assert.equal(document.querySelector('li'), row);
    assert.deepEqual([...document.querySelectorAll('li')].map((node) => node.textContent), ['B', 'C']);
    setItems([{ id: 2, label: 'C' }]);
    assert.equal(document.querySelectorAll('li').length, 1);
    dispose();
  });

  it('does not reset an uncontrolled input value on an unrelated render', () => {
    const [tick, setTick] = signal(0);
    const dispose = mount(document.body, () => h('main', {}, () => {
      tick();
      return h('input', { type: 'text' });
    }));
    const input = document.querySelector('input');
    input.value = 'draft';
    setTick(1);
    assert.equal(document.querySelector('input'), input);
    assert.equal(input.value, 'draft');
    dispose();
  });

  it('preserves keyed row identities through ancestor renders and reorders', () => {
    const [version, setVersion] = signal(0);
    const [items, setItems] = signal([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]);
    const dispose = mount(document.body, () => h('main', {}, () => {
      version();
      return h('ul', {}, each(items, (item) => item.id,
        (item) => h('li', {}, () => item().label)));
    }));
    const [first, second] = document.querySelectorAll('li');
    setItems([{ id: 'b', label: 'B2' }, { id: 'a', label: 'A2' }]);
    assert.deepEqual([...document.querySelectorAll('li')], [second, first]);
    setVersion(1);
    assert.deepEqual([...document.querySelectorAll('li')], [second, first]);
    assert.deepEqual([...document.querySelectorAll('li')].map((node) => node.textContent), ['B2', 'A2']);
    dispose();
  });

  it('keeps reactive properties bound to adopted elements after ancestor changes', () => {
    const [version, setVersion] = signal(0);
    const [title, setTitle] = signal('before');
    const dispose = mount(document.body, () => h('main', {}, () => {
      version();
      return h('p', { title: () => title() }, 'content');
    }));
    const paragraph = document.querySelector('p');
    setVersion(1);
    setTitle('after');
    assert.equal(document.querySelector('p'), paragraph);
    assert.equal(paragraph.title, 'after');
    dispose();
    setTitle('disposed');
    assert.equal(paragraph.title, 'after');
  });
});