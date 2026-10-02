# Modals

The optional `nodula-framework/modal` add-on opens a native modal window without adding modal code to Nodula's core runtime.

```
import { openModal } from 'nodula-framework/modal';

const modal = openModal('This content is inserted as text.', {
  title: 'A modal window',
  closeText: 'Done',
  closeOnBackdrop: false,
});

await modal.closed;
```

Pass a string for safely rendered text or a DOM node for interactive content. `openModal` returns a handle with `element`, `close()`, and a `closed` promise. The window dismisses from its close button, Escape, backdrop click (enabled by default), or cleanup of its owning Nodula root; set `closeOnBackdrop: false` to require the explicit close button or `close()`. Focus returns to the previously focused element when possible.

## Demo

In the demo app, open the `/guide` route and select **Open example modal** to try the add-on.

The modal is client-side UI only; it does not replace server-side authorization or validation.

The modal's presentation rules are in the optional [framework stylesheet](/guide/framework-stylesheet). Import `nodula-framework/nodula-framework.css` once in your app entry to apply them.
