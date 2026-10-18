/** A reactive reader that tracks its dependencies when called in an effect. */
export type Accessor<T> = () => T;
export type MaybeAccessor<T> = T | Accessor<T>;
/** A signal writer. Passing a function applies it to the current value. */
export type Setter<T> = (value: T | ((current: T) => T)) => T;
export type Signal<T> = [read: Accessor<T>, write: Setter<T>];
export type Cleanup = () => void;
export type Effect = () => void;

export type Dispose = () => void;

export interface RootOptions {
  detached?: boolean;
}

export interface NodulaEventProps {
  onClick?: (event: MouseEvent) => void;
  onDblclick?: (event: MouseEvent) => void;
  onInput?: (event: InputEvent) => void;
  onChange?: (event: Event) => void;
  onSubmit?: (event: SubmitEvent) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
  onKeydown?: (event: KeyboardEvent) => void;
  onKeyup?: (event: KeyboardEvent) => void;
  onPointerdown?: (event: PointerEvent) => void;
  onPointerup?: (event: PointerEvent) => void;
  onMouseenter?: (event: MouseEvent) => void;
  onMouseleave?: (event: MouseEvent) => void;
}

export interface ElementProps extends NodulaEventProps {
  class?: MaybeAccessor<string>;
  className?: MaybeAccessor<string>;
  id?: MaybeAccessor<string>;
  title?: MaybeAccessor<string>;
  role?: MaybeAccessor<string>;
  href?: MaybeAccessor<string>;
  target?: string;
  rel?: string;
  type?: string;
  name?: string;
  value?: MaybeAccessor<string | number>;
  checked?: MaybeAccessor<boolean>;
  disabled?: MaybeAccessor<boolean>;
  placeholder?: MaybeAccessor<string>;
  htmlFor?: string;
  tabIndex?: number;
  style?: string | Partial<CSSStyleDeclaration> | Accessor<Partial<CSSStyleDeclaration>>;
  ref?: (element: Element | null) => void;
  show?: boolean | Accessor<boolean>;
  bind?:
    | { property: "value"; read: Accessor<string>; write: (value: string) => unknown }
    | { property: "checked"; read: Accessor<boolean>; write: (value: boolean) => unknown };
  [ariaOrData: `aria-${string}` | `data-${string}`]: string | number | boolean | undefined;
}

export interface RenderDescriptor {
  readonly __nodulaRenderDescriptor?: unique symbol;
}
export type Child =
  | Node
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | RenderDescriptor
  | Accessor<unknown>
  | Child[];
export type Slots = Record<string, Child | (() => Child)>;
export interface ComponentContext<P extends Record<string, string> = Record<string, string>> {
  params?: P;
  props?: Record<string, unknown>;
  /** Caller props that a component with a prop schema did not declare. Set by withProps from nodula-framework/props. */
  attrs?: Record<string, unknown>;
  children?: Child;
  slots?: Slots;
}
export type Component<P extends Record<string, string> = Record<string, string>> = (
  context?: ComponentContext<P>,
) => Node;
export interface CustomElementProps extends ElementProps {
  [property: string]: unknown;
  [event: `on:${string}`]: (event: CustomEvent) => unknown;
}
export function component<P extends Record<string, unknown>>(
  render: Component,
  readProps: Accessor<P>,
  slots?: Slots,
): RenderDescriptor;
export type Key = string | number | symbol | bigint;

/** Create a reactive getter/setter pair. */
export function signal<T>(initialValue: T): Signal<T>;
export function signal<T = undefined>(): Signal<T | undefined>;
/** Create an effect-backed read-only accessor. */
export function computed<T>(fn: Accessor<T>): Accessor<T>;
/** Run immediately and again when tracked signal or store properties change. */
export function effect(fn: Effect): Dispose;
/** Create an ownership scope and return its result and disposer. */
export function createRoot<T>(fn: () => T, options?: RootOptions): [value: T, dispose: Dispose];
/** Register cleanup with the current root or effect execution. */
export function onCleanup(fn: Cleanup): void;
/** Run once after the current reactive scope has completed its synchronous mount. */
export function onMount(fn: () => void): void;
/** Run when the current reactive scope is disposed. */
export function onUnmount(fn: Cleanup): void;
/** Batch reactive notifications until the callback completes. */
export function batch<T>(fn: () => T): T;
/** Run a function without tracking the signals it reads, so the enclosing effect does not re-run for them. */
export function untrack<T>(fn: () => T): T;

/** Create a native element. Function children and function-valued props are reactive. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: ElementProps | null,
  ...children: Child[]
): HTMLElementTagNameMap[K];
export function h(
  tag: `${string}-${string}`,
  props?: CustomElementProps | null,
  ...children: Child[]
): HTMLElement;
export function h(tag: string, props?: ElementProps | null, ...children: Child[]): HTMLElement;
/** Create a DOM fragment. */
export function fragment(...children: Child[]): DocumentFragment;
/**
 * Render content inside an error boundary. If the content throws while it is created, the error is logged and
 * `fallback(error)` renders instead. Catches creation-time errors only, not later reactive updates.
 */
export function errorBoundary(render: () => Child, fallback: (error: unknown) => Child): Node;
/** Mount a component result into a selector or element, returning its disposer. */
export function mount(target: string | Element, component: Component | (() => Node)): Dispose;
/** Create a keyed list container. */
export function list<T>(
  items: Accessor<readonly T[]>,
  key: (item: T, index: number) => Key,
  render: (item: T, index: number) => Node,
): HTMLDivElement;
/** Create the keyed row descriptor used by template loops. */
export function each<T>(
  items: Accessor<readonly T[]>,
  key: (item: T) => Key,
  render: (item: Accessor<T>) => Node,
): RenderDescriptor;
/** Create a conditional branch descriptor. Only the active branch is mounted. */
export function when(
  condition: Accessor<unknown>,
  yes: () => Child,
  no?: () => Child,
): RenderDescriptor;
/** Resolve a named or default slot with fallback content. */
export function slot(
  slots: Slots | undefined,
  name: string,
  fallback: () => Child,
): RenderDescriptor;
/** Mark a rendered route view so optional lifecycle add-ons can animate page changes. */
export function outlet(view: Accessor<Child>): RenderDescriptor;
/** @internal Register an optional add-on lifecycle hook. */
export function registerLifecycleTransition(
  transition: (
    phase: "enter" | "leave",
    elements: Element[],
    details: { type: "page" | "conditional" | "list"; key?: Key },
  ) => void | Promise<void>,
): Dispose;
