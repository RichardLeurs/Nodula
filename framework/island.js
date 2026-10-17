// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { createRoot, onCleanup } from "./reactivity.js";

// The loader can be a dynamic import; it is not called until the placeholder is visible.
/**
 * Defer rendering a component until its placeholder scrolls into view.
 *
 * The loader runs the first time the placeholder intersects the viewport, or immediately where
 * IntersectionObserver is unavailable. Until then the placeholder text is shown. If the loader
 * fails, the error text replaces it and the error is logged with console.error.
 *
 * @param {() => Promise<Function>} loader Resolves to a component function.
 * @param {string} [placeholder] Text shown while waiting. Defaults to the English loading text.
 * @param {{ errorText?: string }} [options] Text shown when the loader fails. Must be a non-empty string.
 * @returns {HTMLDivElement} The placeholder element. Disposing its owner stops observation and disposes the component.
 * @throws {TypeError} If `errorText` is not a non-empty string.
 */
export function visibleIsland(loader, placeholder, { errorText } = {}) {
  if (errorText !== undefined && (typeof errorText !== "string" || !errorText.trim()))
    throw new TypeError("visibleIsland errorText must be a non-empty string.");
  const container = document.createElement("div");
  container.textContent = placeholder ?? "Loading section…";
  // Only the framework's own placeholder text carries a code; an app-supplied placeholder is the app's text.
  if (placeholder === undefined) container.dataset.nodulaCode = "nodula-island-loading";
  let active = true;
  let disposeComponent = null;

  /**
   * Run the loader and mount its component into the placeholder. Does nothing after disposal.
   */
  const load = async () => {
    try {
      const component = await loader();
      if (!active) return;
      delete container.dataset.nodulaCode;
      // The async callback has no owner, so give the component its own root for h() cleanups.
      const [node, dispose] = createRoot(() => component(), { detached: true });
      disposeComponent = dispose;
      container.replaceChildren(node);
    } catch (error) {
      if (active) {
        // The code stays on the element even when the app supplies its own text.
        container.textContent = errorText ?? "Could not load this section.";
        container.dataset.nodulaCode = "nodula-island-load-failed";
      }
      console.error(error);
    }
  };

  if (typeof IntersectionObserver === "undefined") {
    void load();
  } else {
    const intersectionObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        intersectionObserver.disconnect();
        void load();
      }
    });
    intersectionObserver.observe(container);
    onCleanup(() => intersectionObserver.disconnect());
  }

  onCleanup(() => {
    active = false;
    disposeComponent?.();
  });
  return container;
}
