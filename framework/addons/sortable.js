// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Add native vertical list sorting with application-owned item state. */
import { onCleanup } from "nodula-framework";
import { injectAddonStyles } from "./inject-styles.js";
import sortableStyles from "../assets/css/nodula-sortable.css?inline";

const transferType = "application/x-nodula-sortable-item";
const rowSelector = ":scope > [data-sortable-id]";
const markerClass = "nodula-sortable-insertion-marker";

/**
 * Throw a TypeError unless `element` is an `<ol>` or `<ul>` element.
 *
 * @param {unknown} element
 */
function assertElement(element) {
  if (!element || element.nodeType !== 1 || typeof element.addEventListener !== "function") {
    throw new TypeError("createSortableList expects a DOM list element.");
  }
  if (!["OL", "UL"].includes(element.tagName)) {
    throw new TypeError("createSortableList expects an <ol> or <ul> element.");
  }
}

/**
 * Return the list’s direct rows, checking that every row has a unique, non-empty `data-sortable-id`.
 *
 * @param {HTMLElement} list
 * @returns {HTMLElement[]}
 * @throws {TypeError} For a missing or duplicate id.
 */
function getRows(list) {
  const rows = Array.from(list.querySelectorAll(rowSelector));
  const ids = rows.map((row) => row.dataset.sortableId);
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
    throw new TypeError("Sortable list rows must have unique, non-empty data-sortable-id values.");
  }
  return rows;
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

/** Attach native vertical sorting and Move Up/Down handling to an existing list. */
export function createSortableList(list, { onReorder, announce } = {}) {
  assertElement(list);
  if (typeof onReorder !== "function")
    throw new TypeError("createSortableList onReorder must be a function.");
  if (announce !== undefined && announce !== false && typeof announce !== "function")
    throw new TypeError("createSortableList announce must be a function or false.");
  getRows(list);
  injectAddonStyles("sortable", sortableStyles);
  const originalDraggable = new Map();
  const originalButtonDisabled = new Map();
  const Observer = list.ownerDocument.defaultView?.MutationObserver;
  let draggedId = null;
  let marker = null;
  let disposed = false;
  let observer = null;

  // A polite live region next to the list (a <div> is not valid inside <ol>/<ul>).
  const status = announce === false ? null : document.createElement("div");
  if (status) {
    status.className = "nodula-sortable-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    if (list.parentNode) list.after(status);
  }

  /**
   * Return the current rows and keep their drag and button state in step.
   *
   * @returns {HTMLElement[]}
   */
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

  /**
   * Disable Move Up on the first row and Move Down on the last.
   *
   * @param {HTMLElement[]} currentRows
   */
  function updateButtons(currentRows) {
    currentRows.forEach((row, index) => {
      for (const button of row.querySelectorAll("[data-sortable-up], [data-sortable-down]")) {
        if (button.hasAttribute("data-sortable-up")) button.disabled = index === 0;
        if (button.hasAttribute("data-sortable-down"))
          button.disabled = index === currentRows.length - 1;
      }
    });
  }

  /**
   * Remove the insertion marker from the list.
   */
  function clearMarker() {
    marker?.remove();
    marker = null;
  }

  /**
   * Create the insertion marker, reusing the existing one.
   *
   * @returns {HTMLLIElement}
   */
  function createMarker() {
    if (marker) return marker;
    marker = document.createElement("li");
    marker.className = markerClass;
    marker.setAttribute("aria-hidden", "true");
    marker.setAttribute("role", "presentation");
    return marker;
  }

  /**
   * Show the insertion marker before or after a row, or at the end of the list.
   *
   * @param {HTMLElement | null} row
   * @param {boolean} [after]
   */
  function moveMarker(row, after = false) {
    const insertionMarker = createMarker();
    if (row) list.insertBefore(insertionMarker, after ? row.nextSibling : row);
    else list.append(insertionMarker);
  }

  /**
   * Find the row under a drag event and whether the drop goes after it.
   *
   * @param {DragEvent} event
   * @returns {{ target: HTMLElement | null, after: boolean, ignored: boolean }}
   */
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

  /**
   * Report the new order when the dragged row moves to a new position.
   *
   * @param {string | null} targetId Row the drop is relative to, or null for the end.
   * @param {boolean} after
   */
  function reorderBefore(targetId, after) {
    const currentIds = rows().map((row) => row.dataset.sortableId);
    if (!draggedId || !currentIds.includes(draggedId)) return;
    const nextIds = currentIds.filter((id) => id !== draggedId);
    let index = targetId ? nextIds.indexOf(targetId) : nextIds.length;
    if (index < 0) return;
    if (after) index += 1;
    nextIds.splice(index, 0, draggedId);
    if (nextIds.every((id, position) => id === currentIds[position])) return;
    reportOrder(nextIds, draggedId);
  }

  /**
   * Announce the new position of a moved row in the live region.
   *
   * @param {string} id
   * @param {string[]} itemIds New order.
   */
  function announceMove(id, itemIds) {
    if (!status) return;
    const details = { id, position: itemIds.indexOf(id) + 1, total: itemIds.length };
    if (!status.isConnected && list.parentNode) list.after(status);
    status.textContent =
      typeof announce === "function"
        ? announce(details)
        : `Moved to position ${details.position} of ${details.total}.`;
  }

  // Re-rendering moves or replaces the row, which drops focus; return it to the moved row.
  /**
   * Move focus to the moved row’s button in the same direction, or the other one when that one is disabled.
   *
   * @param {string} id
   * @param {"up" | "down"} direction
   */
  function restoreFocus(id, direction) {
    const row = rows().find((item) => item.dataset.sortableId === id);
    const opposite = direction === "up" ? "down" : "up";
    const button = [direction, opposite]
      .map((name) => row?.querySelector(`[data-sortable-${name}]`))
      .find((candidate) => candidate && !candidate.disabled);
    button?.focus();
  }

  /**
   * Report a new order to `onReorder`, then announce it and restore focus.
   *
   * @param {string[]} itemIds
   * @param {string} movedId
   * @param {"up" | "down"} [focusDirection]
   */
  function reportOrder(itemIds, movedId, focusDirection) {
    clearMarker();
    try {
      onReorder(itemIds);
    } finally {
      rows();
    }
    announceMove(movedId, itemIds);
    if (focusDirection) restoreFocus(movedId, focusDirection);
  }

  /**
   * Start a drag: record the row and set the transfer data.
   *
   * @param {DragEvent} event
   */
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

  /**
   * Accept a drag of a sortable row and show the insertion marker at the drop position.
   *
   * @param {DragEvent} event
   */
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

  /**
   * Complete the drop: report the new order when it changed.
   *
   * @param {DragEvent} event
   */
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

  /**
   * Clean up after a drag, whether it was dropped or cancelled.
   *
   * @param {DragEvent} event
   */
  function handleDragEnd(event) {
    event.target?.closest?.("[data-sortable-id]")?.classList.remove("nodula-sortable-dragging");
    draggedId = null;
    clearMarker();
  }

  /**
   * Move a row up or down when its Move button is clicked.
   *
   * @param {MouseEvent} event
   */
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
    const hadFocus = row.contains(document.activeElement);
    reportOrder(
      nextIds,
      row.dataset.sortableId,
      hadFocus ? (button.hasAttribute("data-sortable-up") ? "up" : "down") : null,
    );
  }

  rows();
  list.addEventListener("dragstart", handleDragStart);
  list.addEventListener("dragover", handleDragOver);
  list.addEventListener("drop", handleDrop);
  list.addEventListener("dragend", handleDragEnd);
  list.addEventListener("click", handleClick);
  /**
   * Whether a node is the insertion marker.
   *
   * @param {Node} node
   * @returns {boolean}
   */
  const isMarker = (node) => node.nodeType === 1 && node.classList.contains(markerClass);
  observer = Observer
    ? new Observer((records) => {
        if (disposed) return;
        // Moving the insertion marker is our own mutation and does not change the rows.
        const nodes = records.flatMap((record) => [...record.addedNodes, ...record.removedNodes]);
        if (nodes.length && nodes.every(isMarker)) return;
        try {
          rows();
        } catch (error) {
          // Throwing here would surface as an uncaught error from the observer; report it instead.
          console.error("Sortable list rows changed into an invalid state:", error);
        }
      })
    : null;
  observer?.observe(list, { childList: true, subtree: true });

  /**
   * Remove the listeners, observer and marker, and restore the rows’ original attributes. Safe to call more than once.
   */
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
    status?.remove();
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
