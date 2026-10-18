// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import type { Child, Component, ElementProps, Slots } from "nodula-framework";

/** Options for one declared prop. An empty object declares the prop without type or validation checks. */
export interface PropOptions<T = any> {
  /** Constructor to check the value against: String, Number, Boolean, BigInt, Symbol, Function, Array, Object or a class. */
  type?: abstract new (...args: any[]) => T | Function;
  /** Warn when the caller passes undefined. Cannot be combined with `default`. */
  required?: boolean;
  /** Value used when the caller passes undefined. A function is called once per instance, except when `type` is Function. */
  default?: T | (() => T);
  /** Return false to warn about a value. Runs untracked. */
  validate?: (value: T) => boolean;
}

/** Declared props, keyed by prop name. */
export type PropSchema = Record<string, PropOptions<any>>;

/** Context passed to the render function of a component wrapped by withProps. */
export interface PropsComponentContext {
  /** Declared props only, with defaults applied. Read-only. */
  props: Record<string, unknown>;
  /** Caller props that were not declared, such as `class`, `id` or `aria-*`. Read-only. */
  attrs: Record<string, unknown>;
  children?: Child;
  slots?: Slots;
}

/**
 * Declare a component's props and make it receive the caller's other attributes.
 *
 * `props` holds only the declared names. `attrs` holds the rest, so pass it to `mergeAttrs` to put it on the root element.
 * Contract violations are logged with console.warn and never thrown.
 *
 * @throws {TypeError} For a malformed schema.
 */
export function withProps<S extends PropSchema>(
  schema: S,
  render: (context: PropsComponentContext) => Node,
): Component & { readonly propSchema: S };

/**
 * Build the props for an element that should also receive the caller's attributes.
 *
 * `class` and `style` are joined, with `own` first. Event listeners run `own` first, then the caller's. Other attributes
 * take the caller's value unless it is null or undefined. Caller `ref`, `bind` and `show` are ignored.
 *
 * @param attrs The `attrs` object from withProps. Its names are read once, when this is called.
 * @param own Props the component sets on the element.
 * @returns Props for `h()`. `own` itself when `attrs` has no keys.
 */
export function mergeAttrs(attrs: Record<string, unknown>, own?: ElementProps): ElementProps;
