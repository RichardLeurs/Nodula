import HomePage from './routes/index.page';
import AddonsPage from './routes/addons.page';
import AdminPage from './routes/admin.page';
import DataPage from './routes/data.page';
import DemoCssPage from './routes/democss.page';
import FormsPage from './routes/forms.page';
import IdeaDetailPage from './routes/ideas/[id].page';
import IdeasLayout from './routes/ideas/layout.page';
import LoginPage from './routes/login.page';
import ModalPage from './routes/modal.page';
import WebComponentsPage from './routes/web-components.page';

const routeComponents = {
  '/': HomePage,
  '/addons': AddonsPage,
  '/admin': AdminPage,
  '/data': DataPage,
  '/democss': DemoCssPage,
  '/forms': FormsPage,
  '/login': LoginPage,
  '/modal': ModalPage,
  '/web-components': WebComponentsPage,
};

// To DO nested routes
function createIdeaRoute(path) {
  const encodedId = path.slice('/ideas/'.length);
  let id;
  try {
    id = decodeURIComponent(encodedId);
  } catch {
    return undefined;
  }

  return () => IdeasLayout({ children: IdeaDetailPage({ params: { id } }) });
}

export const routes = new Proxy(routeComponents, {
  get(target, path) {
    if (typeof path !== 'string') return undefined;
    if (Object.hasOwn(target, path)) return () => target[path]();
    if (/^\/ideas\/[^/]+$/.test(path)) return createIdeaRoute(path);
    return undefined;
  },
});

export function notFound() {
  return document.createTextNode('Page not found');
}