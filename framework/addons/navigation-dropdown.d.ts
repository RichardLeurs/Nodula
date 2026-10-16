import type { NavigationItem, NavigationRouter } from "nodula-framework/navigation";

export interface NavigationDropdownOptions {
  /** Visible text and accessible name for the disclosure button. Defaults to "More". */
  label?: string;
  /** Accessible label for the generated submenu navigation landmark. Defaults to `label`. */
  navLabel?: string;
  /** Class names applied to the wrapper, disclosure button, and panel. */
  className?: string;
  buttonClassName?: string;
  panelClassName?: string;
  /** Class names passed to the composed createNavigation helper. */
  linkClassName?: string;
  activeClassName?: string;
}

/** Create a button disclosure containing router-aware navigation links. Returns an idempotent disposer. */
export function createNavigationDropdown(
  target: Element,
  router: NavigationRouter,
  items: NavigationItem[],
  options?: NavigationDropdownOptions,
): () => void;
