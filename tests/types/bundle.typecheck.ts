import { h, signal } from '../../dist/framework/nodula-framework.js';
import { createStore } from '../../dist/framework/nodula-store.js';
import { createForm } from '../../dist/framework/nodula-form.js';
import { createRouter, type NavigationGuard } from '../../dist/framework/nodula-router.js';
import { animate, createTransition } from '../../dist/framework/nodula-animation.js';
import { showDialog } from '../../dist/framework/nodula-dialog.js';
import { openModal } from '../../dist/framework/nodula-modal.js';
import { openDrawer } from '../../dist/framework/nodula-drawer.js';
import { mountNavigation } from '../../dist/framework/nodula-navigation.js';
import { createIndexedDBSignal, createStorageSignal, deleteCookie, getCookie, setCookie } from '../../dist/framework/nodula-localstorage.js';
import { createDataClient, DataError } from '../../dist/framework/nodula-data.js';
import { createAuth } from '../../dist/framework/nodula-auth.js';

const [count, setCount] = signal(0);
const state = createStore({ message: 'ready' });
setCount((value) => value + 1);
const button = h('button', { onClick: () => setCount(count() + 1) }, state.message);
console.log(button);
const router = createRouter({ '/': () => button });
console.log(router.current());
const animation = animate(button, [{ opacity: 0 }, { opacity: 1 }], { duration: 100 });
const transition = createTransition(button, { leave: [{ opacity: 1 }, { opacity: 0 }] });
transition.cancel();
console.log(animation);
const confirmation: Promise<boolean> = showDialog('Continue?', { title: 'Confirm', cancelText: 'No', okText: 'Yes' });
console.log(confirmation);
const modalHandle = openModal('Built modal', { title: 'Confirmation' });
modalHandle.close();
const drawerHandle = openDrawer('Built drawer', { title: 'Drawer', closeOnBackdrop: false, position: 'right' });
drawerHandle.close();
const disposeNavigation = mountNavigation(document.createElement('header'), router, [
  { label: 'Home', href: '/' },
  { label: 'External', href: 'https://example.com/', external: true },
  { label: 'External same tab', href: 'https://example.com/docs', external: true, target: '_self' },
]);
disposeNavigation();
const [storedValue] = createStorageSignal('bundle-value', { ready: true });
console.log(storedValue());
const indexedValue = createIndexedDBSignal('bundle-indexed-value', { ready: true });
indexedValue.ready.then(() => console.log(indexedValue[0]()));
setCookie('bundle-cookie', 'ready', { path: '/', sameSite: 'Lax' });
console.log(getCookie('bundle-cookie'));
deleteCookie('bundle-cookie', { path: '/' });
const dataClient = createDataClient({ baseURL: '/api' });
dataClient.get<Array<{ id: number }>>('/ideas', { params: { limit: 10 } }).then((ideas) => console.log(ideas[0]?.id));
dataClient.post('/ideas', { text: 'Test' }).catch((error) => {
  if (error instanceof DataError) console.log(error.status, error.data);
});
const auth = createAuth<{ email: string; password: string }, { id: string }, { token: string }>({
  async getSession() { return null; },
  async signIn(credentials) { return { user: { id: credentials.email }, session: { token: 'opaque' } }; },
  async signOut(session) { console.log(session?.token); },
});
auth.initialize().then(() => console.log(auth.status(), auth.isAuthenticated(), auth.user()?.id));
const requireSession: NavigationGuard = ({ to }) => to === '/account' && !auth.isAuthenticated() ? '/login' : true;
const guardedRouter = createRouter({}, undefined, { beforeEach: requireSession });
console.log(guardedRouter.navigationPending(), guardedRouter.canRender());

// @ts-expect-error built declarations must preserve signal value types.
setCount('incorrect');