import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { it } from 'node:test';
import { build } from 'vite';

const projectRoot = process.cwd();

async function bundleConsumer(entry) {
  const outDir = await mkdtemp(path.join(tmpdir(), 'nodula-tree-shaking-'));
  try {
    await build({
      configFile: false,
      root: projectRoot,
      logLevel: 'silent',
      build: {
        lib: {
          entry: path.join(projectRoot, 'tests/fixtures/tree-shaking', entry),
          formats: ['es'],
          fileName: () => 'consumer.js',
        },
        outDir,
        emptyOutDir: true,
        minify: 'oxc',
        reportCompressedSize: false,
      },
    });
    return await readFile(path.join(outDir, 'consumer.js'), 'utf8');
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

it('tree-shakes unused exports from each public package entry in a Vite production consumer build', async () => {
  const core = await bundleConsumer('core.js');
  assert.match(core, /treeShakingResult/);
  assert.doesNotMatch(core, /createStore/);
  assert.doesNotMatch(core, /baseURI/);

  const form = await bundleConsumer('form.js');
  assert.match(form, /treeShakingResult/);
  assert.doesNotMatch(form, /baseURI/);
  assert.doesNotMatch(form, /Unsupported router mode/);
  assert.match(form, /createStore expects a plain object or array/);

  const store = await bundleConsumer('store.js');
  assert.match(store, /treeShakingResult/);
  assert.match(store, /createStore expects a plain object or array/);

  const storage = await bundleConsumer('localstorage.js');
  assert.match(storage, /treeShakingResult/);
  assert.match(storage, /localStorage/);
  assert.doesNotMatch(storage, /createTransition/);

  const router = await bundleConsumer('router.js');
  assert.match(router, /treeShakingResult/);
  assert.doesNotMatch(router, /Unsupported route file/);

  const animation = await bundleConsumer('animation.js');
  assert.match(animation, /treeShakingResult/);
  assert.doesNotMatch(animation, /translateY\(8px\)/);
  assert.doesNotMatch(animation, /removeOnLeave/);

  const dialog = await bundleConsumer('dialog.js');
  assert.match(dialog, /treeShakingResult/);
  assert.doesNotMatch(dialog, /createTransition/);
  assert.doesNotMatch(dialog, /translateY\(8px\)/);

  const notifications = await bundleConsumer('notifications.js');
  assert.match(notifications, /treeShakingResult/);
  assert.match(notifications, /showNotification expects an options object/);
  assert.match(notifications, /ui-notification/);
  assert.doesNotMatch(notifications, /createTransition/);

  const modal = await bundleConsumer('modal.js');
  assert.match(modal, /treeShakingResult/);
  assert.match(modal, /ui-modal/);
  assert.doesNotMatch(modal, /createTransition/);

  const drawer = await bundleConsumer('drawer.js');
  assert.match(drawer, /treeShakingResult/);
  assert.match(dialog, /ui-dialog/);
  assert.doesNotMatch(drawer, /ui-modal/);

  const navigation = await bundleConsumer('navigation.js');
  assert.match(navigation, /treeShakingResult/);
  assert.match(navigation, /aria-current/);
  assert.doesNotMatch(navigation, /Unsupported router mode/);

  const auth = await bundleConsumer('auth.js');
  assert.match(auth, /treeShakingResult/);
  assert.match(auth, /getSession/);
  assert.doesNotMatch(auth, /createDataClient/);
});