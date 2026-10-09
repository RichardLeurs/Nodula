# Navigation

The optional `nodula-framework/navigation` add-on creates semantic, accessible links from a Nodula router and an item list. It is separate from the core and router package entries, so apps can opt into this DOM helper only when needed. It tracks the current route, marks the matching internal link with `aria-current="page"`, and returns a disposer to remove its reactive effect and generated DOM.

## Install and import

Import the router and navigation helper from their separate package entries:

```js
import { createRouter } from 'nodula-framework/router';
import { createNavigation } from 'nodula-framework/navigation';
```

The add-on uses native DOM APIs and requires no stylesheet or Vite plugin.

## Quick start

```js
import { createRouter } from 'nodula-framework/router';
import { createNavigation } from 'nodula-framework/navigation';

const router = createRouter(routes);
const disposeNavigation = createNavigation(document.querySelector('#navigation'), router, [
  { label: 'Home', href: '/' },
  { label: 'Guide', href: '/guide' },
  { label: 'Nodula website', href: 'https://sprigjs.richardleurs.nl/', external: true },
  { label: 'External in this tab', href: 'https://example.com/docs', external: true, target: '_self' },
], {
  label: 'Main navigation',
  className: 'site-nav',
  linkClassName: 'nav-link',
  activeClassName: 'nav-link--active',
});

// Call when removing this navigation from the page.
disposeNavigation();
```

## API reference

### `createNavigation(target, router, items, options?)`

Creates links in a target element and returns an idempotent disposer.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `target` | `Element` | Yes | A container where a new `<nav>` is appended, or an existing `<nav>` to populate directly. |
| `router` | `NavigationRouter` | Yes | Nodula router with reactive `current()` accessor, `navigate(path)`, and `mode` set to `'hash'` or `'history'`. |
| `items` | `NavigationItem[]` | Yes | Link definitions, rendered in array order. |
| `options` | `NavigationOptions` | No | Accessible label and CSS class names. |

`NavigationItem` fields:

| Field | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Link text, assigned as text content. |
| `href` | `string` | — | Internal router path beginning with `/`, or absolute URL when `external: true`. |
| `external` | `boolean` | `false` | Keep link outside router handling; only `true` opts into external URL validation. |
| `target` | `'_blank' \| '_self'` | `'_blank'` for external links | External browsing context. Internal items must not specify `target`. |

`NavigationOptions`:

| Option | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'Primary navigation'` | Value assigned to the nav element's `aria-label`. |
| `className` | `string` | `''` | Whitespace-separated classes applied to the `<nav>`. |
| `linkClassName` | `string` | `''` | Class string applied to each generated link. |
| `activeClassName` | `string` | `'is-active'` | Class toggled on the active internal link; empty string disables this class. |

The helper also exports `NavigationRouter`, `NavigationItem`, and `NavigationOptions` TypeScript interfaces. `mountNavigation` remains as a deprecated alias of `createNavigation`; use `createNavigation` for new code.

## Behavior and lifecycle

- If `target` is not a `<nav>`, the helper appends a new semantic `<nav>` inside it. If `target` is already a `<nav>`, generated links are appended directly to it.
- Hash-mode internal links receive `#`-prefixed `href` values; history-mode links use their path directly. Router changes update `aria-current="page"` and `activeClassName` reactively. Active matching is exact against `router.current()`.
- External links are not active and are left to browser navigation. By default they open in a new tab with `rel="noopener noreferrer"`; `target: '_self'` opens in the current tab.
- The disposer stops route tracking and removes generated links. For a created `<nav>`, it removes the nav; for an existing `<nav>`, it restores its previous `aria-label` and removes the class tokens listed by `className` (including any matching tokens that were already present), while leaving unrelated children and classes intact.
- When rebuilding navigation from reactive app state, dispose the previous instance before creating the replacement, as the demo shell does.

## Integration example

```js
const router = createRouter(routes);
const disposeNavigation = createNavigation(
  document.querySelector('#site-header'),
  router,
  [
    { label: 'Home', href: '/' },
    { label: 'Guide', href: '/guide' },
  ],
  { label: 'Main navigation', linkClassName: 'nav-link' },
);

// During application teardown:
disposeNavigation();
```

This is browser-side DOM integration. The helper provides navigation semantics and route-aware presentation; it does not define routes, authorize access, or enforce server-side permissions.

## Errors, limitations, and security

- Throws `TypeError` if the target is not an element, router does not expose the expected Nodula-router shape, items are not an array, option labels/classes are not strings, or an item lacks string `label`/`href` values.
- Internal paths must start with `/` and cannot specify `target`. An item is external only when `external: true`.
- External `href` must be an absolute HTTP or HTTPS URL. Other schemes, and URLs containing username or password credentials, are rejected. External `target` accepts only `_blank` or `_self`.
- Links use `textContent` for labels rather than interpreting labels as HTML.
- Active-link indication is presentation, not authorization. Protect private pages and data at the server/API boundary; hiding or marking links cannot secure resources.

## Related resources

- The demo header builds navigation in `demo_app/src/AppShell.page`; the [demo `/addons` page](https://nodula.richardleurs.nl/addons) shows the add-on import.
- See [Routing](/guide/routing) for router setup and [Accessibility](/guide/accessibility) for accessible navigation practices.
- Navigation behavior tests: `framework/vitest/navigation.test.js`.
