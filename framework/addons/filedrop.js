/* Provide an accessible native file picker and file-drop target. */
import { onCleanup } from 'nodula-framework';
import { injectAddonStyles } from './inject-styles.js';
import fileDropStyles from '../assets/css/nodula-filedrop.css?inline';

let nextFileDropId = 0;

function assertElement(element) {
  if (!element || element.nodeType !== 1 || typeof element.addEventListener !== 'function') {
    throw new TypeError('createFileDropZone expects a target element.');
  }
}

function registerCleanup(dispose) {
  try {
    onCleanup(dispose);
  } catch {
    // Call the returned disposer when used outside a Nodula owner.
  }
}

/** Create a native file picker/drop zone. Files remain under application control. */
export function createFileDropZone(target, {
  label,
  description,
  buttonLabel,
  accept,
  multiple = false,
  onFiles,
  classNames = {},
  onStateChange,
} = {}) {
  assertElement(target);
  if (typeof label !== 'string' || !label.trim()) throw new TypeError('createFileDropZone label must be a non-empty string.');
  if (typeof description !== 'string') throw new TypeError('createFileDropZone description must be a string.');
  if (typeof buttonLabel !== 'string' || !buttonLabel.trim()) throw new TypeError('createFileDropZone buttonLabel must be a non-empty string.');
  if (accept !== undefined && (typeof accept !== 'string' || !accept.trim())) {
    throw new TypeError('createFileDropZone accept must be a non-empty string when provided.');
  }
  if (typeof multiple !== 'boolean') throw new TypeError('createFileDropZone multiple must be a boolean.');
  if (typeof onFiles !== 'function') throw new TypeError('createFileDropZone onFiles must be a function.');
  if (!classNames || typeof classNames !== 'object' || Array.isArray(classNames) ||
      ['active', 'accepted', 'rejected'].some((state) => classNames[state] !== undefined && (typeof classNames[state] !== 'string' || !classNames[state].trim()))) {
    throw new TypeError('createFileDropZone classNames must contain non-empty strings for active, accepted, or rejected states.');
  }
  if (onStateChange !== undefined && typeof onStateChange !== 'function') {
    throw new TypeError('createFileDropZone onStateChange must be a function.');
  }
  if (typeof document === 'undefined') throw new Error('createFileDropZone requires a browser document.');

  injectAddonStyles('filedrop', fileDropStyles);

  const id = nextFileDropId++;
  const zone = document.createElement('div');
  zone.className = 'ui-filedrop';
  zone.setAttribute('role', 'group');

  const title = document.createElement('p');
  title.className = 'ui-filedrop__label';
  title.id = `ui-filedrop-label-${id}`;
  title.textContent = label;
  zone.setAttribute('aria-labelledby', title.id);

  const instructions = document.createElement('p');
  instructions.className = 'ui-filedrop__description';
  instructions.id = `ui-filedrop-description-${id}`;
  instructions.textContent = description;

  const input = document.createElement('input');
  input.className = 'ui-filedrop__input';
  input.type = 'file';
  input.setAttribute('aria-label', label);
  input.setAttribute('aria-describedby', instructions.id);
  if (accept !== undefined) input.accept = accept;
  input.multiple = multiple;

  const button = document.createElement('button');
  button.className = 'ui-filedrop__button';
  button.type = 'button';
  button.textContent = buttonLabel;

  zone.append(title, instructions, input, button);
  target.append(zone);

  let disposed = false;
  let currentState = 'idle';
  const stateClasses = {
    active: classNames.active ?? 'ui-filedrop--active',
    accepted: classNames.accepted ?? 'ui-filedrop--accepted',
    rejected: classNames.rejected ?? 'ui-filedrop--rejected',
  };
  const setState = (state, details = {}) => {
    if (currentState === state) return;
    for (const className of Object.values(stateClasses)) zone.classList.remove(...className.split(/\s+/));
    if (state !== 'idle') zone.classList.add(...stateClasses[state].split(/\s+/));
    currentState = state;
    onStateChange?.(state, details);
  };
  const filesFor = (files) => {
    const selected = Array.from(files ?? []);
    return multiple ? selected : selected.slice(0, 1);
  };
  const acceptsFile = (file) => {
    if (accept === undefined) return true;
    return accept.split(',').map((entry) => entry.trim().toLowerCase()).filter(Boolean).some((rule) => {
      if (rule.startsWith('.')) return file.name.toLowerCase().endsWith(rule);
      if (rule.endsWith('/*')) return file.type.toLowerCase().startsWith(rule.slice(0, -1));
      return file.type.toLowerCase() === rule;
    });
  };
  const partitionFiles = (files) => {
    const selected = filesFor(files);
    return {
      accepted: selected.filter(acceptsFile),
      rejected: selected.filter((file) => !acceptsFile(file)),
    };
  };
  const handlePickerChange = () => {
    const { accepted, rejected } = partitionFiles(input.files);
    try {
      if (accepted.length) onFiles(accepted, 'picker');
      const state = rejected.length ? 'rejected' : accepted.length ? 'accepted' : 'idle';
      setState(state, { accepted, rejected, source: 'picker' });
    } finally {
      input.value = '';
    }
  };
  const hasFiles = (event) => Array.from(event.dataTransfer?.types ?? []).includes('Files');
  const handleDragEnter = (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    setState('active', { source: 'drop' });
  };
  const handleDragOver = (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    setState('active', { source: 'drop' });
  };
  const handleDragLeave = (event) => {
    if (event.relatedTarget && zone.contains(event.relatedTarget)) return;
    setState('idle', { source: 'drop' });
  };
  const handleDrop = (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    const { accepted, rejected } = partitionFiles(event.dataTransfer?.files);
    if (accepted.length) onFiles(accepted, 'drop');
    const state = rejected.length ? 'rejected' : accepted.length ? 'accepted' : 'idle';
    setState(state, { accepted, rejected, source: 'drop' });
  };
  const handleButtonClick = () => input.click();

  input.addEventListener('change', handlePickerChange);
  button.addEventListener('click', handleButtonClick);
  zone.addEventListener('dragenter', handleDragEnter);
  zone.addEventListener('dragover', handleDragOver);
  zone.addEventListener('dragleave', handleDragLeave);
  zone.addEventListener('drop', handleDrop);

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    input.removeEventListener('change', handlePickerChange);
    button.removeEventListener('click', handleButtonClick);
    zone.removeEventListener('dragenter', handleDragEnter);
    zone.removeEventListener('dragover', handleDragOver);
    zone.removeEventListener('dragleave', handleDragLeave);
    zone.removeEventListener('drop', handleDrop);
    for (const className of Object.values(stateClasses)) zone.classList.remove(...className.split(/\s+/));
    zone.remove();
  };
  registerCleanup(dispose);
  return dispose;
}