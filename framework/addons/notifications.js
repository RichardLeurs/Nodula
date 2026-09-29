import { onCleanup } from 'nodula-framework';
import { injectAddonStyles } from './inject-styles.js';
import notificationStyles from '../assets/nodula-notifications.css?inline';

const notificationTypes = new Set(['error', 'success', 'warning', 'info']);
const notificationPositions = new Set([
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]);
const containers = new Map();
let nextNotificationId = 0;

function getContainer(position) {
  let container = containers.get(position);
  if (container?.isConnected) return container;

  container = document.createElement('div');
  container.className = `ui-notifications ui-notifications--${position}`;
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', 'Notifications');
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-relevant', 'additions');
  document.body.append(container);
  containers.set(position, container);
  return container;
}

/** Show a typed notification and return controls for dismissing it. */
export function showNotification(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('showNotification expects an options object.');
  }

  const {
    type = 'info',
    title,
    message,
    position = 'top-right',
    duration = 5000,
    closeText = 'Dismiss notification',
  } = options;

  if (!notificationTypes.has(type)) {
    throw new TypeError('showNotification type must be error, success, warning, or info.');
  }
  if (typeof title !== 'string' || !title.trim() || typeof message !== 'string' || !message.trim()) {
    throw new TypeError('showNotification title and message must be non-empty strings.');
  }
  if (!notificationPositions.has(position)) {
    throw new TypeError('showNotification position must be a supported corner or center position.');
  }
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) {
    throw new TypeError('showNotification duration must be a non-negative finite number.');
  }
  if (typeof closeText !== 'string' || !closeText.trim()) {
    throw new TypeError('showNotification closeText must be a non-empty string.');
  }
  if (typeof document === 'undefined' || !document.body) {
    throw new Error('showNotification requires a browser document.');
  }
  injectAddonStyles('notifications', notificationStyles);

  const id = nextNotificationId++;
  const container = getContainer(position);
  const element = document.createElement('div');
  element.className = `ui-notification ui-notification--${type}`;
  element.setAttribute('role', type === 'error' ? 'alert' : 'status');
  element.setAttribute('aria-labelledby', `ui-notification-title-${id}`);
  element.setAttribute('aria-describedby', `ui-notification-message-${id}`);

  const content = document.createElement('div');
  content.className = 'ui-notification__content';
  const heading = document.createElement('h2');
  heading.className = 'ui-notification__title';
  heading.id = `ui-notification-title-${id}`;
  heading.textContent = title;
  const body = document.createElement('p');
  body.className = 'ui-notification__message';
  body.id = `ui-notification-message-${id}`;
  body.textContent = message;

  const closeButton = document.createElement('button');
  closeButton.className = 'ui-notification__close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', closeText);
  closeButton.textContent = '×';
  content.append(heading, body);
  element.append(content, closeButton);
  container.append(element);

  let resolveClosed;
  let closedResolved = false;
  let isClosing = false;
  let dismissalTimer;
  let removalTimer;
  const view = document.defaultView ?? globalThis;
  const closed = new Promise((resolve) => { resolveClosed = resolve; });

  const remove = () => {
    if (closedResolved) return;
    closedResolved = true;
    view.clearTimeout(dismissalTimer);
    view.clearTimeout(removalTimer);
    element.removeEventListener('animationend', handleAnimationEnd);
    closeButton.removeEventListener('click', close);
    element.remove();
    if (container.childElementCount === 0) {
      container.remove();
      if (containers.get(position) === container) containers.delete(position);
    }
    resolveClosed();
  };

  const handleAnimationEnd = (event) => {
    if (event.target === element && isClosing) remove();
  };

  const close = () => {
    if (isClosing || closedResolved) return;
    isClosing = true;
    view.clearTimeout(dismissalTimer);
    element.classList.add('ui-notification--closing');
    // Keep cleanup deterministic if CSS animations are disabled or unavailable.
    removalTimer = view.setTimeout(remove, 250);
  };

  closeButton.addEventListener('click', close);
  element.addEventListener('animationend', handleAnimationEnd);
  if (duration > 0) dismissalTimer = view.setTimeout(close, duration);

  try {
    onCleanup(close);
  } catch {
    // Notifications may be used outside a Nodula root; they still dismiss on their own.
  }

  return { element, close, closed };
}