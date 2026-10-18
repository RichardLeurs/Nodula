import type { Child, ComponentContext, RenderDescriptor } from "nodula-framework";
import type { Resource } from "nodula-framework/resource";

export interface SuspenseComponentProps {
  /** Resources created by createResource, read once when the component mounts. */
  resources: Resource<unknown>[];
}

export interface SuspenseOptions {
  /** Rendered while any resource is loading for the first time. */
  fallback: () => Child;
  /** Rendered once every resource has finished its first load, including after an error. */
  children: () => Child;
}

/**
 * Show `fallback` while any resource is loading for the first time, then `children`.
 * Refreshes keep the content visible.
 */
export function createSuspense(
  resources: Resource<unknown>[],
  options: SuspenseOptions,
): RenderDescriptor;

/**
 * Template component for `<Suspense :resources="[...]">`, with `<template #fallback>` and default content.
 */
export function Suspense(context: ComponentContext & { props: SuspenseComponentProps }): Node;
