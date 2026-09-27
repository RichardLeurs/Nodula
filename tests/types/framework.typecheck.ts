import {
  computed,
  createRoot,
  defineCustomElement,
  each,
  effect,
  fragment,
  h,
  list,
  mount,
  onCleanup,
  signal,
  Nodula,
  slot,
  visibleIsland,
  when,
} from '../../src framework/index.js';
import { signal as packageSignal, h as packageH } from 'nodula-framework';
import { createStore as packageStore } from 'nodula-framework/store';
import { createForm as packageForm } from 'nodula-framework/form';
import { createFileRouter, createRouter } from 'nodula-framework/router';
import { animate, createTransition } from 'nodula-framework/animation';
import { showDialog } from 'nodula-framework/dialog';
import { showNotification } from 'nodula-framework/notifications';
import { openModal } from 'nodula-framework/modal';
import { openDrawer } from 'nodula-framework/drawer';
import { mountNavigation } from 'nodula-framework/navigation';
import { createIndexedDBSignal, createStorageSignal, deleteCookie, getCookie, setCookie } from 'nodula-framework/localstorage';
import { nodulaPWA } from 'nodula-framework/pwa';
import { createDataClient, DataError } from 'nodula-framework/data';
import type { Plugin } from 'vite';

const [count, setCount] = signal(0);
const stylesheet = Nodula.css('/assets/app.css');
const customElement = defineCustomElement('nodula-typecheck', ({ props }) => h('span', {}, String(props?.name)), {
  props: ['name', 'record'],
  events: ['save'],
  shadow: 'open',
});
const nodulaCustomElement = Nodula.defineCustomElement('nodula-typecheck-api', () => h('span', {}, 'Ready'), { shadow: false });
const nativeCustomElement = packageH('date-range-picker', {
  selectedRange: () => ({ from: '2026-09-01', to: '2026-09-26' }),
  'on:range-change': (event) => console.log(event.detail),
});
const [packageCount, setPackageCount] = packageSignal(1);
const packageState = packageStore({ active: true });
const packageButton = packageH('button', { onClick: (event) => setPackageCount(packageCount() + Number(event.button)) }, packageState.active ? 'Active' : 'Inactive');
const packageFormController = packageForm({ email: '' }, { validate: (values) => values.email.includes('@') ? {} : { email: 'Invalid email.' } });
packageFormController.handleChange('email')(new Event('input'));
packageFormController.reset();
const animationElement = document.createElement('div');
const animation = animate(animationElement, [{ opacity: 0 }, { opacity: 1 }], { duration: 100 });
const transition = createTransition(animationElement, { enter: [{ opacity: 0 }, { opacity: 1 }] });
transition.cancel();
const dialogResult: Promise<boolean> = showDialog('Continue with this action?', { title: 'Confirm action', cancelText: 'Not now', okText: 'Continue' });
const notificationHandle = showNotification({ type: 'success', title: 'Saved', message: 'Changes saved.', position: 'top-right', duration: 3000 });
notificationHandle.close();
console.log(notificationHandle.closed);
const modalHandle = openModal('Modal content', { title: 'Typechecked modal', closeText: 'Dismiss' });
modalHandle.close();
const drawerHandle = openDrawer('Drawer content', { title: 'Typechecked drawer', closeOnBackdrop: false, position: 'left' });
drawerHandle.close();
const disposeNavigation = mountNavigation(document.createElement('header'), createRouter({}), [
  { label: 'Home', href: '/' },
  { label: 'Nodula website', href: 'https://sprigjs.richardleurs.nl/', external: true },
  { label: 'Same tab external', href: 'https://example.com/docs', external: true, target: '_self' },
], { label: 'Demo navigation', activeClassName: 'current' });
disposeNavigation();
const [storedTheme, setStoredTheme] = createStorageSignal('type-test-theme', 'dark');
setStoredTheme(storedTheme() === 'dark' ? 'light' : 'dark');
const indexedTheme = createIndexedDBSignal('indexed-theme', 'dark', { databaseName: 'type-test' });
indexedTheme[1]('light');
const indexedThemeAvailable: boolean = indexedTheme.available;
indexedTheme.ready.then(() => console.log(indexedTheme[0]()));
setCookie('nodula-theme', 'dark', { path: '/', sameSite: 'Lax', secure: true, maxAge: 3600 });
const storedCookie: string | undefined = getCookie('nodula-theme');
deleteCookie('nodula-theme', { path: '/' });
const pwaPlugins: Plugin[] = nodulaPWA({
  manifest: { name: 'Nodula Type Test', short_name: 'Nodula' },
  registerType: 'prompt',
  devOptions: { enabled: false },
});
const dataClient = createDataClient({ baseURL: '/api', headers: { 'x-client': 'nodula' } });
const typedResponse: Promise<{ id: number }> = dataClient.get('/items/1');
const typedCreation: Promise<{ id: number }> = dataClient.post('/items', { name: 'Leaf' });
const typedDataError: typeof DataError = DataError;
console.log(typedResponse, typedCreation, typedDataError);
const doubled = computed(() => count() * 2);
setCount((current) => current + 1);
effect(() => { console.log(doubled()); });

const state = packageStore({ profile: { name: 'Nodula' }, items: ['seed'] });
state.profile.name = 'Updated';
state.items.push('leaf');
interface UserState { user: { id: number; name: string }; active: boolean }
const typedState = packageStore<UserState>({ user: { id: 1, name: 'Ada' }, active: true });
typedState.user.name = 'Grace';

const button = h('button', { onClick: (event) => console.log(event.currentTarget), ref: (node) => console.log(node) }, 'Click');
const textInput = h('input', { bind: { property: 'value', read: () => state.profile.name, write: (value) => value } });
const checkbox = h('input', { type: 'checkbox', bind: { property: 'checked', read: () => true, write: (value) => value } });
const paragraph = h('p', { show: () => count() > 0 }, () => String(count()));
const fragmentNode = fragment(button, textInput, checkbox, paragraph);

const rows = each(() => state.items, (item) => item, (item) => h('li', {}, item()));
const keyedRows = list(() => state.items, (item) => item, (item) => h('li', {}, item));
const condition = when(() => count() > 0, () => h('strong', {}, 'Yes'), () => h('em', {}, 'No'));
const content = slot({ default: () => h('span', {}, 'content') }, 'default', () => fragment('fallback'));

const [rootResult, dispose] = createRoot(() => {
  onCleanup(() => console.log('disposed'));
  const mounted = h('main', {}, fragmentNode, keyedRows, condition, content);
  return [mounted, 'owned'] as const;
});
const [rootNode, rootValue] = rootResult;
console.log(rootNode, rootValue);
const unmount = mount(document.body, () => h('main', {}, rows));
dispose();
unmount();

const routes = createRouter({ '/': () => h('main', {}, 'Home') }, undefined, { mode: 'history' });
const fileRoutes = createFileRouter({ './routes/index.page': { default: () => h('main', {}, 'Home') } });
const island = visibleIsland(async () => () => h('p', {}, 'Loaded'), 'Loading');
console.log(routes.current(), fileRoutes.current(), island, packageButton, typedState.active, stylesheet, animation, dialogResult, customElement, nodulaCustomElement, nativeCustomElement, indexedThemeAvailable, pwaPlugins);

// @ts-expect-error a signal setter must receive its value type or a valid updater.
setCount('wrong');
// @ts-expect-error `@bind` accepts only value and checked control properties.
h('input', { bind: { property: 'text', read: () => '', write: (value: string) => value } });
// @ts-expect-error router mode is a closed union.
createRouter({}, undefined, { mode: 'router-mode-that-does-not-exist' });

// @ts-expect-error routing is provided by the optional `nodula-framework/router` entry.
import { createRouter as coreRouter } from 'nodula-framework';
void coreRouter;