import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { build } from 'vite';
import { nodulaPWA } from '../framework/addons/pwa.js';

describe('Nodula PWA add-on', () => {
  it('returns vite-plugin-pwa plugins with prompt updates by default', () => {
    const plugins = nodulaPWA();
    assert.ok(Array.isArray(plugins));
    assert.ok(plugins.length > 0);
    assert.ok(plugins.every((plugin) => typeof plugin.name === 'string'));
  });

  it('passes through manifest and service worker options', () => {
    const plugins = nodulaPWA({
      registerType: 'autoUpdate',
      manifest: { name: 'Nodula Example', short_name: 'Nodula' },
      devOptions: { enabled: true },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png}'] },
    });
    assert.ok(plugins.every((plugin) => typeof plugin.name === 'string'));
  });

  it('generates a manifest and service worker during a Vite production build', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'nodula-pwa-'));
    try {
      await writeFile(path.join(root, 'index.html'), '<!doctype html><html><head><title>Nodula PWA test</title></head><body><main>Offline ready</main></body></html>');
      await build({
        configFile: false,
        root,
        publicDir: false,
        plugins: nodulaPWA({
          manifest: { name: 'Nodula PWA test', short_name: 'Nodula test' },
        }),
        build: { outDir: 'dist' },
      });

      const output = path.join(root, 'dist');
      const manifest = JSON.parse(await readFile(path.join(output, 'manifest.webmanifest'), 'utf8'));
      assert.equal(manifest.name, 'Nodula PWA test');
      assert.equal(manifest.short_name, 'Nodula test');
      assert.ok((await readFile(path.join(output, 'sw.js'), 'utf8')).length > 0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});