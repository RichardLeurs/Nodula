# Notifications

The optional `nodula-framework/notifications` add-on displays accessible, transient status messages using native DOM and an injected stylesheet. It is a separate package entry, so apps that do not need notifications avoid its runtime code in the core import.

## Install and import

```js
import { showNotification } from 'nodula-framework/notifications';
```

No Vite plugin or stylesheet import is required; the add-on injects its styles into the document head on first use.

## Quick start

```js
import { showNotification } from 'nodula-framework/notifications';

const notification = showNotification({
  type: 'success',
  title: 'Changes saved',
  message: 'Your profile has been updated.',
  position: 'top-right',
  duration: 5000,
});

// Optionally wait until notification has been removed.
await notification.closed;
```

## API reference

### `showNotification(options)`

Displays a notification and returns a `NotificationHandle`.

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `type` | `'error' \| 'success' \| 'warning' \| 'info'` | No | `'info'` | Visual style and announcement role. Errors use `role="alert"`; other types use `role="status"`. |
| `title` | `string` | Yes | — | Non-empty heading text. |
| `message` | `string` | Yes | — | Non-empty message text. |
| `position` | `'top-left' \| 'top-center' \| 'top-right' \| 'bottom-left' \| 'bottom-center' \| 'bottom-right'` | No | `'top-right'` | Position of its shared notification container. |
| `duration` | `number` | No | `5000` | Auto-dismiss delay in milliseconds. Must be finite and non-negative. `0` disables auto-dismiss. |
| `closeText` | `string` | No | `'Dismiss notification'` | Accessible label for the dismiss button; must be non-empty. |

The package exports `NotificationType`, `NotificationPosition`, `NotificationOptions`, and `NotificationHandle` TypeScript types. A handle contains `element: HTMLDivElement`, `close(): void`, and `closed: Promise<void>`.

## Behavior and lifecycle

- Notifications with the same position share a live region container. Separate positions create separate containers; empty containers are removed after their last notification closes.
- Title and message are assigned as text, never interpreted as HTML. Each notification references its heading and message with `aria-labelledby` and `aria-describedby`.
- The shared container uses `role="region"`, `aria-live="polite"`, and `aria-relevant="additions"`. Individual error messages use `role="alert"`; success, warning, and info use `role="status"`.
- `close()` begins the exit transition. The notification is removed when its exit animation ends, with a 250 ms fallback if animation events do not arrive. `closed` resolves after removal, not when dismissal begins.
- A positive `duration` starts automatic dismissal after that many milliseconds. `duration: 0` leaves the notification visible until `close()` or owner cleanup.
- Notifications created inside a Nodula owner begin closing when it is disposed. Outside an owner, callers should close notifications when appropriate or rely on the positive default duration.
- Entrance and exit animations are disabled by the add-on stylesheet when `prefers-reduced-motion: reduce` is active.
- Styles are injected once into a `@layer nodula-addons` style element; they remain after notifications close.

## Integration example

```js
async function submitProfile() {
  try {
    await saveProfile();
    const notice = showNotification({
      type: 'success',
      title: 'Profile saved',
      message: 'Your changes are ready.',
    });
    await notice.closed;
  } catch (error) {
    showNotification({
      type: 'error',
      title: 'Save failed',
      message: error instanceof Error ? error.message : 'Please try again.',
      duration: 0,
    });
  }
}
```

## Errors, limitations, and accessibility

- Invalid options throw `TypeError`: options must be a non-array object; title, message, and `closeText` must be non-empty strings; type and position must be supported values; duration must be a finite number greater than or equal to zero.
- Calling without a browser `document.body` throws an error.
- Notifications are client-side presentation, not durable records or proof that an operation succeeded. Show success only after the operation succeeds, and never rely on a notification to authorize an action.
- Auto-dismiss messages can disappear before some users can read them. Consider longer durations or `duration: 0` for important content; retain a clear dismiss control and avoid using transient notices as the only way to expose critical errors.
- Text content is safe from HTML interpretation, but applications remain responsible for choosing concise, useful messages and handling sensitive data appropriately.

## Examples and related resources

- The demo form shows a success notification after submission: `demo_app/src/routes/forms.page`.
- See [Accessibility](/guide/accessibility) and [Security](/guide/security) for related guidance.
- Notification behavior tests: `framework/vitest/notifications.test.js`.
