import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { Window } from 'happy-dom';

const window = new Window({ url: 'http://localhost/' });
globalThis.window = window;
globalThis.document = window.document;
globalThis.Node = window.Node;
const { animate, createTransition, enableLifecycleTransitions } = await import('../framework/addons/animation.js');
const { createRoot, each, h, mount, outlet, signal, when } = await import('nodula-framework');
const { createRouter } = await import('../framework/addons/router.js');

after(() => window.close());

function mockAnimation() {
  let resolveFinished;
  let rejectFinished;
  const animation = {
    cancelled: false,
    finished: new Promise((resolve, reject) => {
      resolveFinished = resolve;
      rejectFinished = reject;
    }),
    cancel() {
      this.cancelled = true;
      rejectFinished(new window.DOMException('Animation cancelled', 'AbortError'));
    },
    finish() { resolveFinished(this); },
  };
  return animation;
}

function installAnimationMock() {
  const animations = [];
  window.Element.prototype.animate = function (keyframes, options) {
    const animation = mockAnimation();
    animations.push({ element: this, keyframes, options, animation });
    return animation;
  };
  return animations;
}

describe('Nodula animation add-on', () => {
  it('plays Web Animations and cancels an earlier Nodula animation on the same element', () => {
    const element = document.createElement('div');
    const animations = [];
    element.animate = (keyframes, options) => {
      const animation = mockAnimation();
      animations.push({ animation, keyframes, options });
      return animation;
    };

    const first = animate(element, [{ opacity: 0 }, { opacity: 1 }], { duration: 120 });
    const second = animate(element, [{ transform: 'scale(.9)' }, { transform: 'scale(1)' }]);

    assert.equal(first, animations[0].animation);
    assert.equal(first.cancelled, true);
    assert.equal(second, animations[1].animation);
    assert.equal(animations[0].options.duration, 120);
  });

  it('cancels its active animation when the owning Nodula root is disposed', () => {
    const element = document.createElement('div');
    let animation;
    element.animate = () => (animation = mockAnimation());
    const [, dispose] = createRoot(() => animate(element, [{ opacity: 0 }]));

    dispose();
    assert.equal(animation.cancelled, true);
  });

  it('does not animate when reduced motion is requested or the API is unavailable', () => {
    const element = document.createElement('div');
    let calls = 0;
    element.animate = () => { calls += 1; return mockAnimation(); };
    const matchMedia = window.matchMedia;
    window.matchMedia = () => ({ matches: true });

    assert.equal(animate(element, [{ opacity: 0 }]), null);
    assert.equal(animate(element, [{ opacity: 0 }], { respectReducedMotion: false }) !== null, true);
    assert.equal(animate(document.createElement('p'), [{ opacity: 0 }]), null);
    assert.equal(calls, 1);
    window.matchMedia = matchMedia;
  });

  it('runs enter/leave phases and removes an element after leave finishes', async () => {
    const element = document.createElement('div');
    const animations = [];
    element.animate = (keyframes, options) => {
      const animation = mockAnimation();
      animations.push({ animation, keyframes, options });
      return animation;
    };
    document.body.append(element);
    const transition = createTransition(element, {
      enter: [{ opacity: 0 }, { opacity: 1 }],
      leave: { keyframes: [{ opacity: 1 }, { opacity: 0 }], options: { duration: 80 } },
      options: { duration: 140 },
      removeOnLeave: true,
    });

    assert.equal(transition.enter(), animations[0].animation);
    const leaving = transition.leave();
    assert.equal(animations[0].animation.cancelled, true);
    assert.equal(animations[1].options.duration, 80);
    animations[1].animation.finish();
    assert.equal(await leaving, true);
    assert.equal(element.isConnected, false);
  });

  it('animates @if enter and leave and waits for leave before removing the branch', async () => {
    const animations = installAnimationMock();
    let updateVisible;
    const dispose = mount(document.body, () => {
      enableLifecycleTransitions({ options: { duration: 90 } });
      const [readVisible, writeVisible] = signal(true);
      updateVisible = writeVisible;
      return h('main', {}, when(readVisible, () => h('p', { className: 'conditional-enter' }, 'Visible')));
    });

    const branch = document.querySelector('.conditional-enter');
    assert.ok(branch);
    assert.equal(animations[0].element, branch);
    assert.equal(animations[0].options.duration, 90);
    updateVisible(false);
    assert.equal(branch.isConnected, true);
    assert.equal(animations[1].element, branch);
    animations[1].animation.finish();
    await animations[1].animation.finished;
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(branch.isConnected, false);
    dispose();
  });

  it('animates keyed @for rows on insertion and removal', async () => {
    const animations = installAnimationMock();
    let setItems;
    const dispose = mount(document.body, () => {
      enableLifecycleTransitions();
      const [items, writeItems] = signal([{ id: 1, name: 'First' }]);
      setItems = writeItems;
      return h('ul', {}, each(items, (item) => item.id, (item) => h('li', { 'data-id': item().id }, item().name)));
    });

    const first = document.querySelector('[data-id="1"]');
    assert.ok(first);
    assert.equal(animations[0].element, first);
    setItems([{ id: 1, name: 'First' }, { id: 2, name: 'Second' }]);
    const second = document.querySelector('[data-id="2"]');
    assert.ok(second);
    assert.equal(animations[1].element, second);
    setItems([{ id: 2, name: 'Second' }]);
    assert.equal(first.isConnected, true);
    assert.equal(animations[2].element, first);
    animations[2].animation.finish();
    await animations[2].animation.finished;
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(first.isConnected, false);
    dispose();
  });

  it('animates route outlet page enter and leave', async () => {
    const animations = installAnimationMock();
    let router;
    const dispose = mount(document.body, () => {
      enableLifecycleTransitions({ options: { duration: 110 } });
      router = createRouter({
        '/': () => h('article', { 'data-page': 'Home' }, 'Home'),
        '/guide': () => h('article', { 'data-page': 'Guide' }, 'Guide'),
      }, undefined, { mode: 'history' });
      return h('main', {}, outlet(router.view));
    });

    const home = document.querySelector('[data-page="Home"]');
    assert.ok(home);
    assert.equal(animations[0].element, home);
    router.navigate('/guide');
    const guide = document.querySelector('[data-page="Guide"]');
    assert.ok(guide);
    assert.equal(animations[1].element, home);
    assert.equal(animations[2].element, guide);
    animations[1].animation.finish();
    await animations[1].animation.finished;
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(home.isConnected, false);
    assert.equal(guide.isConnected, true);
    dispose();
  });
});