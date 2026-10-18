// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

const routeComponents = {
  "/": { load: () => import("./routes/index.page") },
  "/addons": { load: () => import("./routes/addons.page") },
  "/admin": { load: () => import("./routes/admin.page") },
  "/data": { load: () => import("./routes/data.page") },
  "/navigation-dropdown": { load: () => import("./routes/navigation-dropdown.page") },
  "/sortable": { load: () => import("./routes/sortable.page") },
  "/resource": { load: () => import("./routes/resource.page") },
  "/suspense": { load: () => import("./routes/suspense.page") },
  "/dragdrop": { load: () => import("./routes/dragdrop.page") },
  "/filedrop": { load: () => import("./routes/filedrop.page") },
  "/fileupload": { load: () => import("./routes/fileupload.page") },
  "/democss": { load: () => import("./routes/democss.page") },
  "/forms": { load: () => import("./routes/forms.page") },
  "/login": { load: () => import("./routes/login.page") },
  "/modal": { load: () => import("./routes/modal.page") },
  "/web-components": { load: () => import("./routes/web-components.page") },
};

export const routes = {
  ...routeComponents,
  "/ideas/:id": {
    load: async () => {
      const [pageModule, layoutModule] = await Promise.all([
        import("./routes/ideas/[id].page"),
        import("./routes/ideas/layout.page"),
      ]);
      const page = pageModule.default;
      const layout = layoutModule.default;
      return ({ params }) => layout({ children: page({ params }) });
    },
  },
};

/**
 * Create the not-found view for unmatched routes.
 *
 * @returns {HTMLDivElement}
 */
export function notFound() {
  const element = document.createElement("div");
  element.className = "ui-route-not-found";
  element.textContent = "Page not found";
  return element;
}
