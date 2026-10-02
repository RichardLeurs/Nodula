# Notifications

The optional `nodula-framework/notifications` add-on displays transient messages without adding notification code to the core runtime.

```
import { showNotification } from 'nodula-framework/notifications';

const notification = showNotification({
  type: 'success',
  title: 'Changes saved',
  message: 'Your profile has been updated.',
  position: 'top-right',
  duration: 5000,
});
```

Choose `type: 'error'`, `'success'`, `'warning'`, or `'info'`; it controls the notification accent color and accessible announcement role. A title and message are required and are inserted as text, not HTML. Positions are `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, and `bottom-right`. The default position is `top-right` and the default auto-dismiss delay is 5000 ms. Set `duration: 0` to keep a notification open until it is closed.

`showNotification()` returns `{ element, close, closed }`. Call `close()` to dismiss it, or await `closed` to know when its exit animation has finished and it has been removed. Notifications created inside a Nodula root are dismissed when that root is disposed. Entrance and exit animations respect the user's reduced-motion preference.
