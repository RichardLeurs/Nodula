export interface ModalOptions {
  /** Optional heading displayed at the top of the modal. */
  title?: string;
  /** Visible label for the close button. Defaults to "Close". */
  btn_close?: string;
  /** Whether clicking the backdrop closes the modal. Defaults to true. */
  closeOnBackdrop?: boolean;
}

export interface ModalHandle {
  /** The native dialog element containing the modal content. */
  element: HTMLDialogElement;
  /** Close the modal and restore focus to the previously focused element. */
  close: () => void;
  /** Resolves when the modal is closed by any supported dismissal path. */
  closed: Promise<void>;
}

/** Show a modal containing safe text or an existing DOM node. */
export function showModal(content: string | Node, options?: ModalOptions): ModalHandle;
/** @deprecated Use `showModal` instead. */
export const openModal: typeof showModal;