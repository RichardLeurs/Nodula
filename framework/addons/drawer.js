// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Provide native side drawers with optional custom DOM and lifecycle cleanup. */
import { onCleanup } from "nodula-framework";
import { injectAddonStyles } from "./utils/inject-styles.js";
import { prepareContent } from "./utils/prepare-content.js";
import drawerStyles from "../assets/css/nodula-drawer.css?inline";

let nextDrawerId = 0;

/** Show a modal side drawer and return controls for closing it and observing dismissal. */
export function showDrawer(content, options = {}) {
  if (typeof content !== "string" && (!content || typeof content.nodeType !== "number")) {
    throw new TypeError("showDrawer expects text or a DOM node as content.");
  }
  const { title = "", closeOnBackdrop = true, position = "right", showHeader = true } = options;
  const closeText = options.btn_close ?? "Close";
  if (
    typeof title !== "string" ||
    typeof closeText !== "string" ||
    typeof closeOnBackdrop !== "boolean" ||
    !["left", "right"].includes(position)
  ) {
    throw new TypeError(
      'showDrawer title and closeText must be strings, closeOnBackdrop must be a boolean, and position must be "left" or "right".',
    );
  }
  if (typeof showHeader !== "boolean") {
    throw new TypeError("showDrawer showHeader must be a boolean.");
  }
  if (typeof document === "undefined" || !document.body) {
    throw new Error("showDrawer requires a browser document.");
  }
  injectAddonStyles("drawer", drawerStyles);
  const preparedContent = prepareContent(content);

  const drawer = document.createElement("dialog");
  drawer.className = `ui-drawer ui-drawer--${position}`;
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-modal", "true");

  let closeButton;
  if (showHeader) {
    const header = document.createElement("header");
    header.className = "ui-drawer__header";
    if (title) {
      const heading = document.createElement("h2");
      heading.className = "ui-drawer__title";
      heading.id = `ui-drawer-title-${nextDrawerId++}`;
      heading.textContent = title;
      drawer.setAttribute("aria-labelledby", heading.id);
      header.append(heading);
    } else {
      drawer.setAttribute("aria-label", "Side drawer");
    }

    closeButton = document.createElement("button");
    closeButton.className = "ui-drawer__close";
    closeButton.type = "button";
    closeButton.textContent = closeText;
    closeButton.setAttribute("aria-label", closeText);
    header.append(closeButton);
    drawer.append(header);
  } else {
    drawer.setAttribute("aria-label", title || "Side drawer");
    drawer.setAttribute("tabindex", "-1");
  }

  if (!showHeader && typeof preparedContent.content !== "string") {
    drawer.append(preparedContent.content);
  } else {
    const body = document.createElement("div");
    body.className = "ui-drawer__body";
    if (typeof preparedContent.content === "string") body.textContent = preparedContent.content;
    else body.append(preparedContent.content);
    drawer.append(body);
  }

  const previousFocus = document.activeElement;
  let resolveClosed;
  const closed = new Promise((resolve) => {
    resolveClosed = resolve;
  });
  let isClosed = false;
  let customCloseButtons = [];

  /**
   * Close the drawer once and remove its listeners. Restores the custom content and focus.
   */
  const close = () => {
    if (isClosed) return;
    isClosed = true;
    drawer.removeEventListener("cancel", handleCancel);
    drawer.removeEventListener("close", handleClose);
    drawer.removeEventListener("click", handleBackdropClick);
    closeButton?.removeEventListener("click", close);
    customCloseButtons.forEach((button) => button.removeEventListener("click", close));
    if (drawer.open && typeof drawer.close === "function") drawer.close();
    drawer.remove();
    preparedContent.restore();
    if (
      previousFocus?.nodeType === 1 &&
      previousFocus.isConnected &&
      typeof previousFocus.focus === "function"
    ) {
      previousFocus.focus();
    }
    resolveClosed();
  };

  /**
   * Handle the native cancel event by cancelling it and closing the drawer.
   *
   * @param {Event} event
   */
  const handleCancel = (event) => {
    event.preventDefault();
    close();
  };
  /**
   * Clean up when the native dialog closes.
   */
  const handleClose = () => close();
  /**
   * Close the drawer when a click lands outside its box, if closing on the backdrop is enabled.
   *
   * @param {MouseEvent} event
   */
  const handleBackdropClick = (event) => {
    if (!closeOnBackdrop || event.target !== drawer) return;
    const bounds = drawer.getBoundingClientRect();
    const clickedOutside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;
    if (clickedOutside) close();
  };

  drawer.addEventListener("cancel", handleCancel);
  drawer.addEventListener("close", handleClose);
  drawer.addEventListener("click", handleBackdropClick);
  closeButton?.addEventListener("click", close);
  customCloseButtons =
    preparedContent.isElementReference && !showHeader
      ? [...drawer.querySelectorAll("[data-close-drawer]")]
      : [];
  customCloseButtons.forEach((button) => button.addEventListener("click", close));
  document.body.append(drawer);

  try {
    if (typeof drawer.showModal === "function") drawer.showModal();
    else drawer.setAttribute("open", "");
    if (closeButton) closeButton.focus();
  } catch (error) {
    drawer.removeEventListener("cancel", handleCancel);
    drawer.removeEventListener("close", handleClose);
    drawer.removeEventListener("click", handleBackdropClick);
    closeButton?.removeEventListener("click", close);
    customCloseButtons.forEach((button) => button.removeEventListener("click", close));
    drawer.remove();
    preparedContent.restore();
    throw error;
  }

  try {
    onCleanup(close);
  } catch {
    // Drawers may be opened outside a Nodula root; user dismissal still cleans them up.
  }

  return { element: drawer, close, closed };
}

/** @deprecated Use `showDrawer` instead. */
//export const openDrawer = showDrawer;
