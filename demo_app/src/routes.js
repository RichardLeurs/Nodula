const routeComponents = {
  '/': { load: () => import('./routes/index.page') },
  '/addons': { load: () => import('./routes/addons.page') },
  '/admin': { load: () => import('./routes/admin.page') },
  '/data': { load: () => import('./routes/data.page') },
  '/navigation-dropdown': { load: () => import('./routes/navigation-dropdown.page') },
  '/sortable': { load: () => import('./routes/sortable.page') },
  '/dragdrop': { load: () => import('./routes/dragdrop.page') },
  '/filedrop': { load: () => import('./routes/filedrop.page') },
  '/democss': { load: () => import('./routes/democss.page') },
  '/forms': { load: () => import('./routes/forms.page') },
  '/login': { load: () => import('./routes/login.page') },
  '/modal': { load: () => import('./routes/modal.page') },
  '/web-components': { load: () => import('./routes/web-components.page') },
};

function createIdeaRoute(path) {
  const encodedId = path.slice('/ideas/'.length);
  let id;
  try {
    id = decodeURIComponent(encodedId);
  } catch {
    return undefined;
  }

  return {
    load: async () => {
      const [pageModule, layoutModule] = await Promise.all([
        import('./routes/ideas/[id].page'),
        import('./routes/ideas/layout.page'),
      ]);
      const page = pageModule.default;
      const layout = layoutModule.default;
      return ({ params }) => layout({ children: page({ params }) });
    },
    context: { params: { id } },
  };
}

export const routes = new Proxy(routeComponents, {
  get(target, path) {
    if (typeof path !== 'string') return undefined;
    if (Object.hasOwn(target, path)) return target[path];
    if (/^\/ideas\/[^/]+$/.test(path)) return createIdeaRoute(path);
    return undefined;
  },
});

export function notFound() {
  const element = document.createElement('div');
  element.className = 'ui-route-not-found';
  element.textContent = 'Page not found';
  return element;
}