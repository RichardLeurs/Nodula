import { copyFile, mkdir, rm } from 'node:fs/promises';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { nodulaPlugin } from './framework/vite-plugin.js';
import { nodulaPWA } from 'nodula-framework/pwa';

const runtimeEntry = fileURLToPath(new URL('./dist/framework/nodula-framework.js', import.meta.url));
const formEntry = fileURLToPath(new URL('./dist/framework/nodula-form.js', import.meta.url));
const routerEntry = fileURLToPath(new URL('./dist/framework/nodula-router.js', import.meta.url));
const animationEntry = fileURLToPath(new URL('./dist/framework/nodula-animation.js', import.meta.url));
const dialogEntry = fileURLToPath(new URL('./dist/framework/nodula-dialog.js', import.meta.url));
const notificationsEntry = fileURLToPath(new URL('./dist/framework/nodula-notifications.js', import.meta.url));
const modalEntry = fileURLToPath(new URL('./dist/framework/nodula-modal.js', import.meta.url));
const drawerEntry = fileURLToPath(new URL('./dist/framework/nodula-drawer.js', import.meta.url));
const navigationEntry = fileURLToPath(new URL('./dist/framework/nodula-navigation.js', import.meta.url));
const localStorageEntry = fileURLToPath(new URL('./dist/framework/nodula-localstorage.js', import.meta.url));
const dataEntry = fileURLToPath(new URL('./dist/framework/nodula-data.js', import.meta.url));
const storeEntry = fileURLToPath(new URL('./dist/framework/nodula-store.js', import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL('./demo app', import.meta.url)),
  plugins: [
    nodulaPlugin(),
    ...nodulaPWA(),
    {
      name: 'nodula-clean-app-output',
      async buildStart() {
        await Promise.all([
          rm(new URL('./dist/assets', import.meta.url), { recursive: true, force: true }),
          rm(new URL('./dist/index.html', import.meta.url), { force: true }),
        ]);
      },
    },
    {
      name: 'nodula-copy-app-icon',
      async closeBundle() {
        await mkdir('dist/assets', { recursive: true });
        await copyFile('demo app/src/assets/logo-64x64.png', 'dist/assets/logo-64x64.png');
      },
    },
  ],
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: false,
    minify: 'oxc',
    cssMinify: 'lightningcss',
    rolldownOptions: {
      external: (id) => id === runtimeEntry || id === formEntry || id === routerEntry || id === animationEntry || id === dialogEntry || id === notificationsEntry || id === modalEntry || id === drawerEntry || id === navigationEntry || id === localStorageEntry || id === dataEntry || id === storeEntry || id === 'nodula-framework/form' || id === 'nodula-framework/router' || id === 'nodula-framework/animation' || id === 'nodula-framework/dialog' || id === 'nodula-framework/notifications' || id === 'nodula-framework/modal' || id === 'nodula-framework/drawer' || id === 'nodula-framework/navigation' || id === 'nodula-framework/localstorage' || id === 'nodula-framework/data' || id === 'nodula-framework/store',
      makeAbsoluteExternalsRelative: false,
      output: {
        paths: (id) => id === runtimeEntry ? '/framework/nodula-framework.js' : id === formEntry || id === 'nodula-framework/form' ? '/framework/nodula-form.js' : id === routerEntry || id === 'nodula-framework/router' ? '/framework/nodula-router.js' : id === animationEntry || id === 'nodula-framework/animation' ? '/framework/nodula-animation.js' : id === dialogEntry || id === 'nodula-framework/dialog' ? '/framework/nodula-dialog.js' : id === notificationsEntry || id === 'nodula-framework/notifications' ? '/framework/nodula-notifications.js' : id === modalEntry || id === 'nodula-framework/modal' ? '/framework/nodula-modal.js' : id === drawerEntry || id === 'nodula-framework/drawer' ? '/framework/nodula-drawer.js' : id === navigationEntry || id === 'nodula-framework/navigation' ? '/framework/nodula-navigation.js' : id === localStorageEntry || id === 'nodula-framework/localstorage' ? '/framework/nodula-localstorage.js' : id === dataEntry || id === 'nodula-framework/data' ? '/framework/nodula-data.js' : id === storeEntry || id === 'nodula-framework/store' ? '/framework/nodula-store.js' : id,
      },
    },
  },
});