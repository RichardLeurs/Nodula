// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

// Used in :
// - framework/addons/cookieconsent.js
// - framework/addons/dialog.js
// - framework/addons/drawer.js
// - framework/addons/filedrop.js
// - framework/addons/modal.js
// - framework/addons/notification.js
// - framework/addons/sortable.js

/* Internally inject each add-on stylesheet once into the shared style layer. */
/** Add an add-on stylesheet once, in a layer that app styles can override. */
export function injectAddonStyles(id, css) {
  if (
    typeof document === "undefined" ||
    !document.head ||
    document.querySelector(`style[data-nodula-${id}-styles]`)
  )
    return;

  const style = document.createElement("style");
  style.setAttribute(`data-nodula-${id}-styles`, "");
  style.textContent = `@layer nodula-addons {\n${css}\n}`;
  document.head.append(style);
}
