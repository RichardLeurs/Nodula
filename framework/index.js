console.log('This app is built with th nodula javascript framework | See https://nodula.richardleurs.nl for more info | Copyright © Richard Leurs 2026');

export { signal, computed, effect, createRoot, onCleanup, onMount, onUnmount, batch } from './reactivity.js';
import { defineCustomElement } from './dom.js';
export { h, fragment, mount, list, each, when, slot, component, outlet, defineCustomElement, registerLifecycleTransition } from './dom.js';
export { visibleIsland } from './island.js';

/** Load a global stylesheet once and return its link element. */
export const Nodula = /* @__PURE__ */ Object.freeze({
  defineCustomElement,
  css(href) {
    const absoluteHref = new URL(href, document.baseURI).href;
    const existing = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .find((link) => link.href === absoluteHref);
    if (existing) return existing;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = absoluteHref;
    document.head.append(link);
    return link;
  },
});