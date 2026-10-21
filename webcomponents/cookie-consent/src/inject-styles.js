// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/**
 * Add a stylesheet to the document head once, in the `nodula-addons` layer so app styles can override it.
 *
 * Uses the same marker attribute as the Nodula add-ons, so a page never carries the stylesheet twice.
 *
 * @param {string} id Name of the stylesheet, used for the marker attribute.
 * @param {string} css Stylesheet text.
 */
export function injectStyles(id, css) {
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
