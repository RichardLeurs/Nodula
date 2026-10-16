/* Internally resolve element-ID content and restore its source after overlays close. */
/** Resolve #id content references and restore the source element after the overlay closes. */
export function prepareContent(content) {
  if (typeof content !== "string" || !content.startsWith("#")) {
    return { content, isElementReference: false, restore() {} };
  }

  const source = document.getElementById(content.slice(1));
  if (!source) {
    throw new TypeError(`Overlay content element not found: ${content}`);
  }

  const parent = source.parentNode;
  const placeholder = document.createComment("overlay content source");
  parent.replaceChild(placeholder, source);
  const nodes = [...source.childNodes];
  const fragment = document.createDocumentFragment();
  fragment.append(...nodes);
  let restored = false;

  return {
    content: fragment,
    isElementReference: true,
    restore() {
      if (restored) return;
      restored = true;
      source.append(...nodes);
      if (placeholder.parentNode) placeholder.parentNode.replaceChild(source, placeholder);
    },
  };
}
