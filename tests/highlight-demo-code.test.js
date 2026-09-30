import assert from 'node:assert/strict';
import { after, it } from 'node:test';
import { Window } from 'happy-dom';

const window = new Window({ url: 'http://localhost/' });
globalThis.window = window;
globalThis.document = window.document;
globalThis.Element = window.Element;
globalThis.Node = window.Node;
globalThis.MutationObserver = window.MutationObserver;

const { installDemoCodeHighlighting } = await import('../demo_app/src/highlight-demo-code.js');

after(() => window.close());

it('detects JavaScript, HTML, and CSS snippets and highlights lazy-added code', async () => {
  document.body.innerHTML = `
    <main class="ui-app">
      <div class="guide-code"><pre><code>const answer = await fetch('/api');</code></pre></div>
      <div class="guide-code"><pre><code>&lt;section class="card"&gt;Hello&lt;/section&gt;</code></pre></div>
      <div class="guide-code"><pre><code>.card { color: red; display: grid; }</code></pre></div>
    </main>
  `;
  const app = document.querySelector('.ui-app');
  const dispose = installDemoCodeHighlighting(app);
  const initialCode = [...app.querySelectorAll('.guide-code code')];

  assert.deepEqual(initialCode.map((code) => code.dataset.highlightLanguage), ['javascript', 'html', 'css']);
  assert.ok(initialCode.every((code) => code.querySelector('span.hljs-keyword, span.hljs-tag, span.hljs-selector-class')));

  const lazySnippet = document.createElement('div');
  lazySnippet.className = 'guide-code';
  lazySnippet.innerHTML = '<pre><code>const lazyRoute = true;</code></pre>';
  app.append(lazySnippet);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const highlightedLazyCode = lazySnippet.querySelector('code');
  assert.equal(highlightedLazyCode.dataset.highlightLanguage, 'javascript');
  assert.ok(highlightedLazyCode.querySelector('.hljs-keyword'));

  dispose();
});

it('keeps code blocks for unsupported explicit languages unmodified', () => {
  const app = document.createElement('main');
  app.className = 'ui-app';
  app.innerHTML = '<div class="guide-code"><pre><code data-language="python">print("hello")</code></pre></div>';
  document.body.append(app);

  const dispose = installDemoCodeHighlighting(app);
  const code = app.querySelector('code');
  assert.equal(code.textContent, 'print("hello")');
  assert.equal(code.dataset.highlighted, undefined);
  dispose();
  app.remove();
});

it('waits for dynamically appended code text before highlighting', async () => {
  const app = document.createElement('main');
  app.className = 'ui-app';
  document.body.append(app);
  const dispose = installDemoCodeHighlighting(app);

  const card = document.createElement('article');
  card.className = 'addon-card';
  const snippet = document.createElement('code');
  snippet.dataset.highlight = '';
  card.append(snippet);
  app.append(card);
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(snippet.dataset.highlighted, undefined);

  snippet.append(document.createTextNode("import { signal } from 'nodula-framework';"));
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(snippet.dataset.highlighted, 'yes');
  assert.equal(snippet.dataset.highlightLanguage, 'javascript');
  assert.ok(snippet.querySelector('.hljs-keyword'));

  dispose();
  app.remove();
});