# Modals

The optional `nodula-framework/modal` add-on opens a native `<dialog>` containing safe text or caller-provided DOM content. It is separate from Nodula's core entry and injects its add-on styles once when used, so no stylesheet import or Vite plugin is required for the modal itself.

## Install and import

```js
import { showModal } from 'nodula-framework/modal';
```

## Quick start

```js
import { showModal } from 'nodula-framework/modal';

const modal = showModal('This content is inserted as text.', {
  title: 'A modal window',
  btn_close: 'Done',
  closeOnBackdrop: false,
});

await modal.closed;
```

## API reference

### `showModal(content, options?)`

Opens a modal and returns a `ModalHandle`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `content` | `string \| Node` | Yes | `'#element-id'` temporarily moves that element's children into the modal and restores the source element when closed. Other strings are inserted as text; DOM nodes and fragments are appended directly when `showHeader` is false. |
| `options` | `ModalOptions` | No | Optional title, close-button label, and backdrop behavior. |

`ModalOptions`:

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `''` | Optional heading. Without a title, dialog gets accessible name `Modal window`. |
| `btn_close` | `string` | `'Close'` | Visible close button text and accessible label. |
| `closeOnBackdrop` | `boolean` | `true` | Whether clicking the dialog backdrop (outside the dialog box) closes the modal. Clicks on the dialog's own padding do not close it. |
| `showHeader` | `boolean` | `true` | Whether to render the add-on's title/header and close button. Set to `false` when content supplies its own header and close control. |

`ModalHandle` contains `element: HTMLDialogElement`, `close(): void`, and `closed: Promise<void>`. The `closed` promise resolves after any supported close path completes. `ModalOptions` and `ModalHandle` are exported TypeScript interfaces. `openModal` remains a deprecated alias of `showModal`; use `showModal` in new code.

## Behavior and lifecycle

- A string beginning with `#` is treated as an element ID, not displayed as text. The add-on temporarily replaces the source element with a placeholder, moves its children into the modal, then restores the element and its children when the modal closes. If the ID is not found, `showModal()` throws `TypeError`. Other strings are assigned with `textContent`, so markup-looking strings remain text. A supplied DOM node is moved, not cloned.
- The modal has `role="dialog"` and `aria-modal="true"`. A supplied title is connected with `aria-labelledby`; without one, `aria-label="Modal window"` is used.
- Set `showHeader: false` to omit the generated header, title, and close button. A supplied DOM node or `DocumentFragment` is appended directly inside `<dialog>` so it can contain sibling custom-header and body elements; string content remains safely wrapped as text. The modal keeps an accessible name from `title` (or `Modal window`); custom close controls should call the returned handle's `close()` method.
- With `showHeader: false` and an ID reference, every element marked `[data-close-modal]` closes the modal automatically. For other supplied nodes/fragments, wire custom close controls to the returned handle's `close()` method.
- The close button receives focus when opened. When closed, focus returns to the previously active element if it is still connected and focusable.
- The close button, Escape/native cancel, native close event, and `handle.close()` close the modal. Backdrop clicks close it by default; set `closeOnBackdrop: false` to disable that path.
- When opened inside a Nodula root/effect, owner cleanup closes and removes the modal. Outside an owner, call `close()` or allow user dismissal. `closed` resolves on removal.
- The add-on injects modal styles into a `@layer nodula-addons` style element once per document. Styling can be overridden through application CSS.
- When native `HTMLDialogElement.showModal()` is unavailable, the implementation falls back to setting the `open` attribute. That fallback does not polyfill the browser's full modal focus and inertness behavior.

## Integration example

```js
const modal = showModal('#review-modal', {
  title: 'Review details',
  showHeader: false,
  closeOnBackdrop: false,
});

await modal.closed;
```

```html
<div hidden>
  <section id="review-modal">
    <header class="ui-modal__header">
      <h2 class="ui-modal__title">Review details</h2>
      <button class="ui-modal__close" type="button" data-close-modal>Close</button>
    </header>
    <div><p>Interactive HTML content goes below the custom header.</p></div>
  </section>
</div>
```

Use a string when plain text is sufficient. Construct DOM nodes with safe text APIs when content needs interactive elements.

## Errors, limitations, and security

- `content` must be a string or DOM node; invalid content throws `TypeError`.
- `title` and `btn_close` must be strings, and `closeOnBackdrop` and `showHeader` must be booleans; invalid options throw `TypeError`.
- Calling without a browser `document.body` throws an error. If native `showModal()` throws, the modal is removed and that error propagates.
- Passing a DOM node transfers that node into the modal. ID references temporarily move their source element's children and restore the source on close. If `showModal()` fails after lookup, the source is restored.
- Modal presentation is client-side UI, not authorization or validation. Enforce permissions and validate sensitive operations on the server.

## Examples and related resources

- The demo app's [`/modal` page](https://nodula.richardleurs.nl/modal) demonstrates text and DOM-node content in dialog, modal, and drawer add-ons; source is `demo_app/src/routes/modal.page`.
- See [Accessibility](/guide/accessibility), [Security](/guide/security), and [Dialogs](/guide/dialogs) for related guidance.
- Modal behavior tests: `framework/vitest/modal.test.js`.
