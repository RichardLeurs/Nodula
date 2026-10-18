// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import type { Component } from "nodula-framework";

/** Defer loading a component until its placeholder becomes visible. */
export interface VisibleIslandOptions {
  /** Text shown when the loader fails. Defaults to English; the element keeps code "nodula-island-load-failed". */
  errorText?: string;
}

/**
 * Defer rendering a component until its placeholder scrolls into view.
 *
 * The loader runs the first time the placeholder intersects the viewport, or immediately where
 * IntersectionObserver is unavailable.
 */
export function visibleIsland(
  loader: () => Promise<Component>,
  placeholder?: string,
  options?: VisibleIslandOptions,
): HTMLDivElement;
