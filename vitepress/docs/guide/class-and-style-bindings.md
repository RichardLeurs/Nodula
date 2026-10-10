# Class and Style Bindings

Use ordinary HTML classes and reactive `:class` / `:style` attributes to reflect component state in the DOM. These bindings work in compiled `.page` and `.comp` templates; core `h()` also accepts class and style properties.

## Prerequisites

This guide assumes a Nodula template compiled by the Vite integration. For setup and template syntax, see [Single-File Components](/guide/templates). Reactive examples use core signals from `nodula-framework`.

## Core concepts

- A static `class="..."` assigns classes normally.
- A reactive `:class="expression"` reevaluates the expression when its signal dependencies change. The expression returns a class string.
- A reactive `:style="expression"` can return a style object. Its properties are applied to the element's native `style` declaration.
- Template bindings update DOM properties; `<style>` blocks define CSS rules. Use both: bindings select state-dependent classes or values, while CSS defines presentation.

## Quick start

```html
<script>
import { signal } from 'nodula-framework';

const [active, setActive] = signal(false);
</script>

<template>
  <button
    class="button"
    :class="active() ? 'button button--active' : 'button'"
    type="button"
    @click="setActive(!active())"
  >
    {{ active() ? 'Active' : 'Inactive' }}
  </button>
</template>

<style>
.button { color: #333; }
.button--active { color: seagreen; }
</style>
```

The class expression supplies the current full class string. Include base classes in both branches when they should remain present.

## Common patterns

### Choose a class from state

```html
<template>
  <p :class="online() ? 'status status--online' : 'status status--offline'">
    {{ online() ? 'Online' : 'Offline' }}
  </p>
</template>
```

### Bind inline styles reactively

```html
<script>
import { signal } from 'nodula-framework';

const [progress, setProgress] = signal(25);
</script>

<template>
  <div class="progress-track" aria-label="Upload progress">
    <div
      class="progress-track__value"
      :style="{ width: `${progress()}%` }"
    ></div>
  </div>
</template>

<style>
.progress-track { height: .5rem; background: #ddd; }
.progress-track__value { height: 100%; background: seagreen; }
</style>
```

For reusable presentation, prefer classes and stylesheets; use inline style binding for values that are genuinely dynamic, such as a measured width or position.

### Use core DOM helpers

```js
import { h, signal } from 'nodula-framework';

const [selected, setSelected] = signal(false);

const button = h('button', {
  className: () => selected() ? 'tab tab--selected' : 'tab',
  style: () => ({ opacity: selected() ? '1' : '.7' }),
  onClick: () => setSelected((value) => !value),
}, 'Select');
```

In `h()`, use `className` (or `class`) for classes. A function-valued property is reactive. Style objects are applied with `Object.assign` to the element's style declaration.

## How it works

The template compiler translates `:class` to the DOM helper's `className` property and `:style` to its `style` property. Reads made by those expressions are tracked, so only the corresponding property binding updates when its dependencies change. A class expression assigns a class string; it does not merge a returned object or array of conditional classes.

`<style scoped>` is a separate compile-time feature: the compiler adds a generated scope attribute to template elements and rewrites selectors to match those elements. Plain `<style>` remains global. Scoped styles do not create a Shadow DOM boundary.

For complete examples of global CSS imports, `<style scoped>`, and Vite CSS Modules, see [Styles and CSS Modules](/guide/styles).

## Limitations and troubleshooting

- `:class` expects a string expression. Build conditional strings explicitly; Vue-style object/array class syntax is not supported.
- `:style` is intended for a style object. Use valid CSS property names/values; complex style objects and framework-specific normalization are not provided.
- A dynamic class expression replaces the element's class value. Include static/base classes in the expression if they must persist across updates.
- Scoped CSS is selector scoping, not Shadow DOM isolation. Global selectors and styles outside the component remain global.
- Vite CSS Modules work through external `.module.css` imports and `<style module>` blocks. SFC module blocks expose `$style` in template expressions; custom module names and combining `module` with `scoped` are unsupported.
- If a binding does not update, confirm the expression calls its signal accessor (for example `active()`), and that the template was compiled by Nodula's Vite plugin.

## Related guides

- [Single-File Components](/guide/templates) — template syntax and style blocks.
- [Reactivity and DOM](/guide/reactivity) — signal tracking and reactive DOM helpers.
- [Components In-Depth](/guide/components-in-depth) — component structure and ownership.
- Compiler coverage: `framework/vitest/compiler.test.js`; DOM behavior: `framework/vitest/dom.test.js`.