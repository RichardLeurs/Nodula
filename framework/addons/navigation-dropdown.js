/* Compose a button disclosure with Nodula's router-aware navigation links. */
import { onCleanup } from "nodula-framework";
import { createNavigation } from "nodula-framework/navigation";

let dropdownId = 0;

function registerCleanup(dispose) {
  try {
    onCleanup(dispose);
  } catch {
    // Call the returned disposer when used outside a Nodula owner.
  }
}

/** Create a keyboard-operable navigation disclosure that composes createNavigation. */
export function createNavigationDropdown(target, router, items, options = {}) {
  if (!target || target.nodeType !== 1)
    throw new TypeError("createNavigationDropdown expects a target element.");
  if (
    !router ||
    typeof router.current !== "function" ||
    typeof router.navigate !== "function" ||
    !["hash", "history"].includes(router.mode)
  ) {
    throw new TypeError("createNavigationDropdown expects a Nodula router.");
  }
  if (!Array.isArray(items))
    throw new TypeError("createNavigationDropdown items must be an array.");

  const {
    label = "More",
    navLabel = label,
    className = "",
    buttonClassName = "",
    panelClassName = "",
    linkClassName = "",
    activeClassName = "is-active",
  } = options;
  if (
    [
      label,
      navLabel,
      className,
      buttonClassName,
      panelClassName,
      linkClassName,
      activeClassName,
    ].some((value) => typeof value !== "string")
  ) {
    throw new TypeError("createNavigationDropdown labels and class names must be strings.");
  }

  const wrapper = document.createElement("div");
  wrapper.className = className;
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-expanded", "false");
  if (buttonClassName) button.classList.add(...buttonClassName.split(/\s+/).filter(Boolean));

  const panel = document.createElement("div");
  const panelId = `nodula-navigation-dropdown-${++dropdownId}`;
  panel.id = panelId;
  panel.hidden = true;
  if (panelClassName) panel.classList.add(...panelClassName.split(/\s+/).filter(Boolean));
  button.setAttribute("aria-controls", panelId);
  wrapper.append(button, panel);

  let isOpen = false;
  let disposed = false;
  const disposeNavigation = createNavigation(panel, router, items, {
    label: navLabel,
    linkClassName,
    activeClassName,
  });
  target.append(wrapper);

  function setOpen(open, { returnFocus = false } = {}) {
    isOpen = open;
    button.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
    if (returnFocus) button.focus();
  }

  function handleButtonClick() {
    setOpen(!isOpen);
  }

  function handleButtonKeydown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      panel.querySelector("a")?.focus();
    }
  }

  function handleDocumentKeydown(event) {
    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setOpen(false, { returnFocus: true });
    }
  }

  function handleClick(event) {
    const clickedLink = event.target?.closest?.("a");
    if (clickedLink && panel.contains(clickedLink)) setOpen(false);
    else if (!wrapper.contains(event.target)) setOpen(false);
  }

  button.addEventListener("click", handleButtonClick);
  button.addEventListener("keydown", handleButtonKeydown);
  panel.addEventListener("click", handleClick);
  document.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleDocumentKeydown);

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    button.removeEventListener("click", handleButtonClick);
    button.removeEventListener("keydown", handleButtonKeydown);
    panel.removeEventListener("click", handleClick);
    document.removeEventListener("click", handleClick);
    document.removeEventListener("keydown", handleDocumentKeydown);
    disposeNavigation();
    wrapper.remove();
  };
  registerCleanup(dispose);
  return dispose;
}
