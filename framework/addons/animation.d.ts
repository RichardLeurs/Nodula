export type AnimationPhase =
  | Keyframe[]
  | {
      keyframes: Keyframe[];
      options?: KeyframeAnimationOptions;
    };

export interface AnimateOptions extends KeyframeAnimationOptions {
  /** Skip motion when the user requests reduced motion. Defaults to true. */
  respectReducedMotion?: boolean;
}

export interface TransitionOptions {
  enter?: AnimationPhase;
  leave?: AnimationPhase;
  options?: AnimateOptions;
  /** Remove the element after its leave animation completes. */
  removeOnLeave?: boolean;
}

export type LifecycleTransitionType = "page" | "conditional" | "list";
export interface LifecycleTransitionPhases {
  enter?: AnimationPhase;
  leave?: AnimationPhase;
}
export interface LifecycleTransitionOptions {
  phases?: Partial<Record<LifecycleTransitionType, LifecycleTransitionPhases>>;
  options?: AnimateOptions;
}

/** Play a Web Animation, canceling an earlier Nodula animation on this element. */
export function animate(
  element: Element,
  keyframes: Keyframe[],
  options?: AnimateOptions,
): Animation | null;
/** Create enter/leave methods for an element, with optional removal after leave. */
export function createTransition(
  element: Element,
  options?: TransitionOptions,
): {
  enter(): Animation | null;
  leave(): Promise<boolean>;
  cancel(): void;
};
/** Enable optional page, @if, and keyed @for lifecycle transitions; returns an unregister function. */
export function enableLifecycleTransitions(options?: LifecycleTransitionOptions): () => void;
