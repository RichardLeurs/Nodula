import { onCleanup } from 'nodula-framework';
import { injectAddonStyles } from './inject-styles.js';
import modalStyles from '../assets/nodula-modal.css?inline';

let nextModalId = 0;

/** Show a modal window and return controls for closing it and observing its dismissal. */
export function showModal(content, options = {}) {
  if (typeof content !== 'string' && (!content || typeof content.nodeType !== 'number')) {
    throw new TypeError('showModal expects text or a DOM node as content.');
  }
  const { title = '', closeOnBackdrop = true } = options;
  const closeText = options.btn_close ?? 'Close';
  if (typeof title !== 'string' || typeof closeText !== 'string' || typeof closeOnBackdrop !== 'boolean') {
    throw new TypeError('showModal title and closeText must be strings, and closeOnBackdrop must be a boolean.');
  }
  if (typeof document === 'undefined' || !document.body) {
    throw new Error('showModal requires a browser document.');
  }
  injectAddonStyles('modal', modalStyles);

  const modal = document.createElement('dialog');
  modal.className = 'ui-modal';
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('role', 'dialog');

  const id = `ui-modal-title-${nextModalId++}`;
  const header = document.createElement('header');
  header.className = 'ui-modal__header';
  if (title) {
    const heading = document.createElement('h2');
    heading.className = 'ui-modal__title';
    heading.id = id;
    heading.textContent = title;
    modal.setAttribute('aria-labelledby', id);
    header.append(heading);
  } else {
    modal.setAttribute('aria-label', 'Modal window');
  }

  const closeButton = document.createElement('button');
  closeButton.className = 'ui-modal__close';
  closeButton.type = 'button';
  closeButton.textContent = closeText;
  closeButton.setAttribute('aria-label', closeText);
  header.append(closeButton);

  const body = document.createElement('div');
  body.className = 'ui-modal__body';
  if (typeof content === 'string') body.textContent = content;
  else body.append(content);
  modal.append(header, body);

  const previousFocus = document.activeElement;
  let resolveClosed;
  const closed = new Promise((resolve) => { resolveClosed = resolve; });
  let isClosed = false;

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    modal.removeEventListener('cancel', handleCancel);
    modal.removeEventListener('close', handleClose);
    modal.removeEventListener('click', handleBackdropClick);
    closeButton.removeEventListener('click', close);
    if (modal.open && typeof modal.close === 'function') modal.close();
    modal.remove();
    if (previousFocus?.nodeType === 1 && previousFocus.isConnected && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    }
    resolveClosed();
  };

  const handleCancel = (event) => {
    event.preventDefault();
    close();
  };
  const handleClose = () => close();
  const handleBackdropClick = (event) => {
    if (closeOnBackdrop && event.target === modal) close();
  };

  modal.addEventListener('cancel', handleCancel);
  modal.addEventListener('close', handleClose);
  modal.addEventListener('click', handleBackdropClick);
  closeButton.addEventListener('click', close);
  document.body.append(modal);

  try {
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
    closeButton.focus();
  } catch (error) {
    modal.remove();
    throw error;
  }

  try {
    onCleanup(close);
  } catch {
    // Modals may be opened outside a Nodula root; user dismissal still cleans them up.
  }

  return { element: modal, close, closed };
}

/** @deprecated Use `showModal` instead. */
export const openModal = showModal;