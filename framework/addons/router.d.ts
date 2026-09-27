import type { Accessor, Component } from 'nodula-framework';

export type RouteFallback = () => Node;
export type RouteModule = { default: Component };
export type RouteLoader = () => Promise<RouteModule>;
export type RouterMode = 'hash' | 'history';
export interface RouterOptions { mode?: RouterMode }
export interface Router {
  mode: RouterMode;
  current: Accessor<string>;
  view(): Node;
  navigate(path: string): void;
}

/** Create a hash router by default, or an opt-in History API router. */
export function createRouter(routes: Record<string, Component>, fallback?: RouteFallback, options?: RouterOptions): Router;
/** Discover routes and layouts from a Vite import.meta.glob result. */
export function createFileRouter(files: Record<string, unknown>, fallback?: RouteFallback, options?: RouterOptions): Router;