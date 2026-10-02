import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { Window } from 'happy-dom';
import { build } from 'vite';
import { createRoot } from '../dist/framework/nodula-framework.js';
import { createRouter } from '../dist/framework/nodula-router.js';
import { createSEO } from '../framework/addons/seo.js';
import { nodulaSEO } from '../framework/addons/seo-vite.js';

describe('Nodula SEO add-on', () => {
  it('applies defaults, dynamic route metadata, canonical, Open Graph, and hreflang', () => {
    const window = new Window({ url: 'https://example.test/posts/42?campaign=1' });
    globalThis.window = window;
    globalThis.document = window.document;
    const existingDescription = document.createElement('meta');
    existingDescription.name = 'description';
    existingDescription.content = 'Original description';
    document.head.append(existingDescription);
    const [router, disposeRouter] = createRoot(() => createRouter({
      '/posts/42': () => document.createTextNode('Post'),
      '/about': () => document.createTextNode('About'),
    }, undefined, { mode: 'history' }));

    const seo = createSEO(router, {
      siteUrl: 'https://example.test',
      defaults: { title: 'Example', description: 'Default description', openGraph: { siteName: 'Example site' } },
      routes: {
        '/posts/:id': ({ params }) => ({
          title: () => `Post ${params.id}`,
          description: `Description for ${params.id}`,
          openGraph: { type: 'article', image: () => `https://example.test/images/${params.id}.png` },
          hreflang: [{ lang: 'en', href: () => `https://example.test/posts/${params.id}` }],
        }),
      },
    });

    assert.equal(document.title, 'Post 42');
    assert.equal(document.querySelector('meta[name="description"]').content, 'Description for 42');
    assert.equal(document.querySelector('link[rel="canonical"]').href, 'https://example.test/posts/42');
    assert.equal(document.querySelector('meta[property="og:type"]').content, 'article');
    assert.equal(document.querySelector('meta[property="og:site_name"]').content, 'Example site');
    assert.equal(document.querySelector('meta[property="og:image"]').content, 'https://example.test/images/42.png');
    assert.equal(document.querySelector('link[hreflang="en"]').href, 'https://example.test/posts/42');
    assert.equal(document.head.querySelectorAll('meta[name="description"]').length, 1);

    router.navigate('/about');
    assert.equal(document.title, 'Example');
    assert.equal(document.querySelector('meta[name="description"]'), existingDescription);
    assert.equal(existingDescription.content, 'Original description');
    assert.equal(document.querySelector('meta[property="og:type"]'), null);
    assert.equal(document.querySelector('link[hreflang="en"]'), null);
    assert.equal(document.querySelector('link[rel="canonical"]').href, 'https://example.test/about');

    seo.dispose();
    assert.equal(document.title, '');
    assert.equal(document.querySelector('meta[name="description"]'), existingDescription);
    assert.equal(existingDescription.content, 'Original description');
    disposeRouter();
    window.close();
    delete globalThis.window;
    delete globalThis.document;
  });

  it('supports dynamic updates and deduplicates duplicate existing managed tags', () => {
    const window = new Window({ url: 'https://example.test/' });
    globalThis.window = window;
    globalThis.document = window.document;
    document.head.innerHTML = '<title>First original</title><title>Duplicate</title><meta name="description" content="Old"><meta name="description" content="Duplicate">';
    const [router, disposeRouter] = createRoot(() => createRouter({ '/': () => document.createTextNode('Home') }, undefined, { mode: 'history' }));
    const seo = createSEO(router, { defaults: { title: 'Home', description: 'Initial' } });

    assert.equal(document.head.querySelectorAll('title').length, 1);
    assert.equal(document.head.querySelectorAll('meta[name="description"]').length, 1);
    seo.update({ title: 'Updated', description: 'Updated description' });
    assert.equal(document.title, 'Updated');
    assert.equal(document.querySelector('meta[name="description"]').content, 'Updated description');
    seo.dispose();
    assert.deepEqual([...document.head.querySelectorAll('title')].map((title) => title.textContent), ['First original', 'Duplicate']);
    assert.deepEqual([...document.head.querySelectorAll('meta[name="description"]')].map((meta) => meta.content), ['Old', 'Duplicate']);

    disposeRouter();
    window.close();
    delete globalThis.window;
    delete globalThis.document;
  });

  it('generates a sitemap and robots.txt during a Vite build', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'nodula-seo-'));
    try {
      await writeFile(path.join(root, 'index.html'), '<!doctype html><html><head><title>SEO build</title></head><body>Ready</body></html>');
      await build({
        configFile: false,
        root,
        publicDir: false,
        plugins: [nodulaSEO({
          siteUrl: 'https://example.test',
          routes: ['/', { path: '/guide', changefreq: 'monthly', priority: 0.8, lastmod: '2026-10-02' }],
        })],
        build: { outDir: 'dist' },
      });

      const output = path.join(root, 'dist');
      const sitemap = await readFile(path.join(output, 'sitemap.xml'), 'utf8');
      const robots = await readFile(path.join(output, 'robots.txt'), 'utf8');
      assert.match(sitemap, /https:\/\/example\.test\//);
      assert.match(sitemap, /<changefreq>monthly<\/changefreq>/);
      assert.match(sitemap, /<priority>0\.8<\/priority>/);
      assert.match(robots, /User-agent: \*/);
      assert.match(robots, /Sitemap: https:\/\/example\.test\/sitemap\.xml/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects invalid site URLs, routes, and metadata options', () => {
    assert.throws(() => createSEO({}, {}), /router/);
    assert.throws(() => nodulaSEO({ siteUrl: 'file:///tmp', routes: ['/'] }), /HTTP or HTTPS/);
    assert.throws(() => nodulaSEO({ siteUrl: 'https://example.test', routes: ['guide'] }), /absolute path/);
    assert.throws(() => nodulaSEO({ siteUrl: 'https://example.test', routes: [{ path: '/', priority: 2 }] }), /between 0 and 1/);
  });
});