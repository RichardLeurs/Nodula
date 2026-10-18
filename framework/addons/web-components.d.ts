// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import type { Child, Slots } from "nodula-framework";

/** A prop type used to convert attribute text, such as `Number` for `count="3"`. */
export type CustomElementPropType =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ObjectConstructor
  | ArrayConstructor;

/** Options for one object-form prop. */
export interface CustomElementPropOptions {
  /** Converts attribute text: Number, Boolean (present means true), or Object/Array (parsed as JSON). Default: text. */
  type?: CustomElementPropType;
  /** Writes the prop back to its attribute when it is set as a property. Default: false. */
  reflect?: boolean;
  /** Attribute name, lowercase. Default: the kebab-case of the prop name. `false` keeps the prop property-only. */
  attribute?: string | false;
}

/** The form control that a form-associated element injects into its `props` as `formControl`. */
export interface CustomElementFormControl {
  /** The native ElementInternals of the element, for `setFormValue` and `setValidity`. */
  internals: ElementInternals;
  /** Reads whether the element is disabled, including through a disabled fieldset. */
  disabled(): boolean;
  /** Runs `fn` when the owning form resets. Removed when the component is disposed. Call it inside the render. */
  onReset(fn: () => void): void;
  /** Runs `fn` with restored form state. Removed when the component is disposed. Call it inside the render. */
  onRestore(
    fn: (state: File | string | FormData | null, mode: "restore" | "autocomplete") => void,
  ): void;
}

export interface CustomElementOptions {
  /**
   * Props, as attribute-backed names or as an object of types and options.
   * An array keeps the original behaviour: each prop reflects and values are not converted.
   */
  props?: string[] | Record<string, CustomElementPropType | CustomElementPropOptions>;
  /** Component callbacks exposed as bubbling, composed custom events. */
  events?: string[];
  /** Render into a shadow root (default: open), or the host when false. */
  shadow?: "open" | "closed" | false;
  /** Make the element participate in its form's submission, reset and validation (default: false). */
  formAssociated?: boolean;
}

export interface CustomElementComponentContext {
  props: Record<string, unknown> & { formControl?: CustomElementFormControl };
  children?: Child;
  slots?: Slots;
}

export type CustomElementComponent = (context: CustomElementComponentContext) => Node;

/** Register a Nodula component as a custom element; disconnect disposes its reactive root. */
export function defineCustomElement(
  name: string,
  render: CustomElementComponent,
  options?: CustomElementOptions,
): CustomElementConstructor;

export interface NodulaAPI {
  /** Load a global stylesheet URL once and return its link element. */
  css(href: string): HTMLLinkElement;
  /** Register a Nodula component as a custom element. Same function as the standalone `defineCustomElement`. */
  defineCustomElement: typeof defineCustomElement;
}

/** Stylesheet and custom element helpers, kept outside the core runtime. */
export const Nodula: Readonly<NodulaAPI>;
