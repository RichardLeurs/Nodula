# Dialogs

The optional `nodula-framework/dialog` add-on provides a focused browser confirmation prompt with a message and Cancel/OK actions. It uses native `<dialog>`, injects its small stylesheet once, and stays outside the core package entry. It returns a promise rather than making authorization decisions; the application remains responsible for the action and its server-side checks.

## Install and import

```js
import { showDialog } from 'nodula-framework/dialog';
```

No Vite plugin or explicit stylesheet import is required; the add-on injects its styles into the document head on first use.

## Quick start

```js
import { showDialog } from 'nodula-framework/dialog';

const accepted = await showDialog('Save these changes?', {
  title: 'Confirm save',
  btn_cancel: 'Keep editing',
  btn_ok: 'Save changes',
});
if (accepted) {
  await saveChanges();
}
```

## API reference

### `showDialog(message, options?)`

Displays a modal confirmation dialog and returns `Promise<boolean>`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `message` | `string` | Yes | Message text. Inserted as text, not parsed as HTML. |
| `options` | `DialogOptions` | No | Optional title and button labels. |

`DialogOptions`:

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | Omitted | Optional heading. When omitted, dialog receives accessible name `Confirmation dialog`; when present, heading labels it. |
| `btn_cancel` | `string` | `'Cancel'` | Cancel button label. Resolves `false`. |
| `btn_ok` | `string` | `'OK'` | Confirmation button label. Resolves `true`. |

The package also exports the TypeScript interface `DialogOptions`.

## Behavior and lifecycle

- `showDialog()` resolves `true` when OK is activated. Cancel, Escape/native cancel, backdrop dismissal, closing the native dialog, or disposal of the current Nodula owner resolves `false`.
- The dialog uses native `<dialog>` with `role="alertdialog"`, `aria-modal="true"`, and an accessible label/description. It focuses OK when opened and restores focus to the previously focused connected element when it closes.
- Title and message are assigned through `textContent`; markup-looking input remains text.
- The dialog element, event listeners, and promise settle once on close. When called inside a Nodula root/effect, owner cleanup dismisses and removes the dialog. Outside an owner, it remains until the user dismisses or accepts it.
- Add-on CSS is injected into a `@layer nodula-addons` style element once per document. Existing app CSS can override it in a later cascade layer.

## Errors and limitations

- A non-string `message`, non-string `title`, or non-string button label throws `TypeError` synchronously.
- Without a browser `document.body`, the returned promise rejects with an error. If opening the native dialog throws, the dialog is removed and the promise rejects with that error.
- This is a confirmation UI, not a security control. A user can bypass the prompt or call application APIs directly; validate and authorize sensitive actions on the server.
- `showDialog` accepts text only, not custom DOM content. For richer interactive content, use the separate [Modal add-on](/guide/modals).

## Examples and related resources

- The demo app's [`/modal` page](https://nodula.richardleurs.nl/modal) includes a confirmation example; implementation is in `demo_app/src/routes/modal.page`.
- See [Accessibility](/guide/accessibility) for accessible interaction guidance and [Security](/guide/security) for server-side authorization boundaries.
- Dialog behavior tests: `framework/vitest/dialog.test.js`.
