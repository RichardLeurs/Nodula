# Accessibility

Nodula renders standard DOM and uses browser events; it does not automatically make an interface accessible. Choose semantic HTML, provide names and instructions, preserve keyboard behavior, communicate state changes, and test the finished application with keyboard and assistive technology. Framework tests exercise DOM behavior but are not a substitute for accessibility audits or real-browser testing.

## Start with native HTML

Use the element that already provides the required interaction. Native buttons, links, forms, headings, and landmarks have built-in keyboard and accessibility semantics that a clickable `<div>` does not.

```html
<script>
function save(event) {
  event.preventDefault();
  // Validate and submit through the application's data layer.
}
</script>

<template>
  <main>
    <h1>Profile settings</h1>
    <form @submit="save($event)">
      <label for="display-name">Display name</label>
      <input id="display-name" name="displayName" autocomplete="name" />
      <button type="submit">Save profile</button>
    </form>
  </main>
</template>
```

Associate form controls with visible labels. Use meaningful button/link text, logical heading order, landmarks, and native validation or clearly associated error text where appropriate. Use `aria-*` to provide or update semantics when HTML alone is insufficient; do not add redundant ARIA roles that conflict with native semantics.

## Keyboard, focus, and state

Every interactive action should work without a pointer. Keep native tab order unless there is a well-tested reason to change it. Provide a visible focus indicator and ensure opening overlays moves focus appropriately and closing them returns focus to a useful, still-connected control.

Represent state in ways assistive technology can perceive: use native `disabled` when an action is unavailable, `aria-expanded` for disclosure controls, `aria-current="page"` for the current navigation link, and live/status regions for important asynchronous updates. Ensure accessible names describe purpose rather than appearance alone, especially for icon-only controls.

Nodula event handlers attach native listeners; they do not add keyboard behavior to non-semantic elements. For example, do not replace a button with `<span @click="save()">` unless you also implement and test focusability, keyboard activation, role, and state behavior. See [Event Handling](/guide/event-handling).

## Dialogs, modals, and drawers

Nodula's dialog, modal, and drawer add-ons use native `<dialog>`, provide an accessible name, focus a control when opened, handle dismissal, and restore focus to the previous connected element when closed. String content is inserted with `textContent`, not interpreted as markup. See [Dialogs](/guide/dialogs), [Modals](/guide/modals), and [Drawers](/guide/drawers).

The native `showModal()` path provides browser modal behavior. If `showModal()` is unavailable, these add-ons fall back to setting the `open` attribute; that fallback does **not** polyfill full modal focus management or background inertness. Verify fallback environments and do not treat an open dialog as proof that keyboard focus is contained correctly.

For custom overlays, define and test the complete interaction: accessible name/description, initial focus, keyboard navigation, Escape behavior, focus restoration, and background interaction. Prefer native `<dialog>` behavior when it fits the requirement.

## Motion and visual presentation

Do not communicate meaning through color, animation, or position alone. Maintain readable contrast, allow zoom and text resizing, and ensure responsive layouts do not hide controls or force unnecessary horizontal scrolling.

The optional animation add-on respects `prefers-reduced-motion` by default. Application-authored CSS transitions, carousels, scroll behavior, and other custom motion need their own reduced-motion treatment:

```css
@media (prefers-reduced-motion: reduce) {
  .notice,
  .notice__icon {
    animation: none;
    scroll-behavior: auto;
    transition: none;
  }
}
```

See [Animations](/guide/animations) for add-on behavior and limitations.

## Dynamic content and safe text

Use text interpolation, `textContent`, or DOM construction for untrusted/user-provided text. Do not treat escaping or client-side rendering as a complete security boundary; validate and encode data at the appropriate server/output context too. For rich content, use a deliberate sanitization policy before inserting HTML and test its allowed markup. See [Security](/guide/security).

For async updates, expose progress and errors as text and, where suitable, an announced status region. Avoid moving focus unexpectedly when a background update completes. Nodula has no automatic accessibility announcer; the application chooses status semantics and timing.

## Practical review checklist

- Can all actions be reached and completed with keyboard alone?
- Is focus visible, and does it move/return sensibly for dialogs, route changes, and conditional UI?
- Do controls have programmatic names, labels, roles, and current/expanded/disabled states where needed?
- Are form errors connected to their controls and described in plain language?
- Are dynamic loading, success, and error states perceivable without relying on color or animation?
- Does reduced-motion mode avoid nonessential movement?
- Does the UI remain usable at zoomed text sizes and narrow viewports?
- Have you tested representative flows with a screen reader and real browser, not only DOM tests?

## Testing boundaries

The repository's Vitest suites use Node with `happy-dom`; they verify selected DOM structure and interactions, not complete browser accessibility trees, screen-reader output, visual contrast, or assistive-technology behavior. There is no shipped automatic accessibility audit suite or conformance guarantee. Include manual keyboard/screen-reader review and suitable automated checks in the consuming application's browser CI. See [Testing](/guide/testing) and [Specifications and Limits](/guide/specifications).

## Related guides

- [Forms and Validation](/guide/forms) — accessible field and validation behavior.
- [Event Handling](/guide/event-handling) — native keyboard/pointer events and cleanup.
- [Dialogs](/guide/dialogs), [Modals](/guide/modals), and [Drawers](/guide/drawers) — overlay behavior.
- [Security](/guide/security) — untrusted content and server trust boundaries.
- [Testing](/guide/testing) — repository test environments and limits.