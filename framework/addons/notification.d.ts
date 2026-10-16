export type NotificationType = "error" | "success" | "warning" | "info";
export type NotificationPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface NotificationOptions {
  /** Visual and accessible notification variant. Defaults to "info". */
  type?: NotificationType;
  /** Short heading shown above the message. */
  title: string;
  /** Notification body text. */
  message: string;
  /** Screen position. Defaults to "top-right". */
  position?: NotificationPosition;
  /** Auto-dismiss delay in milliseconds. Use 0 to keep it open until dismissed. Defaults to 5000. */
  duration?: number;
  /** Accessible label for the dismiss button. */
  closeText?: string;
}

export interface NotificationHandle {
  /** The notification element. */
  element: HTMLDivElement;
  /** Begin dismissing the notification. */
  close: () => void;
  /** Resolves when the notification has been removed. */
  closed: Promise<void>;
}

/** Show an error, success, warning, or informational notification. */
export function showNotification(options: NotificationOptions): NotificationHandle;
