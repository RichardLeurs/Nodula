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

function assertElement(element, name) {
  if (!element || element.nodeType !== 1 || typeof element.addEventListener !== "function") {
    throw new TypeError(`${name} expects a DOM element.`);
  }
}

function assertCallback(callback, name) {
  if (callback !== undefined && typeof callback !== "function") {
    throw new TypeError(`${name} must be a function.`);
  }
}

function registerCleanup(dispose) {
  try {
    onCleanup(dispose);
  } catch {
    // Call the returned disposer when used outside a Nodula owner.
  }
}

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
  const handleDragStart = (event) => {
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer) return;

    const data = getData(event);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new TypeError("createDragSource getData must return an object of string values.");
    }
    for (const [type, value] of Object.entries(data)) {
      if (!type.trim() || typeof value !== "string") {
        throw new TypeError(
          "createDragSource getData must return non-empty types and string values.",
        );
      }
      dataTransfer.setData(type, value);
    }
    dataTransfer.effectAllowed = effectAllowed;
    const dragImage = getDragImage?.(event);
    if (dragImage !== undefined && dragImage !== null) {
      if (
        !dragImage.element ||
        dragImage.element.nodeType !== 1 ||
        !Number.isFinite(dragImage.x ?? 0) ||
        !Number.isFinite(dragImage.y ?? 0)
      ) {
        throw new TypeError(
          "createDragSource getDragImage must return an element and finite offsets, or null.",
        );
      }
      dataTransfer.setDragImage?.(dragImage.element, dragImage.x ?? 0, dragImage.y ?? 0);
    }
    onDragStart?.(event);
  };
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
  const acceptsEvent = (event) =>
    Array.from(event.dataTransfer?.types ?? []).some((type) =>
      acceptedTypes.has(type.toLowerCase()),
    );
  const handleDragEnter = (event) => {
    if (!acceptsEvent(event)) return;
    event.preventDefault();
    onDragEnter?.(event);
  };
  const handleDragOver = (event) => {
    if (!acceptsEvent(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = dropEffect;
    onDragOver?.(event);
  };
  const handleDragLeave = (event) => {
    if (event.relatedTarget && element.contains(event.relatedTarget)) return;
    onDragLeave?.(event);
  };
  const handleDrop = (event) => {
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
