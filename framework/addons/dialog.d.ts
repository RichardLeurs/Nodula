export interface DialogOptions {
  /** Optional heading displayed above the message. */
  title?: string;
  /** Label for the button that resolves the dialog to false. Defaults to "Cancel". */
  btn_cancel?: string;
  /** Label for the button that resolves the dialog to true. Defaults to "OK". */
  btn_ok?: string;
}

/** Show a message with an optional title and configurable button labels. Resolves true for OK and false for Cancel/dismissal. */
export function showDialog(message: string, options?: DialogOptions): Promise<boolean>;