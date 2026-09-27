import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('demo font sizes scale from the root font size', () => {
  const css = readFileSync(new URL('../demo app/src/assets/app.css', import.meta.url), 'utf8');
  const guide = readFileSync(new URL('../demo app/src/routes/modal.page', import.meta.url), 'utf8');

  assert.match(css, /:root\s*\{[^}]*font-size:\s*100%\s*;/);
  assert.match(css, /\.hero-description\s*\{[^}]*font-size:\s*1rem\s*;/);
  assert.match(css, /\.idea\s*\{[^}]*font-size:\s*\.875rem\s*;/);
  assert.match(css, /\.eyebrow\s*\{[^}]*font:\s*\.875rem\s+var\(--mono\)/);
  assert.match(css, /\.nav-link, \.github-link\s*\{[^}]*font-size:\s*1rem\s*;/);
  assert.match(guide, /\.template-demo\s*\{[^}]*font-size:\s*\.875rem\s*;/);
  assert.doesNotMatch(css, /(?<![\d.])\.(?:75|8125)rem\b/);
  assert.doesNotMatch(css, /(?:font-size\s*:|\bfont\s*:)[^;}]*\d+(?:\.\d+)?px\b/);
  assert.doesNotMatch(guide, /font-size\s*:\s*\d+(?:\.\d+)?px\b/);
});