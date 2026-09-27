import { onCleanup } from 'nodula-framework';
import { injectAddonStyles } from './inject-styles.js';
import dialogStyles from '../assets/nodula-dialog.css?inline';

let nextDialogId = 0;

/** Show a message with an optional title and configurable button labels. Resolves false for dismissal and true for OK. */
export function showDialog(message, options = {}) {
  if (typeof message !== 'string') {
    throw new TypeError('showDialog expects a message string.');
  }
  const { title, cancelText = 'Cancel', okText = 'OK' } = options;
  if ((title !== undefined && typeof title !== 'string') || typeof cancelText !== 'string' || typeof okText !== 'string') {
    throw new TypeError('showDialog title and button labels must be strings.');
  }
  if (typeof document === 'undefined' || !document.body) {
    return Promise.reject(new Error('showDialog requires a browser document.'));
  }
  injectAddonStyles('dialog', dialogStyles);

  return new Promise((resolve, reject) => {
    const previousFocus = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'nodula-dialog';
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('role', 'alertdialog');
    const content = document.createElement('div');
    content.className = 'nodula-dialog__content';

    if (title) {
      const header = document.createElement('header');
      header.className = 'nodula-dialog__header';
      const titleElement = document.createElement('h2');
      titleElement.className = 'nodula-dialog__title';
      titleElement.id = `nodula-dialog-title-${nextDialogId++}`;
      titleElement.textContent = title;
      dialog.setAttribute('aria-labelledby', titleElement.id);
      header.append(titleElement);
      dialog.append(header);
    } else {
      dialog.setAttribute('aria-label', 'Confirmation dialog');
    }

    const messageElement = document.createElement('p');
    messageElement.className = 'nodula-dialog__message';
    messageElement.id = `nodula-dialog-message-${nextDialogId++}`;
    dialog.setAttribute('aria-describedby', messageElement.id);
    messageElement.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'nodula-dialog__actions';
    const cancelButton = document.createElement('button');
    cancelButton.className = 'nodula-dialog__button nodula-dialog__button--cancel';
    cancelButton.type = 'button';
    cancelButton.textContent = cancelText;
    const okButton = document.createElement('button');
    okButton.className = 'nodula-dialog__button nodula-dialog__button--ok';
    okButton.type = 'button';
    okButton.textContent = okText;
    okButton.autofocus = true;

    actions.append(cancelButton, okButton);
    content.append(messageElement, actions);
    dialog.append(content);
    document.body.append(dialog);

    let settled = false;
    const finish = (accepted) => {
      if (settled) return;
      settled = true;
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('keydown', handleKeydown);
      dialog.removeEventListener('click', handleBackdropClick);
      cancelButton.removeEventListener('click', handleCancelClick);
      okButton.removeEventListener('click', handleOkClick);
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      dialog.remove();
      if (previousFocus?.nodeType === 1 && previousFocus.isConnected && typeof previousFocus.focus === 'function') {
        previousFocus.focus();
      }
      resolve(accepted);
    };

    const handleCancel = (event) => {
      event.preventDefault();
      finish(false);
    };
    const handleClose = () => finish(false);
    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    };
    const handleBackdropClick = (event) => {
      if (event.target === dialog) finish(false);
    };
    const handleCancelClick = () => finish(false);
    const handleOkClick = () => finish(true);

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('keydown', handleKeydown);
    dialog.addEventListener('click', handleBackdropClick);
    cancelButton.addEventListener('click', handleCancelClick);
    okButton.addEventListener('click', handleOkClick);

    try {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
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

    function rejectDialog(error) {
      if (settled) return;
      settled = true;
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('keydown', handleKeydown);
      dialog.removeEventListener('click', handleBackdropClick);
      cancelButton.removeEventListener('click', handleCancelClick);
      okButton.removeEventListener('click', handleOkClick);
      reject(error);
    }
  });
}