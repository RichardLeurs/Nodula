/* Provide Web Animations helpers and opt-in Nodula lifecycle transitions. */
import { onCleanup, registerLifecycleTransition } from "nodula-framework";

const activeAnimations = new WeakMap();

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Play a Web Animations API animation and cancel any previous Nodula animation on the same element. */
function startAnimation(element, keyframes, options, owned) {
  if (!element || typeof element.animate !== "function") return null;
  if (options.respectReducedMotion !== false && prefersReducedMotion()) return null;

  activeAnimations.get(element)?.cancel();
  const { respectReducedMotion: _respectReducedMotion = true, ...animationOptions } = options;
  const animation = element.animate(keyframes, animationOptions);
  activeAnimations.set(element, animation);

  const clearActiveAnimation = () => {
    if (activeAnimations.get(element) === animation) activeAnimations.delete(element);
  };
  animation.finished.then(clearActiveAnimation, clearActiveAnimation);
  if (owned) {
    try {
      onCleanup(() => {
        if (activeAnimations.get(element) === animation) {
          activeAnimations.delete(element);
          animation.cancel();
        }
      });
    } catch {
      // Animations may be used outside an owned Nodula root; callers can always cancel the returned Animation.
    }
  }

  return animation;
}

/** Play a Web Animations API animation and cancel any previous Nodula animation on the same element. */
export function animate(element, keyframes, options = {}) {
  return startAnimation(element, keyframes, options, true);
}

/** Create explicit enter/leave animation methods for an element. */
export function createTransition(
  element,
  { enter, leave, options = {}, removeOnLeave = false } = {},
) {
  let currentAnimation = null;

  function play(phase) {
    if (!phase) return null;
    const config = Array.isArray(phase) ? { keyframes: phase } : phase;
    currentAnimation = animate(element, config.keyframes, { ...options, ...config.options });
    return currentAnimation;
  }

  async function leaveElement() {
    const animation = play(leave);
    if (!animation) {
      if (removeOnLeave) element.remove();
      return false;
    }

    try {
      await animation.finished;
      if (removeOnLeave && currentAnimation === animation) element.remove();
      return true;
    } catch {
      return false;
    }
  }

  return {
    enter: () => play(enter),
    leave: leaveElement,
    cancel() {
      currentAnimation?.cancel();
      currentAnimation = null;
    },
  };
}

const defaultLifecyclePhases = {
  page: {
    enter: [
      { opacity: 0, transform: "translateY(8px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    leave: [
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: "translateY(-4px)" },
    ],
  },
  conditional: {
    enter: [
      { opacity: 0, transform: "translateY(4px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    leave: [
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: "translateY(-2px)" },
    ],
  },
  list: {
    enter: [
      { opacity: 0, transform: "translateX(-6px)" },
      { opacity: 1, transform: "translateX(0)" },
    ],
    leave: [
      { opacity: 1, transform: "translateX(0)" },
      { opacity: 0, transform: "translateX(6px)" },
    ],
  },
};

/** Enable page, @if, and keyed @for lifecycle transitions for the current Nodula owner. */
export function enableLifecycleTransitions({ phases = {}, options = {} } = {}) {
  const unregister = registerLifecycleTransition((phase, elements, details) => {
    const lifecycle = phases[details.type] ?? defaultLifecyclePhases[details.type];
    const keyframes = lifecycle?.[phase];
    if (!keyframes) return;
    const animations = elements
      .map((element) =>
        startAnimation(
          element,
          keyframes,
          { duration: 180, easing: "ease-out", fill: "both", ...options },
          false,
        ),
      )
      .filter(Boolean);
    return Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
  });
  try {
    onCleanup(unregister);
  } catch {
    // Call the returned disposer when enabling transitions outside a Nodula owner.
  }
  return unregister;
}
