import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Window } from 'happy-dom';
import { createServer } from 'vite';
import { createRoot, h, mount } from '../dist/framework/nodula-framework.js';
import { createFileRouter, createRouter } from '../dist/framework/nodula-router.js';

describe('Nodula file-based routes', () => {
  it('waits for the initial route guard before requesting a lazy protected page', async () => {
    const window = new Window({ url: 'http://localhost/#/private' });
    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.Node = window.Node;
    let allowNavigation;
    const loads = [];
    let router;
    const dispose = mount(document.body, () => {
      router = createFileRouter({
        './routes/private.page': () => {
          loads.push('private');
          return Promise.resolve({ default: () => h('p', {}, 'Private page') });
        },
      }, undefined, {
        beforeEach: () => new Promise((resolve) => { allowNavigation = resolve; }),
      });
      return h('main', {}, router.view);
    });

    assert.equal(router.canRender(), false);
    assert.equal(document.body.textContent, 'Checking route…');
    assert.deepEqual(loads, []);
    allowNavigation(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(router.canRender(), true);
    assert.deepEqual(loads, ['private']);
    assert.equal(document.body.textContent, 'Private page');

    dispose();
    window.close();
  });

  it('redirects an initially denied file route before loading its module', async () => {
    const window = new Window({ url: 'http://localhost/#/private' });
    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.Node = window.Node;
    const loads = [];
    let router;
    const dispose = mount(document.body, () => {
      router = createFileRouter({
        './routes/login.page': { default: () => h('p', {}, 'Login') },
        './routes/private.page': () => {
          loads.push('private');
          return Promise.resolve({ default: () => h('p', {}, 'Private page') });
        },
      }, undefined, {
        beforeEach: ({ to }) => to === '/private' ? '/login' : true,
      });
      return h('main', {}, router.view);
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(router.current(), '/login');
    assert.equal(window.location.hash, '#/login');
    assert.equal(document.body.textContent, 'Login');
    assert.deepEqual(loads, []);

    dispose();
    window.close();
  });

  it('cancels guarded navigation and preserves the current route', async () => {
    const window = new Window({ url: 'http://localhost/#/' });
    globalThis.window = window;
    globalThis.document = window.document;
    let denyNavigation;
    const [router, dispose] = createRoot(() => createRouter({
      '/': () => document.createTextNode('Home'),
      '/private': () => document.createTextNode('Private'),
    }, undefined, {
      beforeEach: ({ to }) => to === '/private'
        ? new Promise((resolve) => { denyNavigation = resolve; })
        : true,
    }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(router.canRender(), true);

    router.navigate('/private');
    assert.equal(router.navigationPending(), true);
    assert.equal(router.current(), '/');
    denyNavigation(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(router.navigationPending(), false);
    assert.equal(router.current(), '/');
    assert.equal(router.view().textContent, 'Home');
    assert.equal(window.location.hash, '#/');

    dispose();
    window.close();
  });

  it('discovers index and nested page files without explicit registration', () => {
    const window = new Window({ url: 'http://localhost/#/' });
    globalThis.window = window;
    globalThis.document = window.document;
    const [router, dispose] = createRoot(() => createFileRouter({
      './routes/index.page': { default: () => document.createTextNode('Home') },
      './routes/guide.page': { default: () => document.createTextNode('Guide') },
      './routes/about/index.page': { default: () => document.createTextNode('About') },
    }));

    assert.equal(router.view().textContent, 'Home');
    assert.equal(router.mode, 'hash');
    window.location.hash = '#/guide';
    window.dispatchEvent(new window.Event('hashchange'));
    assert.equal(router.current(), '/guide');
    assert.equal(router.view().textContent, 'Guide');
    window.location.hash = '#/about';
    window.dispatchEvent(new window.Event('hashchange'));
    assert.equal(router.view().textContent, 'About');
    window.location.hash = '#/missing';
    window.dispatchEvent(new window.Event('hashchange'));
    assert.equal(router.view().textContent, 'Page not found');
    dispose();
    window.close();
  });

  it('rejects ambiguous and invalid route modules', () => {
    const page = { default: () => document.createTextNode('Page') };
    const window = new Window({ url: 'http://localhost/' });
    globalThis.window = window;
    globalThis.document = window.document;
    assert.throws(() => createFileRouter({
      './routes/guide.page': page,
      './routes/guide/index.page': page,
    }), /Duplicate route path: \/guide/);
    assert.throws(() => createFileRouter({ './routes/[...id].page': page }), /Unsupported route file/);
    assert.throws(() => createFileRouter({
      './routes/[id].page': page,
      './routes/[slug].page': page,
    }), /Duplicate route path/);
    assert.throws(() => createFileRouter({ './routes/guide.page': {} }), /must export a component/);
    assert.throws(() => createFileRouter({ './routes/guide.comp': page }), /Unsupported route file/);
    window.close();
  });

  it('loads only the visited route and reuses its module on later visits', async () => {
    const window = new Window({ url: 'http://localhost/#/' });
    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.Node = window.Node;
    let resolveHome;
    const calls = [];
    let router;
    const dispose = mount(document.body, () => {
      router = createFileRouter({
        './routes/index.page': () => {
          calls.push('home');
          return new Promise((resolve) => { resolveHome = resolve; });
        },
        './routes/guide.page': () => {
          calls.push('guide');
          return Promise.resolve({ default: () => h('p', {}, 'Guide') });
        },
      });
      return h('main', {}, router.view);
    });

    assert.equal(document.body.textContent, 'Loading page…');
    assert.deepEqual(calls, ['home']);
    resolveHome({ default: () => h('p', {}, 'Home') });
    await Promise.resolve();
    assert.equal(document.body.textContent, 'Home');

    window.location.hash = '#/guide';
    window.dispatchEvent(new window.Event('hashchange'));
    assert.deepEqual(calls, ['home', 'guide']);
    assert.equal(document.body.textContent, 'Loading page…');
    await Promise.resolve();
    assert.equal(document.body.textContent, 'Guide');

    window.location.hash = '#/';
    window.dispatchEvent(new window.Event('hashchange'));
    assert.equal(document.body.textContent, 'Home');
    assert.deepEqual(calls, ['home', 'guide']);
    dispose();
    window.close();
  });

  it('ignores late results for previous routes and after unmount', async () => {
    const window = new Window({ url: 'http://localhost/#/' });
    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.Node = window.Node;
    let resolveHome;
    let resolveGuide;
    let router;
    const dispose = mount(document.body, () => {
      router = createFileRouter({
        './routes/index.page': () => new Promise((resolve) => { resolveHome = resolve; }),
        './routes/guide.page': () => new Promise((resolve) => { resolveGuide = resolve; }),
      });
      return h('main', {}, router.view);
    });
    window.location.hash = '#/guide';
    window.dispatchEvent(new window.Event('hashchange'));
    resolveHome({ default: () => h('p', {}, 'Stale home') });
    await Promise.resolve();
    assert.equal(document.body.textContent, 'Loading page…');
    resolveGuide({ default: () => h('p', {}, 'Guide') });
    await Promise.resolve();
    assert.equal(document.body.textContent, 'Guide');
    dispose();
    assert.equal(document.body.textContent, '');
    window.close();

    const anotherWindow = new Window({ url: 'http://localhost/#/' });
    globalThis.window = anotherWindow;
    globalThis.document = anotherWindow.document;
    globalThis.Node = anotherWindow.Node;
    let resolveLate;
    let rendered = 0;
    const unmount = mount(document.body, () => {
      const pendingRouter = createFileRouter({
        './routes/index.page': () => new Promise((resolve) => { resolveLate = resolve; }),
      });
      return h('main', {}, pendingRouter.view);
    });
    unmount();
    resolveLate({ default: () => { rendered += 1; return h('p', {}, 'Late'); } });
    await Promise.resolve();
    assert.equal(rendered, 0);
    assert.equal(document.body.textContent, '');
    anotherWindow.close();
  });

  it('renders a failure state for rejected or invalid route imports', async () => {
    const window = new Window({ url: 'http://localhost/#/' });
    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.Node = window.Node;
    let router;
    const dispose = mount(document.body, () => {
      router = createFileRouter({
        './routes/index.page': () => Promise.reject(new Error('offline')),
        './routes/guide.page': () => Promise.resolve({ default: 'not a component' }),
      });
      return h('main', {}, router.view);
    });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(document.body.textContent, 'Could not load this page.');
    window.location.hash = '#/guide';
    window.dispatchEvent(new window.Event('hashchange'));
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(document.body.textContent, 'Could not load this page.');
    dispose();
    window.close();
  });

  it('matches decoded parameters, prefers static routes, and composes nested layouts', () => {
    const window = new Window({ url: 'http://localhost/#/projects/nodula/tasks/hello%20world' });
    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.Node = window.Node;
    let router;
    const dispose = mount(document.body, () => {
      router = createFileRouter({
        './routes/layout.page': { default: ({ children }) => h('main', {}, 'Root: ', children) },
        './routes/projects/layout.page': { default: ({ params, children }) => h('section', {}, `Project ${params.project}: `, children) },
        './routes/projects/[project]/layout.page': { default: ({ children }) => h('article', {}, 'Tasks: ', children) },
        './routes/projects/[project]/tasks/[task].page': { default: ({ params }) => h('p', {}, params.task) },
        './routes/projects/nodula/tasks/new.page': { default: () => h('p', {}, 'Static new') },
      });
      return h('div', {}, router.view);
    });
    assert.equal(document.body.textContent, 'Root: Project nodula: Tasks: hello world');
    assert.equal(document.querySelector('main section article p').textContent, 'hello world');
    window.location.hash = '#/projects/nodula/tasks/another';
    window.dispatchEvent(new window.Event('hashchange'));
    assert.equal(document.body.textContent, 'Root: Project nodula: Tasks: another');
    window.location.hash = '#/projects/nodula/tasks/new';
    window.dispatchEvent(new window.Event('hashchange'));
    assert.equal(document.body.textContent, 'Root: Project undefined: Static new');
    dispose();
    window.close();
  });

  it('lazy-loads only the matched page and layout chain, then caches them', async () => {
    const window = new Window({ url: 'http://localhost/#/posts/42' });
    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.Node = window.Node;
    const calls = [];
    let router;
    const dispose = mount(document.body, () => {
      router = createFileRouter({
        './routes/layout.page': () => { calls.push('root'); return Promise.resolve({ default: ({ children }) => h('main', {}, children) }); },
        './routes/posts/layout.page': () => { calls.push('posts layout'); return Promise.resolve({ default: ({ children }) => h('section', {}, children) }); },
        './routes/posts/[id].page': () => { calls.push('post'); return Promise.resolve({ default: ({ params }) => h('p', {}, params.id) }); },
        './routes/guide.page': () => { calls.push('guide'); return Promise.resolve({ default: () => h('p', {}, 'Guide') }); },
      });
      return h('div', {}, router.view);
    });
    assert.deepEqual(calls, ['post', 'root', 'posts layout']);
    assert.equal(document.body.textContent, 'Loading page…');
    await Promise.resolve();
    assert.equal(document.body.textContent, '42');
    window.location.hash = '#/posts/43';
    window.dispatchEvent(new window.Event('hashchange'));
    assert.equal(document.body.textContent, '43');
    assert.deepEqual(calls, ['post', 'root', 'posts layout']);
    dispose();
    window.close();
  });

  it('shows a failure state if a matched layout fails to load', async () => {
    const window = new Window({ url: 'http://localhost/#/posts/42' });
    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.Node = window.Node;
    const dispose = mount(document.body, () => {
      const router = createFileRouter({
        './routes/posts/layout.page': () => Promise.reject(new Error('offline')),
        './routes/posts/[id].page': { default: ({ params }) => h('p', {}, params.id) },
      });
      return h('div', {}, router.view);
    });
    assert.equal(document.body.textContent, 'Loading page…');
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(document.body.textContent, 'Could not load this page.');
    dispose();
    window.close();
  });

  it('falls back on malformed parameters and rejects duplicate layouts', () => {
    const window = new Window({ url: 'http://localhost/#/posts/%XX' });
    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.Node = window.Node;
    const page = { default: ({ params }) => h('p', {}, params.id) };
    const [router, dispose] = createRoot(() => createFileRouter({ './routes/posts/[id].page': page }));
    assert.equal(router.view().textContent, 'Page not found');
    dispose();
    assert.throws(() => createFileRouter({
      './routes/layout.page': page,
      '/app/routes/layout.page': page,
    }), /Duplicate route layout/);
    assert.throws(() => createFileRouter({
      './routes/layout.page': { default: 'not a component' },
    }), /Route file must export a component/);
    window.close();
  });
});

describe('Nodula history routing', () => {
  it('loads the initial pathname, navigates with pushState, and responds to back and forward', async () => {
    const window = new Window({ url: 'http://localhost/ideas/hello%20world' });
    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.Node = window.Node;
    let router;
    const dispose = mount(document.body, () => {
      router = createFileRouter({
        './routes/index.page': { default: () => h('p', {}, 'Home') },
        './routes/ideas/[id].page': { default: ({ params }) => h('p', {}, params.id) },
      }, undefined, { mode: 'history' });
      return h('main', {}, router.view);
    });
    assert.equal(document.body.textContent, 'hello world');
    assert.equal(router.current(), '/ideas/hello%20world');
    router.navigate('/?page=1#top');
    assert.equal(window.location.pathname, '/');
    assert.equal(window.location.search, '?page=1');
    assert.equal(window.location.hash, '#top');
    assert.equal(document.body.textContent, 'Home');
    window.history.back();
    await window.happyDOM.whenAsyncComplete();
    assert.equal(router.current(), '/ideas/hello%20world');
    assert.equal(document.body.textContent, 'hello world');
    window.history.forward();
    await window.happyDOM.whenAsyncComplete();
    assert.equal(router.current(), '/');
    assert.equal(document.body.textContent, 'Home');
    window.history.replaceState(null, '', '/ideas/again');
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    assert.equal(router.current(), '/ideas/again');
    assert.equal(document.body.textContent, 'again');
    assert.throws(() => router.navigate('https://elsewhere.example/'), /outside this origin/);
    dispose();
    window.history.replaceState(null, '', '/');
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    assert.equal(document.body.textContent, '');
    window.close();
  });

  it('intercepts ordinary same-origin links but preserves native link actions', () => {
    const window = new Window({ url: 'http://localhost/' });
    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.Node = window.Node;
    let router;
    const dispose = mount(document.body, () => {
      router = createRouter({ '/': () => h('p', {}, 'Home'), '/guide': () => h('p', {}, 'Guide') }, undefined, { mode: 'history' });
      return h('main', {}, h('a', { href: '/guide' }, h('span', {}, 'Go')), router.view);
    });
    const link = document.querySelector('a');
    const modified = new window.MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    link.dispatchEvent(modified);
    assert.equal(modified.defaultPrevented, false);
    assert.equal(router.current(), '/');
    const ordinary = new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.querySelector('span').dispatchEvent(ordinary);
    assert.equal(ordinary.defaultPrevented, true);
    assert.equal(window.location.pathname, '/guide');
    assert.equal(document.querySelector('p').textContent, 'Guide');
    for (const [href, attrs] of [['https://elsewhere.example/', {}], ['/guide#section', {}], ['/guide', { target: '_blank' }], ['/guide', { download: '' }]]) {
      link.href = href;
      link.removeAttribute('target');
      link.removeAttribute('download');
      for (const [name, value] of Object.entries(attrs)) link.setAttribute(name, value);
      const click = new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
      link.dispatchEvent(click);
      assert.equal(click.defaultPrevented, false, href);
    }
    dispose();
    link.href = '/';
    const afterDispose = new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(afterDispose);
    assert.equal(afterDispose.defaultPrevented, false);
    window.close();
  });

  it('lazy-loads a parameterized page and layout after history navigation', async () => {
    const window = new Window({ url: 'http://localhost/' });
    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.Node = window.Node;
    const calls = [];
    let router;
    const dispose = mount(document.body, () => {
      router = createFileRouter({
        './routes/index.page': { default: () => h('p', {}, 'Home') },
        './routes/ideas/layout.page': () => {
          calls.push('layout');
          return Promise.resolve({ default: ({ children }) => h('section', {}, children) });
        },
        './routes/ideas/[id].page': () => {
          calls.push('page');
          return Promise.resolve({ default: ({ params }) => h('p', {}, params.id) });
        },
      }, undefined, { mode: 'history' });
      return h('main', {}, router.view);
    });
    assert.deepEqual(calls, []);
    router.navigate('/ideas/first%20idea');
    assert.equal(document.body.textContent, 'Loading page…');
    assert.deepEqual(calls, ['page', 'layout']);
    await Promise.resolve();
    assert.equal(document.body.textContent, 'first idea');
    router.navigate('/ideas/second');
    assert.equal(document.body.textContent, 'second');
    assert.deepEqual(calls, ['page', 'layout']);
    dispose();
    window.close();
  });

  it('renders the shared UI layout and parameterized idea route with a decoded id', async () => {
    const window = new Window({ url: 'http://localhost/ideas/first%20idea' });
    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.Node = window.Node;
    const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
    let dispose;
    try {
      const { default: AppShell } = await server.ssrLoadModule('/src/AppShell.page');
      const { mount } = await server.ssrLoadModule('nodula-framework');
      dispose = mount(document.body, AppShell);

      for (let attempt = 0; attempt < 100 && !document.querySelector('.ui-idea-detail h1'); attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      assert.equal(new URL(window.location.href).pathname, '/ideas/first%20idea');
      assert.equal(document.querySelector('.ui-page__eyebrow')?.textContent, 'A shared ideas layout');
      assert.equal(document.querySelector('.ui-idea-detail h1')?.textContent, 'Idea first idea');
      assert.equal(document.querySelector('.ui-idea-detail a[href="/modal"]')?.textContent.trim(), 'Back to Modal');
    } finally {
      dispose?.();
      await server.close();
      window.close();
      delete globalThis.window;
      delete globalThis.document;
      delete globalThis.Node;
    }
  });

  it('keeps hash routing as the default and rejects unknown router modes', () => {
    const window = new Window({ url: 'http://localhost/#/' });
    globalThis.window = window;
    globalThis.document = window.document;
    const [router, dispose] = createRoot(() => createRouter({ '/': () => document.createTextNode('Home') }));
    router.navigate('/guide');
    assert.equal(window.location.hash, '#/guide');
    dispose();
    assert.throws(() => createRouter({}, undefined, { mode: 'other' }), /Unsupported router mode/);
    window.close();
  });
});