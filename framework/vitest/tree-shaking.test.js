import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { it } from 'vitest';
import { build } from 'vite';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const fixtureDirectory = fileURLToPath(new URL('./fixtures/tree-shaking/', import.meta.url));

async function bundleConsumer(entry) {
  const outDir = await mkdtemp(path.join(tmpdir(), 'nodula-tree-shaking-'));
  try {
    await build({
      configFile: false,
      root: projectRoot,
      logLevel: 'silent',
      resolve: {
        alias: [
          { find: /^nodula-framework$/, replacement: path.join(projectRoot, 'framework/index.js') },
          {
            find: 'nodula-framework/vite',
            replacement: path.join(projectRoot, 'framework/vite-plugin.js'),
          },
          ...[
            'animation',
            'auth',
            'cookieconsent',
            'data',
            'resource',
            'suspense',
            'props',
            'dragdrop',
            'sortable',
            'filedrop',
            'fileupload',
            'dialog',
            'drawer',
            'form',
            'localstorage',
            'modal',
            'navigation',
            'navigation-dropdown',
            'notification',
            'pwa',
            'router',
            'seo',
            'seo-vite',
            'store',
            'island',
            'web-components',
          ].map((name) => ({
            find: `nodula-framework/${name}`,
            replacement: path.join(projectRoot, `framework/addons/${name}.js`),
          })),
          ...['pocketbase', 'supabase', 'rest'].map((name) => ({
            find: `nodula-framework/data-${name}`,
            replacement: path.join(projectRoot, `framework/addons/data-adapters/${name}.js`),
          })),
        ],
      },
      build: {
        lib: {
          entry: path.join(fixtureDirectory, entry),
          formats: ['es'],
          fileName: () => 'consumer.js',
        },
        outDir,
        emptyOutDir: true,
        minify: 'oxc',
        reportCompressedSize: false,
        rolldownOptions: {
          external: ['vite-plugin-pwa'],
        },
      },
    });
    return await readFile(path.join(outDir, 'consumer.js'), 'utf8');
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

it('has a tree-shaking consumer fixture for every public JavaScript package entry', async () => {
  const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'));
  const publicEntries = Object.entries(packageJson.exports)
    .filter(([name, entry]) => name === '.' || entry?.import)
    .map(([name]) => name === '.' ? 'core' : name.slice(2))
    .sort();
  const fixtureEntries = (await readdir(fixtureDirectory))
    .filter((name) => name.endsWith('.js'))
    .map((name) => name.slice(0, -3))
    .sort();

  assert.deepEqual(fixtureEntries, publicEntries);
});

it('tree-shakes unused exports from each public package entry in a Vite production consumer build', async () => {
  const core = await bundleConsumer('core.js');
  assert.match(core, /treeShakingResult/);
  assert.doesNotMatch(core, /createStore/);
  assert.doesNotMatch(core, /baseURI/);
  assert.doesNotMatch(core, /IntersectionObserver/);
  assert.doesNotMatch(core, /defineCustomElement expects/);

  const form = await bundleConsumer('form.js');
  assert.match(form, /treeShakingResult/);
  assert.doesNotMatch(form, /baseURI/);
  assert.doesNotMatch(form, /Unsupported router mode/);
  assert.match(form, /createStore expects a plain object or array/);

  const store = await bundleConsumer('store.js');
  assert.match(store, /treeShakingResult/);
  assert.match(store, /createStore expects a plain object or array/);

  const fileUpload = await bundleConsumer('fileupload.js');
  assert.match(fileUpload, /treeShakingResult/);
  assert.match(fileUpload, /createFileDropZone/);
  assert.match(fileUpload, /XMLHttpRequest/);

  const storage = await bundleConsumer('localstorage.js');
  assert.match(storage, /treeShakingResult/);
  assert.match(storage, /createLocalStorage/);
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

  const resource = await bundleConsumer('resource.js');
  assert.match(resource, /treeShakingResult/);
  assert.match(resource, /createResource expects a fetcher function/);
  assert.doesNotMatch(resource, /createStore expects a plain object or array/);
  assert.doesNotMatch(resource, /createLocalStorage/);

  const suspense = await bundleConsumer('suspense.js');
  assert.match(suspense, /treeShakingResult/);
  assert.match(suspense, /createSuspense expects an array of resources/);
  assert.doesNotMatch(suspense, /createResource expects a fetcher function/);

  // A consumer that imports only withProps must not ship the attribute merger.
  const props = await bundleConsumer('props.js');
  assert.match(props, /treeShakingResult/);
  assert.match(props, /props are read-only/);
  assert.doesNotMatch(props, /"className"/);

  const island = await bundleConsumer('island.js');
  assert.match(island, /treeShakingResult/);
  assert.match(island, /visibleIsland errorText must be a non-empty string/);
  assert.match(island, /IntersectionObserver/);
  assert.doesNotMatch(island, /defineCustomElement expects/);

  const webComponents = await bundleConsumer('web-components.js');
  assert.match(webComponents, /treeShakingResult/);
  assert.match(webComponents, /defineCustomElement expects a valid custom element name/);
  assert.doesNotMatch(webComponents, /visibleIsland errorText/);
  assert.doesNotMatch(webComponents, /stylesheet/);

  const notification = await bundleConsumer('notification.js');
  assert.match(notification, /treeShakingResult/);
  assert.match(notification, /showNotification expects an options object/);
  assert.match(notification, /ui-notification/);
  assert.doesNotMatch(notification, /createTransition/);

  const modal = await bundleConsumer('modal.js');
  assert.match(modal, /treeShakingResult/);
  assert.match(modal, /showModal/);
  assert.match(modal, /ui-modal/);
  assert.doesNotMatch(modal, /createTransition/);

  const drawer = await bundleConsumer('drawer.js');
  assert.match(drawer, /treeShakingResult/);
  assert.match(drawer, /showDrawer/);
  assert.match(dialog, /ui-dialog/);
  assert.doesNotMatch(drawer, /ui-modal/);

  const navigation = await bundleConsumer('navigation.js');
  assert.match(navigation, /treeShakingResult/);
  assert.match(navigation, /aria-current/);
  assert.doesNotMatch(navigation, /Unsupported router mode/);

  const navigationDropdown = await bundleConsumer('navigation-dropdown.js');
  assert.match(navigationDropdown, /createNavigationDropdown/);
  assert.match(navigationDropdown, /createNavigation/);
  assert.match(navigationDropdown, /aria-expanded/);
  assert.doesNotMatch(navigationDropdown, /createDataClient/);

  const auth = await bundleConsumer('auth.js');
  assert.match(auth, /treeShakingResult/);
  assert.match(auth, /getSession/);
  assert.doesNotMatch(auth, /createDataClient/);

  const data = await bundleConsumer('data.js');
  assert.match(data, /treeShakingResult/);
  assert.match(data, /Data request failed with HTTP/);
  assert.doesNotMatch(data, /createStore expects a plain object or array/);

  const pocketbase = await bundleConsumer('data-pocketbase.js');
  assert.match(pocketbase, /treeShakingResult/);
  assert.match(pocketbase, /createPocketBaseAdapter expects collection/);
  assert.doesNotMatch(pocketbase, /createSupabaseAdapter|createRestAdapter/);

  const supabase = await bundleConsumer('data-supabase.js');
  assert.match(supabase, /treeShakingResult/);
  assert.match(supabase, /createSupabaseAdapter expects table/);
  assert.doesNotMatch(supabase, /createPocketBaseAdapter|createRestAdapter/);

  const rest = await bundleConsumer('data-rest.js');
  assert.match(rest, /treeShakingResult/);
  assert.match(rest, /createRestAdapter expects resource/);
  assert.doesNotMatch(rest, /createPocketBaseAdapter|createSupabaseAdapter/);

  const dragdrop = await bundleConsumer('dragdrop.js');
  assert.match(dragdrop, /treeShakingResult/);
  assert.match(dragdrop, /createDragSource/);
  assert.doesNotMatch(dragdrop, /createDataClient/);

  const sortable = await bundleConsumer('sortable.js');
  assert.match(sortable, /treeShakingResult/);
  assert.match(sortable, /createSortableList/);
  assert.doesNotMatch(sortable, /createDataClient/);

  const filedrop = await bundleConsumer('filedrop.js');
  assert.match(filedrop, /treeShakingResult/);
  assert.match(filedrop, /createFileDropZone/);
  assert.match(filedrop, /ui-filedrop/);

  const pwa = await bundleConsumer('pwa.js');
  assert.match(pwa, /treeShakingResult/);
  assert.match(pwa, /registerType/);
  assert.match(pwa, /prompt/);

  const seo = await bundleConsumer('seo.js');
  assert.match(seo, /treeShakingResult/);
  assert.match(seo, /SEO route patterns must start with/);
  assert.doesNotMatch(seo, /nodula-seo-static-files/);

  const seoVite = await bundleConsumer('seo-vite.js');
  assert.match(seoVite, /treeShakingResult/);
  assert.match(seoVite, /nodula-seo-static-files/);
  assert.match(seoVite, /sitemap\.xml/);
  assert.doesNotMatch(seoVite, /SEO route patterns must start with/);

  const vite = await bundleConsumer('vite.js');
  assert.match(vite, /treeShakingResult/);
  assert.match(vite, /nodula-single-file-components/);
});