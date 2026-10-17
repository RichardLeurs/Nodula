/** Attach native vertical drag sorting and delegated Move Up/Down controls to an existing list. */
export interface SortableListOptions {
  /** Receives the proposed complete item ID order; update application-owned state in this callback. */
  onReorder: (itemIds: string[]) => void;
  /**
   * Live-region message after a reorder, or `false` to disable the built-in announcement.
   * Defaults to "Moved to position {position} of {total}."; supply a function to localize it.
   */
  announce?: false | ((details: SortableAnnouncement) => string);
}

export interface SortableAnnouncement {
  /** data-sortable-id of the moved row. */
  id: string;
  /** New 1-based position. */
  position: number;
  total: number;
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
