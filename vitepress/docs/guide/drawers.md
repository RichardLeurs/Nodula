# Side drawers

The optional `nodula-framework/drawer` add-on opens an accessible modal side panel without adding drawer code to Nodula's core runtime.

```
import { openDrawer } from 'nodula-framework/drawer';

const drawer = openDrawer('Your drawer content goes here.', {
  title: 'Account details',
  closeText: 'Close panel',
  closeOnBackdrop: false,
  position: 'right',
});

await drawer.closed;
```

Content may be a string (inserted as text) or an existing DOM node. `openDrawer` returns a handle containing `element`, `close()`, and a `closed` promise. Set `position` to `'left'` or `'right'` to choose the edge the drawer enters from; it defaults to `'right'`. The drawer closes from its close button, Escape, backdrop clicks (enabled by default), or owner cleanup. Set `closeOnBackdrop: false` to disable backdrop-click dismissal. Focus is restored to the previously focused element when the drawer closes.

## Demo

Open the demo app's `/guide` route and select **Open example side drawer**.

The drawer's presentation rules are in the optional [framework stylesheet](/guide/framework-stylesheet). Import `nodula-framework/nodula-framework.css` once in your app entry to apply them.
