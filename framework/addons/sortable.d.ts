/** Attach native vertical drag sorting and delegated Move Up/Down controls to an existing list. */
export interface SortableListOptions {
  /** Receives the proposed complete item ID order; update application-owned state in this callback. */
  onReorder: (itemIds: string[]) => void;
}

/**
 * Enable sorting on direct list children with unique data-sortable-id attributes.
 * Buttons marked data-sortable-up or data-sortable-down are handled by delegation.
 * Returns an idempotent disposer; Nodula owners also dispose automatically.
 */
export function createSortableList(
  list: HTMLOListElement | HTMLUListElement,
  options: SortableListOptions,
): () => void;
