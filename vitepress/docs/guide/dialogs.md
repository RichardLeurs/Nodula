# Dialogs

The optional `nodula-framework/dialog` add-on provides a simple confirmation dialog with a message and **Cancel**/**OK** buttons:

```
import { showDialog } from 'nodula-framework/dialog';

const accepted = await showDialog('Save these changes?', {
  title: 'Confirm save',
  cancelText: 'Keep editing',
  okText: 'Save changes',
});
if (accepted) {
  await saveChanges();
}
```

`showDialog(message, options?)` returns a promise: it resolves to `true` when the OK button is selected and `false` when the Cancel button, Escape, backdrop dismissal, or the owning Nodula root's cleanup closes it. Set `options.title` to show an optional heading, and use `options.cancelText` and `options.okText` to customize the button labels; they default to **Cancel** and **OK**. When a title is supplied, it labels the dialog for assistive technology. The dialog uses the native `<dialog>` element, focuses the OK button initially, restores the previous focus when it closes, and inserts the title and message as text rather than HTML.

The add-on is imported separately, so it does not add dialog code to the core runtime. Dialog state is client-side only; do not treat a confirmation as authorization for a server operation.

The dialog's presentation rules are in the optional [framework stylesheet](/guide/framework-stylesheet). Import `nodula-framework/nodula-framework.css` once in your app entry to apply them.
