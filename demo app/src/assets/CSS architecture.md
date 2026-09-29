

# Nodula UI Specification v1.0
Below is a Nodula UI Specification v1.0** designed around the philosophy we established: **small, composable, predictable, and framework-independent**.

Uses BEM naming in CSS, BEM stands for Block – Element – Modifier. It gives UI components predictable class names.

## 1. Design philosophy

Nodula UI follows five principles:

1. **Composition over complexity** — large UI patterns are assembled from small components.
2. **One vocabulary** — the same naming and structure is used throughout the UI.
3. **Semantic HTML first** — CSS enhances HTML rather than replacing it.
4. **State through modifiers** — variants and states use predictable modifiers.
5. **Minimal API** — components should expose only the structure and options that are actually useful.

### Naming convention

Implemented UI classes use the `ui-` namespace. A component is the base name,
its elements use `__`, and its variants use `--`:

```text
ui-component
ui-component__element
ui-component--variant
ui-component.is-state
```

Example from the implemented panel classes:

```html
<div class="ui-panel ui-panel--raised">
    <div class="ui-panel__header">
        <h2 class="panel-title">Settings</h2>
    </div>

    <div class="ui-panel__body">
        ...
    </div>
</div>
```

Use the same `ui-` prefix for design-token custom properties, such as
`--ui-color-text`, `--ui-space-4`, and `--ui-radius-medium`. Native element
selectors, third-party Highlight.js classes, and the app-specific
`auth-demo-*` classes are exceptions rather than UI component names.

### Classes implemented in `app.css`

This inventory describes the UI class families currently styled in
`src/assets/app.css`. The later sections in this document also describe
possible components for the wider UI specification; those names are proposals
unless they appear in this implemented inventory.

```text
Application shell
├── ui-app
├── ui-site-header
├── ui-brand
│   ├── ui-brand__logo
│   ├── ui-brand__mark
│   ├── ui-brand__name
│   └── ui-brand__version
├── ui-site-nav
│   └── ui-nav-link
│       └── ui-nav-link--active
├── ui-header-actions
├── ui-auth-toggle
│   └── ui-auth-toggle__loading
├── ui-theme-toggle
│   ├── ui-theme-toggle__sun
│   └── ui-theme-toggle__moon
├── ui-github-link
└── ui-site-footer

Layout and content primitives
├── ui-page
│   ├── ui-page__header
│   ├── ui-page__eyebrow
│   ├── ui-page__title
│   └── ui-page__description
├── ui-section
│   ├── ui-section__header
│   ├── ui-section__title
│   └── ui-section__description
├── ui-stack
│   └── ui-stack--tight
├── ui-cluster
│   ├── ui-cluster--wrap
│   └── ui-cluster--end
└── ui-grid
    ├── ui-grid--2
    ├── ui-grid--3
    └── ui-grid--auto

Panels and cards
├── ui-panel
│   ├── ui-panel--raised
│   ├── ui-panel--bordered
│   ├── ui-panel--flat
│   ├── ui-panel__header
│   ├── ui-panel__body
│   ├── ui-panel__footer
│   ├── ui-panel__title
│   └── ui-panel__description
└── ui-card
    ├── ui-card--compact
    ├── ui-card--interactive
    ├── ui-card__header
    ├── ui-card__title
    ├── ui-card__description
    └── ui-card__footer

Controls and feedback
├── ui-button
│   ├── ui-button--primary
│   ├── ui-button--secondary
│   ├── ui-button--outline
│   ├── ui-button--ghost
│   ├── ui-button--small
│   └── ui-button--large
├── ui-input
│   └── ui-input--invalid
├── ui-select
├── ui-textarea
├── ui-checkbox
│   └── ui-checkbox__control
├── ui-field
│   ├── ui-field--invalid
│   ├── ui-field__label
│   ├── ui-field__required
│   ├── ui-field__description
│   └── ui-field__error
├── ui-form__body
├── ui-form__dirty
├── ui-form__success
├── ui-alert
│   ├── ui-alert--info
│   ├── ui-alert--success
│   ├── ui-alert--danger
│   ├── ui-alert__icon
│   ├── ui-alert__content
│   ├── ui-alert__title
│   └── ui-alert__text
├── ui-badge
│   ├── ui-badge--neutral
│   ├── ui-badge--primary
│   ├── ui-badge--success
│   ├── ui-badge--warning
│   └── ui-badge--danger
└── ui-link

Data, display, and demo patterns
├── ui-token-swatch
│   ├── ui-token-swatch--primary
│   ├── ui-token-swatch--surface
│   ├── ui-token-swatch--success
│   ├── ui-token-swatch--warning
│   └── ui-token-swatch--danger
├── ui-avatar
│   ├── ui-avatar--primary
│   ├── ui-avatar--success
│   └── ui-avatar--info
├── ui-code
├── ui-code-block
├── ui-icon-picker
│   ├── ui-icon-picker__button
│   └── ui-icon-picker__selection
├── ui-table-panel
├── ui-table-wrap
├── ui-table
│   └── ui-table__caption
├── ui-data-form
├── ui-data-status
├── ui-data-error
├── ui-data-response
│   ├── ui-data-response__body
│   └── ui-data-response__code
├── ui-status-dot
├── ui-home-hero
│   ├── ui-home-hero__copy
│   ├── ui-home-hero__title
│   ├── ui-home-hero__description
│   └── ui-home-hero__note
├── ui-home-carousel
│   ├── ui-home-carousel--fade-a
│   ├── ui-home-carousel--fade-b
│   └── ui-home-carousel__line
├── ui-home-specs
│   ├── ui-home-specs__header
│   ├── ui-home-specs__list
│   └── ui-home-specs__item
├── ui-home-examples
│   └── ui-home-examples__grid
├── ui-home-highlights
│   └── ui-home-highlight
│       └── ui-home-highlight__number
├── ui-home-island
│   ├── ui-home-island__label
│   └── ui-home-island__content
├── ui-counter-card
│   ├── ui-counter-card__icon
│   ├── ui-counter-card__label
│   └── ui-counter-card__display
├── ui-ideas-card
│   ├── ui-ideas-card__icon
│   ├── ui-ideas-card__heading
│   ├── ui-ideas-card__status
│   ├── ui-ideas-card__add
│   └── ui-ideas-card__add-button
├── ui-ideas-list
│   ├── ui-ideas-list__item
│   │   └── ui-ideas-list__item--done
│   ├── ui-ideas-list__label
│   ├── ui-ideas-list__control
│   └── ui-ideas-list__remove
├── ui-extra-card
│   └── ui-extra-card__icon
└── ui-idea-detail
```

---

# 2. Foundation

Foundation defines the visual language used by every component.

## 2.1 Design tokens

```text
tokens
├── color
├── typography
├── spacing
├── sizing
├── radius
├── border
├── shadow
├── elevation
├── transition
└── z-index
```

### Colors

```text
background
surface
surface-raised
surface-sunken

border
border-subtle
border-strong

text
text-muted
text-subtle
text-inverse

primary
primary-hover
primary-active

success
warning
danger
info

focus
disabled
selected
```

### Typography

```text
font-family
font-size
font-weight
line-height
letter-spacing
```

Semantic scale:

```text
display
heading-1
heading-2
heading-3
heading-4

body
body-small
label
caption
code
```

### Spacing

```text
space-1    4px
space-2    8px
space-3   12px
space-4   16px
space-5   20px
space-6   24px
space-8   32px
space-10  40px
space-12  48px
space-16  64px
```

---

# 3. Layout

Layout primitives are deliberately independent from visual components.

## 3.1 Page

```text
page
├── page-header
│   ├── page-title
│   ├── page-description
│   └── page-actions
└── page-content
```

### Parts

| Part               | Purpose              |
| ------------------ | -------------------- |
| `page`             | Page root            |
| `page-header`      | Page heading area    |
| `page-title`       | Main page title      |
| `page-description` | Supporting text      |
| `page-actions`     | Primary page actions |
| `page-content`     | Main content         |

### Modifiers

```text
page--narrow
page--wide
page--full
```

---

# 4. Container

```text
container
```

Controls content width and horizontal margins.

### Modifiers

```text
container--small
container--medium
container--large
container--full
```

---

# 5. Stack

Vertical layout primitive.

```text
stack
└── children
```

Controls:

```text
gap
align
```

Example:

```html
<div class="stack">
    <h2>Title</h2>
    <p>Description</p>
    <button>Continue</button>
</div>
```

---

# 6. Cluster

Horizontal grouping primitive.

```text
cluster
└── children
```

Used for:

* buttons
* tags
* toolbar items
* navigation
* filters

Modifiers:

```text
cluster--start
cluster--center
cluster--end
cluster--between
cluster--wrap
```

---

# 7. Grid

```text
grid
└── grid-item
```

Modifiers:

```text
grid--2
grid--3
grid--4
grid--auto
```

Responsive behavior should be built into the grid rather than requiring separate mobile classes.

---

# 8. Split

Two-region layout.

```text
split
├── split-primary
└── split-secondary
```

Typical usage:

```text
content              actions
──────────────────────────────
primary              secondary
```

Modifiers:

```text
split--reverse
split--equal
split--stack
```

---

# 9. Application shell

The main structure of a web application.

```text
app-shell
├── app-sidebar
│   └── navigation
├── app-header
│   ├── breadcrumb
│   ├── search
│   └── user-menu
└── app-main
    └── page
```

Parts:

```text
app-shell
app-sidebar
app-header
app-main
app-footer
```

---

# 10. Section

Generic semantic content section.

```text
section
├── section-header
│   ├── section-title
│   └── section-description
└── section-body
```

Modifiers:

```text
section--compact
section--bordered
```

---

# 11. Panel

A panel is a visually contained region of content.

```text
panel
├── panel-header
│   ├── panel-icon
│   ├── panel-title
│   ├── panel-description
│   └── panel-actions
├── panel-body
└── panel-footer
    └── panel-actions
```

### Modifiers

```text
panel--flat
panel--bordered
panel--raised
panel--compact
```

### States

```text
.is-loading
.is-disabled
```

---

# 12. Card

A card represents a discrete piece of information or an object.

```text
card
├── card-media
├── card-header
│   ├── card-icon
│   ├── card-title
│   └── card-description
├── card-body
└── card-footer
```

Modifiers:

```text
card--interactive
card--horizontal
card--compact
card--selected
```

---

# 13. Form

One of the core Nodula components.

```text
form
├── form-header
│   ├── form-title
│   └── form-description
├── form-body
│   └── field
└── form-footer
    └── form-actions
```

### Parts

```text
form-header
form-title
form-description
form-body
form-footer
form-actions
```

### Modifiers

```text
form--compact
form--inline
form--horizontal
```

### States

```text
.is-loading
.is-disabled
```

---

# 14. Field

The fundamental form building block.

```text
field
├── field-label
│   ├── field-label-text
│   └── field-required
├── field-control
├── field-description
├── field-help
└── field-error
```

### States

```text
field.is-focused
field.is-invalid
field.is-valid
field.is-disabled
field.is-readonly
```

### Modifiers

```text
field--required
field--horizontal
field--compact
```

---

# 15. Input

```text
input
```

Supported HTML types:

```text
text
email
password
number
search
tel
url
date
datetime-local
time
month
week
color
file
```

### Input composition

```text
input-group
├── input-prefix
├── input
└── input-suffix
```

Example:

```text
input-group
    € | 125.00 | EUR
```

Modifiers:

```text
input--small
input--large
input--invalid
input--valid
input--readonly
```

---

# 16. Textarea

```text
textarea
```

Modifiers:

```text
textarea--small
textarea--large
textarea--resize
textarea--fixed
```

---

# 17. Select

```text
select
```

Composition:

```text
select-group
└── select
```

Modifiers:

```text
select--small
select--large
select--invalid
select--disabled
```

---

# 18. Checkbox

```text
checkbox
├── checkbox-control
└── checkbox-label
```

States:

```text
checked
indeterminate
disabled
```

---

# 19. Radio

```text
radio-group
├── radio
│   ├── radio-control
│   └── radio-label
├── radio
└── radio
```

---

# 20. Switch

```text
switch
├── switch-control
├── switch-track
├── switch-thumb
└── switch-label
```

States:

```text
checked
disabled
```

---

# 21. Range

```text
range
├── range-track
├── range-progress
└── range-thumb
```

Optional:

```text
range-min
range-max
range-value
```

---

# 22. Button

Core action component.

```text
button
├── button-icon
├── button-label
└── button-spinner
```

### Variants

```text
button--primary
button--secondary
button--outline
button--ghost
button--danger
button--link
```

### Sizes

```text
button--small
button--medium
button--large
```

### States

```text
:hover
:focus
:active
:disabled
.is-loading
```

### Special

```text
button--icon
button--block
```

---

# 23. Button group

```text
button-group
├── button
├── button
└── button
```

Modifiers:

```text
button-group--attached
button-group--vertical
```

---

# 24. Toolbar

```text
toolbar
├── toolbar-start
├── toolbar-center
└── toolbar-end
```

Common contents:

```text
button
button-group
search
filter
pagination
```

---

# 25. Navigation

```text
navigation
├── nav-header
├── nav-section
│   ├── nav-section-title
│   └── nav-item
│       ├── nav-icon
│       ├── nav-label
│       └── nav-badge
└── nav-footer
```

### Nav item states

```text
.is-active
.is-disabled
.is-expanded
```

---

# 26. Breadcrumb

```text
breadcrumb
├── breadcrumb-item
├── breadcrumb-separator
├── breadcrumb-item
└── breadcrumb-current
```

---

# 27. Tabs

```text
tabs
├── tab-list
│   ├── tab
│   ├── tab
│   └── tab
└── tab-panels
    └── tab-panel
```

States:

```text
tab.is-active
tab.is-disabled
```

Modifiers:

```text
tabs--boxed
tabs--pills
tabs--vertical
```

---

# 28. Dropdown

```text
dropdown
├── dropdown-trigger
└── dropdown-menu
    ├── dropdown-header
    ├── dropdown-item
    ├── dropdown-divider
    └── dropdown-item
```

Item parts:

```text
dropdown-icon
dropdown-label
dropdown-shortcut
dropdown-indicator
```

States:

```text
.is-open
.is-active
.is-disabled
```

---

# 29. Popover

```text
popover
├── popover-arrow
├── popover-header
├── popover-body
└── popover-footer
```

---

# 30. Tooltip

```text
tooltip
├── tooltip-arrow
└── tooltip-content
```

Tooltip should remain deliberately simple.

---

# 31. Modal

```text
modal
├── modal-overlay
└── modal-dialog
    ├── modal-header
    │   ├── modal-icon
    │   ├── modal-title
    │   └── modal-close
    ├── modal-body
    └── modal-footer
        └── modal-actions
```

Modifiers:

```text
modal--small
modal--medium
modal--large
modal--fullscreen
```

---

# 32. Alert

Persistent contextual message.

```text
alert
├── alert-icon
├── alert-content
│   ├── alert-title
│   └── alert-text
└── alert-action
```

Variants:

```text
alert--info
alert--success
alert--warning
alert--danger
```

---

# 33. Toast

Temporary notification.

```text
toast
├── toast-icon
├── toast-content
│   ├── toast-title
│   └── toast-text
├── toast-action
└── toast-close
```

Container:

```text
toast-container
```

Positions:

```text
top-left
top-center
top-right

bottom-left
bottom-center
bottom-right
```

---

# 34. Message

Smaller inline feedback.

```text
message
├── message-icon
├── message-content
└── message-action
```

Variants:

```text
message--info
message--success
message--warning
message--danger
```

This is particularly useful inside forms.

---

# 35. Badge

Small status/category indicator.

```text
badge
```

Variants:

```text
badge--neutral
badge--primary
badge--success
badge--warning
badge--danger
badge--info
```

Sizes:

```text
badge--small
badge--large
```

---

# 36. Avatar

```text
avatar
├── avatar-image
├── avatar-initials
└── avatar-status
```

Sizes:

```text
avatar--small
avatar--medium
avatar--large
```

---

# 37. Icon

```text
icon
```

Modifiers:

```text
icon--small
icon--medium
icon--large
```

Semantic states:

```text
icon--muted
icon--primary
icon--success
icon--warning
icon--danger
```

Nodula should **not prescribe a specific icon library**.

---

# 38. Divider

```text
divider
```

Modifiers:

```text
divider--vertical
divider--subtle
```

---

# 39. List

```text
list
├── list-item
│   ├── list-icon
│   ├── list-content
│   │   ├── list-title
│   │   └── list-description
│   └── list-action
└── list-item
```

Modifiers:

```text
list--divided
list--interactive
list--compact
```

---

# 40. Table

```text
data-table
├── table-toolbar
│   ├── table-title
│   ├── table-filters
│   └── table-actions
│
├── table
│   ├── table-header
│   │   └── table-row
│   │       └── table-cell
│   ├── table-body
│   │   └── table-row
│   │       └── table-cell
│   └── table-footer
│
└── table-pagination
```

States:

```text
table-row.is-selected
table-row.is-disabled
table-row.is-expanded
```

Modifiers:

```text
table--compact
table--striped
table--bordered
table--hover
table--responsive
```

---

# 41. Pagination

```text
pagination
├── pagination-prev
├── pagination-item
├── pagination-item
├── pagination-next
└── pagination-info
```

States:

```text
.is-active
.is-disabled
```

---

# 42. Progress

```text
progress
├── progress-track
└── progress-bar
```

Optional:

```text
progress-label
progress-value
```

Modifiers:

```text
progress--small
progress--large
progress--indeterminate
```

---

# 43. Spinner

```text
spinner
```

Sizes:

```text
spinner--small
spinner--medium
spinner--large
```

---

# 44. Skeleton

Used while content is loading.

```text
skeleton
```

Variants:

```text
skeleton--text
skeleton--heading
skeleton--avatar
skeleton--image
skeleton--button
```

---

# 45. Empty state

I would add this even though it wasn't in the original list. It is extremely useful in application UI.

```text
empty
├── empty-icon
├── empty-title
├── empty-description
└── empty-action
```

Example:

```text
No projects yet
Create your first project to get started.

[ Create project ]
```

---

# 46. Search

Search deserves a reusable component.

```text
search
├── search-icon
├── search-input
├── search-clear
└── search-action
```

Variants:

```text
search--compact
search--expanded
```

---

# 47. Date/time controls

```text
date-picker
├── date-input
└── date-calendar
```

Calendar:

```text
calendar
├── calendar-header
│   ├── calendar-prev
│   ├── calendar-title
│   └── calendar-next
├── calendar-weekdays
└── calendar-grid
    └── calendar-day
```

---

# 48. File upload

```text
file-upload
├── file-upload-zone
│   ├── file-upload-icon
│   ├── file-upload-title
│   └── file-upload-description
└── file-list
    └── file-item
        ├── file-icon
        ├── file-name
        ├── file-size
        ├── file-progress
        └── file-remove
```

---

# 49. Common state system

Rather than inventing different state names for every component, Nodula should standardize these.

```text
:hover
:focus
:focus-visible
:active
:disabled

.is-active
.is-selected
.is-open
.is-expanded
.is-collapsed

.is-loading
.is-invalid
.is-valid
.is-error
.is-warning

.is-readonly
.is-placeholder
```

Not every component needs every state.

---

# 50. Responsive philosophy

Avoid component-specific breakpoints wherever possible.

Nodula should have a small global breakpoint system:

```text
xs
sm
md
lg
xl
```

But components should primarily respond to **available space**, not the screen size.

For example:

```text
form--horizontal
```

can automatically become vertical when insufficient space is available.

This makes Nodula more useful inside:

* full pages
* panels
* modals
* sidebars
* cards

---

# 51. Density

A useful global concept for an application framework is density:

```text
comfortable
compact
```

Potentially:

```html
<body data-density="comfortable">
```

or:

```html
<div class="panel" data-density="compact">
```

This allows the entire UI to become more information-dense without redesigning components.

---

# 52. Theme

Nodula should have two built-in themes:

```text
light
dark
```

Using:

```html
<html data-theme="light">
```

and:

```html
<html data-theme="dark">
```

But the components should **never directly define light/dark colors**.

Instead:

```css
.button--primary {
    background: var(--color-primary);
    color: var(--color-text-inverse);
}
```

The theme defines what `--color-primary` means.

---

# 53. Complete component hierarchy

This is the hierarchy I'd use as the foundation of the Nodula UI library:

```text
NODULA UI
│
├── FOUNDATION
│   ├── Colors
│   ├── Typography
│   ├── Spacing
│   ├── Sizing
│   ├── Borders
│   ├── Radius
│   ├── Shadows
│   └── Motion
│
├── LAYOUT
│   ├── Page
│   ├── Container
│   ├── Stack
│   ├── Cluster
│   ├── Grid
│   ├── Split
│   ├── Section
│   └── App Shell
│
├── CONTENT
│   ├── Text
│   ├── Icon
│   ├── Avatar
│   ├── Image
│   ├── Divider
│   ├── Badge
│   └── List
│
├── FORMS
│   ├── Form
│   ├── Field
│   ├── Label
│   ├── Input
│   ├── Textarea
│   ├── Select
│   ├── Checkbox
│   ├── Radio
│   ├── Switch
│   ├── Range
│   ├── Date Picker
│   └── File Upload
│
├── ACTIONS
│   ├── Button
│   ├── Button Group
│   └── Toolbar
│
├── NAVIGATION
│   ├── Navigation
│   ├── Breadcrumb
│   ├── Tabs
│   └── Pagination
│
├── DATA
│   ├── Table
│   ├── List
│   ├── Card
│   └── Empty State
│
├── OVERLAY
│   ├── Dropdown
│   ├── Popover
│   ├── Tooltip
│   └── Modal
│
├── FEEDBACK
│   ├── Alert
│   ├── Message
│   ├── Toast
│   ├── Progress
│   ├── Spinner
│   └── Skeleton
│
└── APPLICATION
    ├── App Shell
    ├── Sidebar
    ├── Header
    ├── User Menu
    └── Search
```

## 54. The key Nodula concept

I would take this one step further and make the distinction between **Primitives, Components and Patterns** explicit:

```text
PRIMITIVES
───────────
stack
cluster
grid
container
icon
divider

COMPONENTS
──────────
button
field
input
panel
card
modal
table
tabs
navigation

PATTERNS
────────
login page
settings page
dashboard
CRUD page
data browser
authentication
application shell
```

So a **login page isn't a CSS component**.

It's a pattern composed of:

```text
page
└── panel
    └── form
        ├── field
        ├── field
        └── form-actions
```

And a dashboard is:

```text
page
├── page-header
│   ├── page-title
│   └── page-actions
│
└── grid
    ├── card
    ├── card
    ├── card
    └── panel
        └── table
```

That is, in my view, the **core strength Nodula can have over larger UI frameworks**: a relatively tiny vocabulary from which almost any application UI can be composed.

The next logical artifact is a **Nodula CSS API specification** where each of these ~50 components gets an exact definition of **HTML structure + class names + CSS variables + variants + states + responsive behavior + accessibility requirements**. That would effectively become the blueprint from which you can implement the actual `nodula.css`.
