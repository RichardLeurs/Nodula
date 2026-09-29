Nodula already has a solid **UI foundation**: reactive DOM rendering, `.page`/`.comp` templates, scoped CSS, forms, routing, animations, and optional dialog, modal, drawer, navigation, and notification add-ons. The biggest gaps are less about adding more widgets and more about making UI behavior consistent, accessible, and easy to build on.

## Highest-priority improvements

1. **Accessibility and real-browser verification.**  
   The dialog-like add-ons use native `<dialog>` and restore focus on close, which is a good starting point. But fallback behavior when `showModal()` is unavailable only sets the `open` attribute; it doesn’t provide equivalent modal focus behavior. Add browser-level tests for keyboard use, focus entry/return, Escape and backdrop behavior, screen-reader names, and reduced-motion settings. The current spec also identifies automated accessibility and browser compatibility coverage as missing.  
   Relevant files: `/Users/richardleurs/Documents/Webserver/nodula/framework/addons/dialog.js`, `/Users/richardleurs/Documents/Webserver/nodula/framework/addons/modal.js`, `/Users/richardleurs/Documents/Webserver/nodula/framework/addons/drawer.js`, `/Users/richardleurs/Documents/Webserver/nodula/SPECS.md`.

2. **Reusable accessible form controls.**  
   The form add-on provides reactive values, validation, touched state, submission, and reset. The compiler supports `value` and `checked` bindings, but there isn’t a shared control layer for labels, descriptions, errors, disabled/loading states, and accessible relationships. A small optional package of form primitives—or well-documented recipes—could prevent every app from reimplementing those details.  
   Relevant files: `/Users/richardleurs/Documents/Webserver/nodula/framework/addons/form.js`, `/Users/richardleurs/Documents/Webserver/nodula/framework/compiler.js`.

3. **A clearer design-token and styling contract.**  
   There are framework styles and theme-aware demo styles, but a UI system benefits from a documented set of shared tokens for color, spacing, typography, borders, focus rings, and component states. Add-on styles also define shared color tokens independently, so it’s worth checking for order-dependent overrides when several stylesheets are used together.  
   Relevant files: `/Users/richardleurs/Documents/Webserver/nodula/framework/assets/nodula-framework.css`, `/Users/richardleurs/Documents/Webserver/nodula/framework/assets/nodula-dialog.css`, `/Users/richardleurs/Documents/Webserver/nodula/framework/assets/nodula-modal.css`, `/Users/richardleurs/Documents/Webserver/nodula/framework/assets/nodula-drawer.css`, `/Users/richardleurs/Documents/Webserver/nodula/framework/assets/nodula-notifications.css`.

4. **A deliberate component-library boundary.**  
   Nodula has some useful behavioral UI primitives, but not a broad visual component library: common pieces like buttons, fields, checkboxes, selects, menus, tabs, accordions, and tables are left to app authors. That may be the right choice for a small framework; decide whether Nodula aims to provide behavioral primitives, styled components, or both as an optional package.

## Good follow-up work

- Add examples and recipes showing composition: an accessible form, confirmation flow, responsive navigation, and loading/empty/error states.
- Keep browser rendering and accessibility behavior covered separately from `happy-dom` tests.
- Measure representative updates before optimizing reconciliation; the existing keyed DOM logic is a candidate for measurement, not necessarily a problem to fix preemptively.
- Treat SSR/hydration and CSS modules as optional strategic choices; both are already listed as unimplemented in `/Users/richardleurs/Documents/Webserver/nodula/SPECS.md`, but neither is required to improve the current client-side UI experience.

**Recommended order:** accessibility/browser tests first, then settle the design-token contract, then add or document reusable form controls. That improves the UI most without turning the core into a large component framework.



Based on the current checkout, I’d prioritize the work like this:



## P1 — Establish real-browser and accessibility checks
The existing suite uses Node and Happy DOM; the spec itself says real-browser and accessibility automation are still missing. Add a small browser matrix and automated checks for keyboard navigation, focus management, and accessible names—especially for the router and dialog-like add-ons.

## P2 — Decide whether broader rendering features are in scope
SSR/hydration, catch-all routes, arbitrary binding expressions, and broader template/component behavior are explicitly limited or absent. These are substantial features; prioritize them only if Nodula’s goals require server rendering or a more complete application framework.

## P2 — Measure runtime size and performance
The spec has runtime-size targets, but they are not yet measured. Add repeatable bundle-size and representative update benchmarks before optimizing against a target.
