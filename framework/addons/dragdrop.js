// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Wrap native HTML drag-and-drop events with Nodula owner cleanup. */
import { onCleanup } from "nodula-framework";

const effectAllowedValues = new Set([
  "none",
  "copy",
  "copyLink",
  "copyMove",
  "link",
  "linkMove",
  "move",
  "all",
]);
const dropEffectValues = new Set(["copy", "link", "move"]);

/**
 * Throw a TypeError unless `element` is a DOM element.
 *
 * @param {unknown} element
 * @param {string} name Caller name, used in the message.
 */
function assertElement(element, name) {
  if (!element || element.nodeType !== 1 || typeof element.addEventListener !== "function") {
    throw new TypeError(`${name} expects a DOM element.`);
  }
}

/**
 * Throw a TypeError unless `callback` is undefined or a function.
 *
 * @param {unknown} callback
 * @param {string} name Option name, used in the message.
 */
function assertCallback(callback, name) {
  if (callback !== undefined && typeof callback !== "function") {
    throw new TypeError(`${name} must be a function.`);
  }
}

/**
 * Register a dispose function with the current owner. Outside an owner the caller must call it.
 *
 * @param {() => void} dispose
 */
function registerCleanup(dispose) {
  try {
    onCleanup(dispose);
  } catch {
    // Call the returned disposer when used outside a Nodula owner.
  }
}

/**
 * Wrap a cleanup so it runs once, however many times the returned function is called.
 *
 * @param {() => void} cleanup
 * @returns {() => void}
 */
function createDisposer(cleanup) {
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    cleanup();
  };
}

/** Make an element a native drag source. Data is written during dragstart only. */
export function createDragSource(
  element,
  { getData, getDragImage, effectAllowed = "move", onDragStart, onDragEnd } = {},
) {
  assertElement(element, "createDragSource");
  if (typeof getData !== "function")
    throw new TypeError("createDragSource getData must be a function.");
  assertCallback(getDragImage, "createDragSource getDragImage");
  if (!effectAllowedValues.has(effectAllowed))
    throw new TypeError("createDragSource effectAllowed is invalid.");
  assertCallback(onDragStart, "createDragSource onDragStart");
  assertCallback(onDragEnd, "createDragSource onDragEnd");

  const previousDraggable = element.getAttribute("draggable");
  /**
   * Write the validated data and drag image to the drag event, then call `onDragStart`.
   *
   * If anything fails, the drag is cancelled before any data is written.
   *
   * @param {DragEvent} event
   */
  const handleDragStart = (event) => {
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer) return;

    try {
      const data = getData(event);
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new TypeError("createDragSource getData must return an object of string values.");
      }
      const entries = Object.entries(data);
      if (entries.some(([type, value]) => !type.trim() || typeof value !== "string")) {
        throw new TypeError(
          "createDragSource getData must return non-empty types and string values.",
        );
      }
      const dragImage = getDragImage?.(event);
      const hasDragImage = dragImage !== undefined && dragImage !== null;
      if (
        hasDragImage &&
        (!dragImage.element ||
          dragImage.element.nodeType !== 1 ||
          !Number.isFinite(dragImage.x ?? 0) ||
          !Number.isFinite(dragImage.y ?? 0))
      ) {
        throw new TypeError(
          "createDragSource getDragImage must return an element and finite offsets, or null.",
        );
      }
      // Write only after everything validated, so a failure never leaves partial data.
      for (const [type, value] of entries) dataTransfer.setData(type, value);
      dataTransfer.effectAllowed = effectAllowed;
      if (hasDragImage)
        dataTransfer.setDragImage?.(dragImage.element, dragImage.x ?? 0, dragImage.y ?? 0);
      onDragStart?.(event);
    } catch (error) {
      // Cancel the drag; otherwise the browser drags an element with missing data.
      event.preventDefault();
      throw error;
    }
  };
  /**
   * Forward the drag end to `onDragEnd`.
   */
  const handleDragEnd = (event) => onDragEnd?.(event);

  element.setAttribute("draggable", "true");
  element.addEventListener("dragstart", handleDragStart);
  element.addEventListener("dragend", handleDragEnd);

  const dispose = createDisposer(() => {
    element.removeEventListener("dragstart", handleDragStart);
    element.removeEventListener("dragend", handleDragEnd);
    if (previousDraggable === null) element.removeAttribute("draggable");
    else element.setAttribute("draggable", previousDraggable);
  });
  registerCleanup(dispose);
  return dispose;
}

/** Configure a native drop target; accepted drops remain application-owned. */
export function createDropTarget(
  element,
  { accepts, dropEffect = "move", onDragEnter, onDragLeave, onDragOver, onDrop } = {},
) {
  assertElement(element, "createDropTarget");
  if (
    !Array.isArray(accepts) ||
    accepts.length === 0 ||
    accepts.some((type) => typeof type !== "string" || !type.trim())
  ) {
    throw new TypeError("createDropTarget accepts must be a non-empty array of data types.");
  }
  if (!dropEffectValues.has(dropEffect))
    throw new TypeError("createDropTarget dropEffect is invalid.");
  assertCallback(onDragEnter, "createDropTarget onDragEnter");
  assertCallback(onDragLeave, "createDropTarget onDragLeave");
  assertCallback(onDragOver, "createDropTarget onDragOver");
  assertCallback(onDrop, "createDropTarget onDrop");

  const acceptedTypes = new Set(accepts.map((type) => type.toLowerCase()));
  /**
   * Whether the drag carries at least one accepted data type.
   *
   * @param {DragEvent} event
   * @returns {boolean}
   */
  const acceptsEvent = (event) =>
    Array.from(event.dataTransfer?.types ?? []).some((type) =>
      acceptedTypes.has(type.toLowerCase()),
    );
  // Moving over children fires dragenter on the child before dragleave on the parent, and
  // browsers often report relatedTarget null; counting nesting depth avoids leave/enter flicker.
  let depth = 0;
  /**
   * Count an entry into the target or its descendants, and report the first one.
   *
   * @param {DragEvent} event
   */
  const handleDragEnter = (event) => {
    if (!acceptsEvent(event)) return;
    event.preventDefault();
    depth += 1;
    if (depth === 1) onDragEnter?.(event);
  };
  /**
   * Accept an accepted drag so the browser allows the drop.
   *
   * @param {DragEvent} event
   */
  const handleDragOver = (event) => {
    if (!acceptsEvent(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = dropEffect;
    onDragOver?.(event);
  };
  /**
   * Count a leave from the target or its descendants, and report when the drag has left them all.
   *
   * @param {DragEvent} event
   */
  const handleDragLeave = (event) => {
    if (!depth) return;
    depth -= 1;
    if (!depth) onDragLeave?.(event);
  };
  /**
   * Accept the drop, reset the drag state and call `onDrop`.
   *
   * @param {DragEvent} event
   */
  const handleDrop = (event) => {
    // A drop ends the drag without a dragleave.
    depth = 0;
    if (!acceptsEvent(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = dropEffect;
    onDrop?.(event, event.dataTransfer);
  };

  element.addEventListener("dragenter", handleDragEnter);
  element.addEventListener("dragover", handleDragOver);
  element.addEventListener("dragleave", handleDragLeave);
  element.addEventListener("drop", handleDrop);

  const dispose = createDisposer(() => {
    element.removeEventListener("dragenter", handleDragEnter);
    element.removeEventListener("dragover", handleDragOver);
    element.removeEventListener("dragleave", handleDragLeave);
    element.removeEventListener("drop", handleDrop);
  });
  registerCleanup(dispose);
  return dispose;
}
