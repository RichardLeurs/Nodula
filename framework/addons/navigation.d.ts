import type { Accessor } from "nodula-framework";

export interface NavigationRouter {
  /** Optional history base path; internal links are prefixed with it. */
  base?: string;
  current: Accessor<string>;
  navigate(path: string): void;
  mode: "hash" | "history";
}

export interface NavigationItem {
  label: string;
  /** Internal router path, for example "/guide"; must begin with `/` unless `external` is true. */
  href: string;
  /** Treat href as an absolute HTTP(S) URL and leave it to the browser instead of the router. */
  external?: boolean;
  /** External-link browsing context. Defaults to `_blank`; `_self` opens in the current tab. */
  target?: "_blank" | "_self";
}

export interface NavigationOptions {
  label?: string;
  className?: string;
  linkClassName?: string;
  activeClassName?: string;
}

/** Create accessible router-aware navigation links in a target element. Returns a disposer. */
export function createNavigation(
  target: Element,
  router: NavigationRouter,
  items: NavigationItem[],
  options?: NavigationOptions,
): () => void;

/** @deprecated Use createNavigation. */
export const mountNavigation: typeof createNavigation;
