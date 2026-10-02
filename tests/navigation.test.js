import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { Window } from 'happy-dom';

const window = new Window({ url: 'http://localhost/#/' });
globalThis.window = window;
globalThis.document = window.document;

const { createRoot, signal } = await import('nodula-framework');
const { createRouter } = await import('../framework/addons/router.js');
const { createNavigation, mountNavigation } = await import('../framework/addons/navigation.js');

after(() => window.close());

describe('Nodula navigation add-on', () => {
  it('keeps mountNavigation as a compatibility alias', () => {
    assert.equal(mountNavigation, createNavigation);
  });

  it('mounts an accessible nav and updates the active link with router state', async () => {
    const target = document.createElement('header');
    document.body.append(target);
    const [router, disposeRoot] = createRoot(() => createRouter({ '/': () => document.createTextNode('Home'), '/guide': () => document.createTextNode('Guide') }));
    const disposeNav = createNavigation(target, router, [
      { label: 'Home', href: '/' },
      { label: 'Guide', href: '/guide' },
    ], { label: 'Main navigation', className: 'site-nav', linkClassName: 'nav-link', activeClassName: 'active' });

    const nav = target.querySelector('nav');
    const [home, guide] = nav.querySelectorAll('a');
    assert.equal(nav.getAttribute('aria-label'), 'Main navigation');
    assert.equal(home.getAttribute('href'), '#/');
    assert.equal(home.getAttribute('aria-current'), 'page');
    assert.ok(home.classList.contains('active'));
    assert.equal(guide.hasAttribute('aria-current'), false);

    router.navigate('/guide');
    await window.happyDOM.whenAsyncComplete();
    assert.equal(guide.getAttribute('aria-current'), 'page');
    assert.ok(guide.classList.contains('active'));
    assert.equal(home.hasAttribute('aria-current'), false);
    disposeNav();
    assert.equal(target.querySelector('nav'), null);
    disposeRoot();
  });

  it('uses history paths and removes reactive effects on disposal', () => {
    const target = document.createElement('div');
    const [current, setCurrent] = signal('/guide');
    const router = { current, navigate() {}, mode: 'history' };
    const dispose = createNavigation(target, router, [{ label: 'Guide', href: '/guide' }]);
    const link = target.querySelector('a');
    assert.equal(link.getAttribute('href'), '/guide');
    assert.equal(link.getAttribute('aria-current'), 'page');
    setCurrent('/');
    assert.equal(link.hasAttribute('aria-current'), false);
    dispose();
  });

  it('renders explicitly external HTTP(S) links without router state', () => {
    const target = document.createElement('div');
    const router = { current: () => '/', navigate() {}, mode: 'history' };
    const dispose = createNavigation(target, router, [
      { label: 'External guide', href: 'https://sprigjs-docs.richardleurs.nl/', external: true },
    ], { activeClassName: 'active' });
    const link = target.querySelector('a');

    assert.equal(link.href, 'https://sprigjs-docs.richardleurs.nl/');
    assert.equal(link.target, '_blank');
    assert.equal(link.rel, 'noopener noreferrer');
    assert.equal(link.hasAttribute('aria-current'), false);
    assert.equal(link.classList.contains('active'), false);
    dispose();

    const sameTabTarget = document.createElement('div');
    const disposeSameTab = createNavigation(sameTabTarget, router, [
      { label: 'Same tab', href: 'https://example.com/docs', external: true, target: '_self' },
    ]);
    const sameTabLink = sameTabTarget.querySelector('a');
    assert.equal(sameTabLink.target, '_self');
    assert.equal(sameTabLink.hasAttribute('rel'), false);
    disposeSameTab();
  });

  it('populates and restores an existing nav element', () => {
    const nav = document.createElement('nav');
    nav.className = 'site-nav';
    nav.setAttribute('aria-label', 'Old label');
    const router = { current: () => '/', navigate() {}, mode: 'history' };
    const dispose = createNavigation(nav, router, [{ label: 'Home', href: '/' }], { label: 'Main navigation' });
    assert.equal(nav.querySelectorAll('a').length, 1);
    assert.equal(nav.getAttribute('aria-label'), 'Main navigation');
    dispose();
    assert.equal(nav.querySelectorAll('a').length, 0);
    assert.equal(nav.getAttribute('aria-label'), 'Old label');
    assert.equal(nav.className, 'site-nav');
  });

  it('rejects invalid router data and navigation items', () => {
    const target = document.createElement('div');
    assert.throws(() => createNavigation(target, {}, []), /Nodula router/);
    assert.throws(() => createNavigation(target, { current: () => '/', navigate() {}, mode: 'hash' }, [{ label: 'Bad', href: 'guide' }]), /begin with/);
    assert.throws(() => createNavigation(target, { current: () => '/', navigate() {}, mode: 'history' }, [
      { label: 'Unsafe', href: 'javascript:alert(1)', external: true },
    ]), /HTTP or HTTPS/);
    assert.throws(() => createNavigation(target, { current: () => '/', navigate() {}, mode: 'history' }, [
      { label: 'Relative', href: 'https://example.com', external: 'yes' },
    ]), /Internal navigation hrefs/);
    assert.throws(() => createNavigation(target, { current: () => '/', navigate() {}, mode: 'history' }, [
      { label: 'Bad target', href: 'https://example.com', external: true, target: '_parent' },
    ]), /target must be _blank or _self/);
  });
});