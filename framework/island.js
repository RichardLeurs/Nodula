import { onCleanup } from "./reactivity.js";

// The loader can be a dynamic import; it is not called until the placeholder is visible.
export function visibleIsland(loader, placeholder = "Loading section…") {
  const container = document.createElement("div");
  container.textContent = placeholder;
  let active = true;

  const load = async () => {
    try {
      const component = await loader();
      if (active) container.replaceChildren(component());
    } catch (error) {
      if (active) container.textContent = "Could not load this section.";
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
  });
  return container;
}
