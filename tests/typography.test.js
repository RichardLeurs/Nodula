import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('demo font sizes scale from the root font size', () => {
  const css = readFileSync(new URL('../demo_app/src/assets/app.css', import.meta.url), 'utf8');
  const guide = readFileSync(new URL('../demo_app/src/routes/modal.page', import.meta.url), 'utf8');

  assert.match(css, /:root\s*\{[^}]*font-size:\s*100%\s*;/);
  assert.match(css, /\.ui-page__description\s*\{[^}]*font-size:\s*1\.05rem\s*;/);
  assert.match(css, /\.ui-ideas-list__item\s*\{[^}]*font-size:\s*\.84rem\s*;/);
  assert.match(css, /\.ui-page__eyebrow\s*\{[^}]*font:\s*600\s+\.78rem\/1\.4\s+var\(--mono/);
  assert.match(css, /\.ui-nav-link, \.ui-github-link\s*\{[^}]*font-size:\s*1rem\s*;/);
  assert.match(guide, /class="ui-card(?:\s|"|\.)/);
  assert.match(guide, /class="ui-code-block"/);
  assert.doesNotMatch(css, /(?<![\d.])\.8125rem\b/);
  assert.doesNotMatch(css, /(?:font-size\s*:|\bfont\s*:)[^;}]*\d+(?:\.\d+)?px\b/);
  assert.doesNotMatch(guide, /font-size\s*:\s*\d+(?:\.\d+)?px\b/);
});