// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Show a fallback while async resources load for the first time, then the content. */
import { fragment, untrack, when } from "nodula-framework";

/**
 * Render `fallback` while any resource is loading for the first time, then `children`.
 *
 * Only the first load counts. Once every resource has settled, the content stays visible, so a refresh or a
 * retry after an error does not bring the fallback back. An errored resource also stops the fallback; read its
 * `error` in `children`. A resource created with `immediate: false` is not loading until its first refetch,
 * so it does not show the fallback.
 *
 * @param {Array<{ state: () => string }>} resources Resources created by createResource.
 * @param {{ fallback: () => unknown, children: () => unknown }} options Fallback and content renderers.
 * @returns {object} A conditional child to place inside an element or component.
 */
export function createSuspense(resources, { fallback, children } = {}) {
  if (!Array.isArray(resources)) throw new TypeError("createSuspense expects an array of resources.");
  if (typeof fallback !== "function") throw new TypeError("createSuspense fallback must be a function.");
  if (typeof children !== "function") throw new TypeError("createSuspense children must be a function.");

  // Latch once every resource has settled, so a retry after a failed first load does not bring the fallback back.
  let settled = false;
  const pending = () => {
    if (!settled) settled = resources.every((resource) => resource.state() !== "pending");
    return !settled;
  };
  return when(pending, fallback, children);
}

/**
 * Template component: `<Suspense :resources="[idea]">`, with `<template #fallback>` for the loading content.
 *
 * The resources are read once when the component mounts, untracked. Child content is rendered from its slot each
 * time the fallback or the content is shown, so it is rebuilt rather than moved.
 *
 * @param {{ props: { resources: Array<{ state: () => string }> }, slots: Record<string, () => unknown> }} context
 *   Props and slots that the template compiler passes to a component.
 * @returns {DocumentFragment} The conditional fallback or content.
 */
export function Suspense({ props, slots }) {
  // Read the resources untracked: an inline array in the template is a new array on every parent render,
  // and tracking it here would re-run the parent route effect in a loop.
  const resources = untrack(() => props.resources);
  return fragment(
    createSuspense(resources, {
      fallback: () => slots.fallback?.(),
      children: () => slots.default?.(),
    }),
  );
}
