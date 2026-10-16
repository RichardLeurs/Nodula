import type { Accessor, Component, ComponentContext } from "nodula-framework";

export type RouteFallback = () => Node;
export type RouteModule = { default: Component };
export type RouteLoader = () => Promise<RouteModule>;
export interface LazyRoute {
  /** Load this route on first visit; resolve to a component or a module default export. */
  load: () => Promise<RouteModule | Component>;
  /** Optional context passed to the loaded route component. */
  context?: ComponentContext;
}
export type RouteDefinition = Component | LazyRoute;
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
export type RouteLoadErrorHandler = (error: unknown, context: RouteLoadErrorContext) => Node | void;
export interface RouterOptions {
  mode?: RouterMode;
  /** Run before initial route rendering and every navigation; return false to cancel or a path to redirect. */
  beforeEach?: NavigationGuard;
  /** Return an error node for a failed lazy route/page/layout load. After initial load, the router restores the last successful route. */
  onError?: RouteLoadErrorHandler;
}
export interface Router {
  mode: RouterMode;
  current: Accessor<string>;
  /** True while an asynchronous beforeEach guard is deciding navigation. */
  navigationPending: Accessor<boolean>;
  /** False until the initial guard allows the current route. */
  canRender: Accessor<boolean>;
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
