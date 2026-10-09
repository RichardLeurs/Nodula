# Side drawers

The optional `nodula-framework/drawer` add-on opens an accessible, native `<dialog>` side panel with safe text or caller-provided DOM content. It is a separate package entry, so drawer code stays out of core imports. The add-on injects its styles once when used; no Vite plugin or stylesheet import is required for basic setup.

## Install and import

```js
import { showDrawer } from 'nodula-framework/drawer';
```

## Quick start

```js
import { showDrawer } from 'nodula-framework/drawer';

const drawer = showDrawer('Your drawer content goes here.', {
  title: 'Account details',
  btn_close: 'Close panel',
  closeOnBackdrop: false,
  position: 'right',
});

await drawer.closed;
```

## API reference

### `showDrawer(content, options?)`

Opens a side drawer and returns a `DrawerHandle`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `content` | `string \| Node` | Yes | String is inserted as text; a DOM node is moved into the drawer body. |
| `options` | `DrawerOptions` | No | Optional title, close label, backdrop behavior, and side. |

`DrawerOptions`:

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `''` | Optional heading. Without one, drawer receives accessible name `Side drawer`. |
| `btn_close` | `string` | `'Close'` | Visible close-button text and accessible label. |
| `closeOnBackdrop` | `boolean` | `true` | Whether clicking outside panel area closes the drawer. |
| `position` | `'left' \| 'right'` | `'right'` | Which viewport edge the drawer enters from. |

`DrawerHandle` contains `element: HTMLDialogElement`, `close(): void`, and `closed: Promise<void>`. The promise resolves after any supported close path. The add-on exports TypeScript interfaces `DrawerOptions` and `DrawerHandle`. `openDrawer` remains a deprecated alias of `showDrawer`; use `showDrawer` in new code.

## Behavior and lifecycle

- A string is assigned through `textContent`, so HTML-looking content remains text. A DOM node is appended (moved, not cloned) into the drawer body.
- The drawer uses `role="dialog"` and `aria-modal="true"`. Its title is connected through `aria-labelledby`; without a title, it uses `aria-label="Side drawer"`.
- The close button receives focus after opening. Closing restores focus to the previously active connected element when possible.
- The close button, Escape/native cancel, native close event, and `handle.close()` close the drawer. By default, clicks on the native dialog backdrop also close it; clicks within the drawer panel do not. Set `closeOnBackdrop: false` to disable backdrop dismissal.
- `position: 'left'` or `'right'` selects panel side and matching CSS class; default is right.
- When created inside a Nodula root/effect, owner cleanup closes and removes the drawer. Outside an owner, call `close()` or allow user dismissal. `closed` resolves when the drawer is removed.
- The add-on injects drawer styles into a `@layer nodula-addons` style element once per document. The shared [framework stylesheet](/guide/framework-stylesheet) also includes overlay styles if an app chooses to import it.
- If native `HTMLDialogElement.showModal()` is unavailable, the implementation falls back to an `open` attribute; this fallback does not polyfill native modal inertness or focus management.

## Integration example

```js
const content = document.createElement('form');
const email = document.createElement('input');
email.type = 'email';
email.setAttribute('aria-label', 'Email address');
content.append(email);

const drawer = showDrawer(content, {
  title: 'Account details',
  btn_close: 'Done',
  position: 'left',
  closeOnBackdrop: false,
});

await drawer.closed;
```

Use text content when no interaction is needed; create DOM elements with safe DOM APIs for interactive content.

## Errors, limitations, and security

- Content must be a string or DOM node. Invalid content throws `TypeError`.
- `title` and `btn_close` must be strings, `closeOnBackdrop` must be boolean, and `position` must be `'left'` or `'right'`; invalid options throw `TypeError`.
- Calling without a browser `document.body` throws an error. If `showModal()` throws, the drawer is removed and the browser error propagates.
- A supplied DOM node is moved from its current parent into the drawer. Move it back or create another node if application code needs it elsewhere after closing.
- Drawer UI does not authorize actions or protect data. Enforce permissions and validate protected operations on the server.

## Examples and related resources

- The demo [`/modal` page](https://nodula.richardleurs.nl/modal) includes a drawer example in `demo_app/src/routes/modal.page`.
- See [Accessibility](/guide/accessibility), [Security](/guide/security), and [Modals](/guide/modals) for related guidance.
- Drawer behavior tests: `framework/vitest/drawer.test.js`.
