export type DragEffectAllowed =
  | "none"
  | "copy"
  | "copyLink"
  | "copyMove"
  | "link"
  | "linkMove"
  | "move"
  | "all";
export type DragDropEffect = "copy" | "link" | "move";

export interface DragImageOptions {
  /** Element used for native drag feedback; should be rendered when dragstart fires. */
  element: Element;
  /** Horizontal hotspot offset in CSS pixels. Defaults to 0. */
  x?: number;
  /** Vertical hotspot offset in CSS pixels. Defaults to 0. */
  y?: number;
}

export interface DragSourceOptions {
  /** Return plain string data keyed by native DataTransfer type during dragstart. */
  getData: (event: DragEvent) => Record<string, string>;
  /** Optionally return an element and hotspot for native DataTransfer.setDragImage(). */
  getDragImage?: (event: DragEvent) => DragImageOptions | null | undefined;
  /** Native allowed operation. Defaults to "move". */
  effectAllowed?: DragEffectAllowed;
  onDragStart?: (event: DragEvent) => void;
  onDragEnd?: (event: DragEvent) => void;
}

export interface DropTargetOptions {
  /** Transfer types to accept. Use "Files" to accept external file drops. */
  accepts: string[];
  /** Native drop feedback operation. Defaults to "move". */
  dropEffect?: DragDropEffect;
  onDragEnter?: (event: DragEvent) => void;
  onDragLeave?: (event: DragEvent) => void;
  onDragOver?: (event: DragEvent) => void;
  /** Read transfer data synchronously here; DataTransfer is event-scoped. */
  onDrop?: (event: DragEvent, dataTransfer: DataTransfer) => void;
}

/** Set draggable=true and write provided data during native dragstart. Returns an idempotent disposer. */
export function createDragSource(element: Element, options: DragSourceOptions): () => void;
/** Accept matching native drag types and report drops without moving DOM nodes. Returns an idempotent disposer. */
export function createDropTarget(element: Element, options: DropTargetOptions): () => void;
