/* Add native vertical list sorting with application-owned item state. */
import { onCleanup } from "nodula-framework";

const transferType = "application/x-nodula-sortable-item";
const rowSelector = ":scope > [data-sortable-id]";
const markerClass = "nodula-sortable-insertion-marker";

function assertElement(element) {
  if (!element || element.nodeType !== 1 || typeof element.addEventListener !== "function") {
    throw new TypeError("createSortableList expects a DOM list element.");
  }
  if (!["OL", "UL"].includes(element.tagName)) {
    throw new TypeError("createSortableList expects an <ol> or <ul> element.");
  }
}

function getRows(list) {
  const rows = Array.from(list.querySelectorAll(rowSelector));
  const ids = rows.map((row) => row.dataset.sortableId);
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    throw new TypeError("Sortable list rows must have unique, non-empty data-sortable-id values.");
  }
  return rows;
}

function registerCleanup(dispose) {
  try {
    onCleanup(dispose);
  } catch {
    // Call the returned disposer when used outside a Nodula owner.
  }
}

/** Attach native vertical sorting and Move Up/Down handling to an existing list. */
export function createSortableList(list, { onReorder } = {}) {
  assertElement(list);
  if (typeof onReorder !== "function")
    throw new TypeError("createSortableList onReorder must be a function.");
  getRows(list);
  const originalDraggable = new Map();
  const originalButtonDisabled = new Map();
  const Observer = list.ownerDocument.defaultView?.MutationObserver;
  let draggedId = null;
  let marker = null;
  let disposed = false;
  let observer = null;

  function rows() {
    const current = getRows(list);
    for (const row of current) {
      if (!originalDraggable.has(row)) originalDraggable.set(row, row.getAttribute("draggable"));
      row.setAttribute("draggable", "true");
      for (const button of row.querySelectorAll("[data-sortable-up], [data-sortable-down]")) {
        if (!originalButtonDisabled.has(button))
          originalButtonDisabled.set(button, button.disabled);
      }
    }
    updateButtons(current);
    return current;
  }

  function updateButtons(currentRows) {
    currentRows.forEach((row, index) => {
      for (const button of row.querySelectorAll("[data-sortable-up], [data-sortable-down]")) {
        if (button.hasAttribute("data-sortable-up")) button.disabled = index === 0;
        if (button.hasAttribute("data-sortable-down"))
          button.disabled = index === currentRows.length - 1;
      }
    });
  }

  function clearMarker() {
    marker?.remove();
    marker = null;
  }

  function createMarker() {
    if (marker) return marker;
    marker = document.createElement("li");
    marker.className = markerClass;
    marker.setAttribute("aria-hidden", "true");
    marker.setAttribute("role", "presentation");
    marker.style.cssText =
      "box-sizing:border-box;list-style:none;height:0;border-top:3px solid #2563eb;pointer-events:none;";
    return marker;
  }

  function moveMarker(row, after = false) {
    const insertionMarker = createMarker();
    if (row) list.insertBefore(insertionMarker, after ? row.nextSibling : row);
    else list.append(insertionMarker);
  }

  function getTarget(event) {
    rows();
    const target = event.target?.closest?.("[data-sortable-id]");
    if (target?.parentElement === list && target.dataset.sortableId === draggedId) {
      return { target: null, after: false, ignored: true };
    }
    if (!target || target.parentElement !== list)
      return { target: null, after: true, ignored: false };
    const bounds = target.getBoundingClientRect();
    return { target, after: event.clientY >= bounds.top + bounds.height / 2, ignored: false };
  }

  function reorderBefore(targetId, after) {
    const currentIds = rows().map((row) => row.dataset.sortableId);
    if (!draggedId || !currentIds.includes(draggedId)) return;
    const nextIds = currentIds.filter((id) => id !== draggedId);
    let index = targetId ? nextIds.indexOf(targetId) : nextIds.length;
    if (index < 0) return;
    if (after) index += 1;
    nextIds.splice(index, 0, draggedId);
    if (nextIds.every((id, position) => id === currentIds[position])) return;
    reportOrder(nextIds);
  }

  function reportOrder(itemIds) {
    clearMarker();
    try {
      onReorder(itemIds);
    } finally {
      rows();
    }
  }

  function handleDragStart(event) {
    const row = event.target?.closest?.("[data-sortable-id]");
    if (!row || row.parentElement !== list) return;
    rows();
    draggedId = row.dataset.sortableId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(transferType, draggedId);
    }
    row.classList.add("nodula-sortable-dragging");
  }

  function handleDragOver(event) {
    if (!draggedId || !Array.from(event.dataTransfer?.types ?? []).includes(transferType)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const { target, after, ignored } = getTarget(event);
    if (ignored) {
      clearMarker();
      return;
    }
    moveMarker(target, after);
  }

  function handleDrop(event) {
    if (!draggedId || !Array.from(event.dataTransfer?.types ?? []).includes(transferType)) return;
    event.preventDefault();
    const { target, after, ignored } = getTarget(event);
    if (ignored) {
      clearMarker();
      return;
    }
    reorderBefore(target?.dataset.sortableId ?? null, after);
    clearMarker();
  }

  function handleDragEnd(event) {
    event.target?.closest?.("[data-sortable-id]")?.classList.remove("nodula-sortable-dragging");
    draggedId = null;
    clearMarker();
  }

  function handleClick(event) {
    const button = event.target?.closest?.("[data-sortable-up], [data-sortable-down]");
    const row = button?.closest?.("[data-sortable-id]");
    if (!button || !row || row.parentElement !== list || button.disabled) return;
    const currentRows = rows();
    const index = currentRows.indexOf(row);
    const nextIndex = index + (button.hasAttribute("data-sortable-up") ? -1 : 1);
    if (nextIndex < 0 || nextIndex >= currentRows.length) return;
    const nextIds = currentRows.map((item) => item.dataset.sortableId);
    [nextIds[index], nextIds[nextIndex]] = [nextIds[nextIndex], nextIds[index]];
    reportOrder(nextIds);
  }

  rows();
  list.addEventListener("dragstart", handleDragStart);
  list.addEventListener("dragover", handleDragOver);
  list.addEventListener("drop", handleDrop);
  list.addEventListener("dragend", handleDragEnd);
  list.addEventListener("click", handleClick);
  observer = Observer
    ? new Observer(() => {
        if (!disposed) rows();
      })
    : null;
  observer?.observe(list, { childList: true, subtree: true });

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    list.removeEventListener("dragstart", handleDragStart);
    list.removeEventListener("dragover", handleDragOver);
    list.removeEventListener("drop", handleDrop);
    list.removeEventListener("dragend", handleDragEnd);
    list.removeEventListener("click", handleClick);
    observer?.disconnect();
    clearMarker();
    for (const [row, draggable] of originalDraggable) {
      if (draggable === null) row.removeAttribute("draggable");
      else row.setAttribute("draggable", draggable);
      row.classList.remove("nodula-sortable-dragging");
    }
    for (const [button, disabled] of originalButtonDisabled) button.disabled = disabled;
  };
  registerCleanup(dispose);
  return dispose;
}
