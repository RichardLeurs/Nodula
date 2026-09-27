import type { Accessor, Component } from 'nodula-framework';

export type RouteFallback = () => Node;
export type RouteModule = { default: Component };
export type RouteLoader = () => Promise<RouteModule>;
export type RouterMode = 'hash' | 'history';
export type NavigationGuardResult = true | false | string | void;
export interface NavigationGuardContext { to: string; from: string }
export type NavigationGuard = (context: NavigationGuardContext) => NavigationGuardResult | Promise<NavigationGuardResult>;
export interface RouterOptions {
  mode?: RouterMode;
  /** Run before initial route rendering and every navigation; return false to cancel or a path to redirect. */
  beforeEach?: NavigationGuard;
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
export function createRouter(routes: Record<string, Component>, fallback?: RouteFallback, options?: RouterOptions): Router;
/** Discover routes and layouts from a Vite import.meta.glob result. */
export function createFileRouter(files: Record<string, unknown>, fallback?: RouteFallback, options?: RouterOptions): Router;