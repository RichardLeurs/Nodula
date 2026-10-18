// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Provide accessible native confirmation dialogs with boolean results. */
import { onCleanup } from "nodula-framework";
import { injectAddonStyles } from "./utils/inject-styles.js";
import dialogStyles from "../assets/css/nodula-dialog.css?inline";

let nextDialogId = 0;

/** Show a message with an optional title and configurable button labels. Resolves false for dismissal and true for OK. */
export function showDialog(message, options = {}) {
  if (typeof message !== "string") {
    throw new TypeError("showDialog expects a message string.");
  }
  const { title } = options;
  const cancelText = options.btn_cancel ?? "Cancel";
  const okText = options.btn_ok ?? "OK";
  if (
    (title !== undefined && typeof title !== "string") ||
    typeof cancelText !== "string" ||
    typeof okText !== "string"
  ) {
    throw new TypeError("showDialog title and button labels must be strings.");
  }
  if (typeof document === "undefined" || !document.body) {
    return Promise.reject(new Error("showDialog requires a browser document."));
  }
  injectAddonStyles("dialog", dialogStyles);

  return new Promise((resolve, reject) => {
    const previousFocus = document.activeElement;
    const dialog = document.createElement("dialog");
    dialog.className = "ui-dialog";
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("role", "alertdialog");
    const content = document.createElement("div");
    content.className = "ui-dialog__content";

    if (title) {
      const header = document.createElement("header");
      header.className = "ui-dialog__header";
      const titleElement = document.createElement("h2");
      titleElement.className = "ui-dialog__title";
      titleElement.id = `ui-dialog-title-${nextDialogId++}`;
      titleElement.textContent = title;
      dialog.setAttribute("aria-labelledby", titleElement.id);
      header.append(titleElement);
      dialog.append(header);
    } else {
      dialog.setAttribute("aria-label", "Confirmation dialog");
    }

    const messageElement = document.createElement("p");
    messageElement.className = "ui-dialog__message";
    messageElement.id = `ui-dialog-message-${nextDialogId++}`;
    dialog.setAttribute("aria-describedby", messageElement.id);
    messageElement.textContent = message;

    const actions = document.createElement("div");
    actions.className = "ui-dialog__actions";
    const cancelButton = document.createElement("button");
    cancelButton.className = "ui-dialog__button ui-dialog__button--cancel";
    cancelButton.type = "button";
    cancelButton.textContent = cancelText;
    const okButton = document.createElement("button");
    okButton.className = "ui-dialog__button ui-dialog__button--ok";
    okButton.type = "button";
    okButton.textContent = okText;
    okButton.autofocus = true;

    actions.append(cancelButton, okButton);
    content.append(messageElement, actions);
    dialog.append(content);
    document.body.append(dialog);

    let settled = false;
    /**
     * Settle the dialog once, remove its listeners, close it and resolve the promise.
     *
     * @param {boolean} accepted True for OK, false for cancel or dismissal.
     */
    const finish = (accepted) => {
      if (settled) return;
      settled = true;
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("keydown", handleKeydown);
      dialog.removeEventListener("click", handleBackdropClick);
      cancelButton.removeEventListener("click", handleCancelClick);
      okButton.removeEventListener("click", handleOkClick);
      if (dialog.open && typeof dialog.close === "function") dialog.close();
      dialog.remove();
      if (
        previousFocus?.nodeType === 1 &&
        previousFocus.isConnected &&
        typeof previousFocus.focus === "function"
      ) {
        previousFocus.focus();
      }
      resolve(accepted);
    };

    /**
     * Handle the native cancel event (Escape or a browser cancel) by cancelling it and settling as declined.
     *
     * @param {Event} event
     */
    const handleCancel = (event) => {
      event.preventDefault();
      finish(false);
    };
    /**
     * Settle as declined when the native dialog closes without an answer.
     */
    const handleClose = () => finish(false);
    /**
     * Decline the dialog on Escape.
     *
     * @param {KeyboardEvent} event
     */
    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
      }
    };
    /**
     * Decline the dialog when the click lands on the backdrop, which is the dialog element itself.
     *
     * @param {MouseEvent} event
     */
    const handleBackdropClick = (event) => {
      if (event.target === dialog) finish(false);
    };
    /**
     * Decline the dialog from the cancel button.
     */
    const handleCancelClick = () => finish(false);
    /**
     * Accept the dialog from the OK button.
     */
    const handleOkClick = () => finish(true);

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("keydown", handleKeydown);
    dialog.addEventListener("click", handleBackdropClick);
    cancelButton.addEventListener("click", handleCancelClick);
    okButton.addEventListener("click", handleOkClick);

    try {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      okButton.focus();
    } catch (error) {
      dialog.remove();
      rejectDialog(error);
    }

    try {
      onCleanup(() => finish(false));
    } catch {
      // Dialogs may be used outside a Nodula root; they still clean up when the user responds.
    }

    /**
     * Settle the dialog with an error when it cannot be shown, removing its listeners.
     *
     * @param {unknown} error
     */
    function rejectDialog(error) {
      if (settled) return;
      settled = true;
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("keydown", handleKeydown);
      dialog.removeEventListener("click", handleBackdropClick);
      cancelButton.removeEventListener("click", handleCancelClick);
      okButton.removeEventListener("click", handleOkClick);
      reject(error);
    }
  });
}
