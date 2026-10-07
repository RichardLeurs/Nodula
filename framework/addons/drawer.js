import { onCleanup } from 'nodula-framework';
import { injectAddonStyles } from './inject-styles.js';
import drawerStyles from '../assets/nodula-drawer.css?inline';

let nextDrawerId = 0;

/** Show a modal side drawer and return controls for closing it and observing dismissal. */
export function showDrawer(content, options = {}) {
  if (typeof content !== 'string' && (!content || typeof content.nodeType !== 'number')) {
    throw new TypeError('showDrawer expects text or a DOM node as content.');
  }
  const { title = '', closeOnBackdrop = true, position = 'right' } = options;
  const closeText = options.btn_close ?? 'Close';
  if (typeof title !== 'string' || typeof closeText !== 'string' || typeof closeOnBackdrop !== 'boolean' || !['left', 'right'].includes(position)) {
    throw new TypeError('showDrawer title and closeText must be strings, closeOnBackdrop must be a boolean, and position must be "left" or "right".');
  }
  if (typeof document === 'undefined' || !document.body) {
    throw new Error('showDrawer requires a browser document.');
  }
  injectAddonStyles('drawer', drawerStyles);

  const drawer = document.createElement('dialog');
  drawer.className = `ui-drawer ui-drawer--${position}`;
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');

  const header = document.createElement('header');
  header.className = 'ui-drawer__header';
  if (title) {
    const heading = document.createElement('h2');
    heading.className = 'ui-drawer__title';
    heading.id = `ui-drawer-title-${nextDrawerId++}`;
    heading.textContent = title;
    drawer.setAttribute('aria-labelledby', heading.id);
    header.append(heading);
  } else {
    drawer.setAttribute('aria-label', 'Side drawer');
  }

  const closeButton = document.createElement('button');
  closeButton.className = 'ui-drawer__close';
  closeButton.type = 'button';
  closeButton.textContent = closeText;
  closeButton.setAttribute('aria-label', closeText);
  header.append(closeButton);

  const body = document.createElement('div');
  body.className = 'ui-drawer__body';
  if (typeof content === 'string') body.textContent = content;
  else body.append(content);
  drawer.append(header, body);

  const previousFocus = document.activeElement;
  let resolveClosed;
  const closed = new Promise((resolve) => { resolveClosed = resolve; });
  let isClosed = false;

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    drawer.removeEventListener('cancel', handleCancel);
    drawer.removeEventListener('close', handleClose);
    drawer.removeEventListener('click', handleBackdropClick);
    closeButton.removeEventListener('click', close);
    if (drawer.open && typeof drawer.close === 'function') drawer.close();
    drawer.remove();
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
    if (!closeOnBackdrop || event.target !== drawer) return;
    const bounds = drawer.getBoundingClientRect();
    const clickedOutside = event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (clickedOutside) close();
  };

  drawer.addEventListener('cancel', handleCancel);
  drawer.addEventListener('close', handleClose);
  drawer.addEventListener('click', handleBackdropClick);
  closeButton.addEventListener('click', close);
  document.body.append(drawer);

  try {
    if (typeof drawer.showModal === 'function') drawer.showModal();
    else drawer.setAttribute('open', '');
    closeButton.focus();
  } catch (error) {
    drawer.remove();
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
export const openDrawer = showDrawer;