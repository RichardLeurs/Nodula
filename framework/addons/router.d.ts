import type { Accessor, ComponentContext } from "nodula-framework";

export type RouteFallback = () => Node;
/** Route components always receive decoded `params` from `:name`, `*name`, `[name]` or `[...name]` segments. */
export interface RouteContext extends ComponentContext {
  params: Record<string, string>;
}
export type RouteComponent = (context: RouteContext) => Node;
export type RouteModule = { default: RouteComponent };
export type RouteLoader = () => Promise<RouteModule>;
export interface LazyRoute {
  /** Load this route on first visit; resolve to a component or a module default export. */
  load: () => Promise<RouteModule | RouteComponent>;
  /** Optional context passed to the loaded route component. */
  context?: ComponentContext;
}
export type RouteDefinition = RouteComponent | LazyRoute;
export type RouterMode = "hash" | "history";
export type NavigationGuardResult = true | false | string | void;
export interface NavigationGuardContext {
  to: string;
  from: string;
}
export type NavigationGuard = (
  context: NavigationGuardContext,
) => NavigationGuardResult | Promise<NavigationGuardResult>;
export interface RouteLoadErrorContext {
  to: string;
  from?: string;
  file?: string;
}
export interface RouteLoadError {
  error: unknown;
  context: RouteLoadErrorContext;
}
export type RouteLoadErrorHandler = (error: unknown, context: RouteLoadErrorContext) => Node | void;
export interface RouterOptions {
  mode?: RouterMode;
  /** History mode only: serve the app under this path prefix, e.g. "/app". Route paths stay app-relative. */
  base?: string;
  /** Run before initial route rendering and every navigation; return false to cancel or a path to redirect. */
  beforeEach?: NavigationGuard;
  /** Return an error node for a failed lazy route/page/layout load. After initial load, the router restores the last successful route. */
  onError?: RouteLoadErrorHandler;
  /** Text for the framework's own router messages. Each key is optional; defaults are English. */
  labels?: RouterLabels;
}
export interface RouterLabels {
  /** Shown while a navigation guard is deciding. */
  checking?: string;
  /** Shown when a guard cancels the initial route. */
  navigationBlocked?: string;
  /** Shown when a lazy route fails to load. */
  loadFailed?: string;
  /** Shown by the default not-found view. A custom fallback replaces it entirely. */
  notFound?: string;
}
export interface Router {
  mode: RouterMode;
  /** Normalized base path without a trailing slash; "" when the app is served from the root. */
  base: string;
  current: Accessor<string>;
  /** True while an asynchronous beforeEach guard is deciding navigation. */
  navigationPending: Accessor<boolean>;
  /** False until the initial guard allows the current route. */
  canRender: Accessor<boolean>;
  /** The active lazy route load failure; cleared by the next navigation. */
  loadError: Accessor<RouteLoadError | null>;
  view(): Node;
  navigate(path: string): void;
}

/** Create a hash router by default, or an opt-in History API router. */
export function createRouter(
  routes: Record<string, RouteDefinition>,
  fallback?: RouteFallback,
  options?: RouterOptions,
): Router;
/** Discover routes and layouts from a Vite import.meta.glob result. */
export function createFileRouter(
  files: Record<string, unknown>,
  fallback?: RouteFallback,
  options?: RouterOptions,
): Router;
