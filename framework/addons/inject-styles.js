/* Internally inject each add-on stylesheet once into the shared style layer. */
/** Add an add-on stylesheet once, in a layer that app styles can override. */
export function injectAddonStyles(id, css) {
  if (typeof document === 'undefined' || !document.head || document.querySelector(`style[data-nodula-${id}-styles]`)) return;

  const style = document.createElement('style');
  style.setAttribute(`data-nodula-${id}-styles`, '');
  style.textContent = `@layer nodula-addons {\n${css}\n}`;
  document.head.append(style);
}