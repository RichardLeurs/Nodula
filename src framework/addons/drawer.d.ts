export interface DrawerOptions {
  /** Optional heading displayed in the drawer header. */
  title?: string;
  /** Visible label for the close button. Defaults to "Close". */
  closeText?: string;
  /** Whether clicking the backdrop closes the drawer. Defaults to true. */
  closeOnBackdrop?: boolean;
  /** Which viewport edge the drawer enters from. Defaults to "right". */
  position?: 'left' | 'right';
}

export interface DrawerHandle {
  /** The native dialog element containing the side drawer. */
  element: HTMLDialogElement;
  /** Close the drawer and restore focus to the previously focused element. */
  close: () => void;
  /** Resolves when the drawer is closed by any supported dismissal path. */
  closed: Promise<void>;
}

/** Open a modal side drawer containing safe text or an existing DOM node. */
export function openDrawer(content: string | Node, options?: DrawerOptions): DrawerHandle;