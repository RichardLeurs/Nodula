# List Rendering

Use keyed lists to render collections whose items can be inserted, removed, reordered, or replaced. Stable keys let Nodula retain the DOM node and owner scope for items that remain in the list. Lists can be authored in `.page`/`.comp` templates or directly with core DOM helpers.

## Prerequisites

Template examples require the Nodula Vite compiler. Both template and direct-DOM examples use a reactive accessor for the list; see [Reactivity and DOM](/guide/reactivity).

## Core concepts

- **Collection accessor:** returns the current array, usually by reading a signal.
- **Key:** a stable, unique string, number, symbol, or bigint identifying each item across updates.
- **Row renderer:** creates a DOM node for each item. In template loops and `each()`, the row value is an accessor so a same-key item replacement can update the existing row.
- **Ownership:** each row has its own cleanup scope. Removed rows stop updating and dispose their listeners/effects.

## Quick start: template loop

```html
<script>
import { signal } from 'nodula-framework';

const [items, setItems] = signal([
  { id: 'a', name: 'First' },
  { id: 'b', name: 'Second' },
]);
</script>

<template>
  <ul>
    <li @for="item of items()" :key="item.id">
      {{ item.name }}
    </li>
  </ul>
</template>
```

Every loop needs `:key`. Keys should come from item identity, not array position, when rows can move or be removed.

## How it works

When the collection changes, Nodula compares keys. Rows with keys that remain keep their DOM identity; new keys create rows, and missing keys dispose and remove rows. Duplicate keys throw an error rather than ambiguously reusing a row. Reordering changes node order without recreating unchanged keyed rows.

The loop item is exposed as a reactive accessor. Template property expressions such as `item.name` are compiled to read from that accessor; JavaScript callbacks can call it explicitly as `item()`.

## Common patterns

### Replace item data without replacing its row

If an item keeps the same key but its data changes, the existing row accessor receives the replacement item:

```js
setItems((current) => current.map((item) =>
  item.id === 'a' ? { ...item, name: 'Updated first' } : item,
));
```

Use immutable array replacement or another update that causes the collection accessor to notify. The key identifies the row; the row accessor provides its latest item value.

### Render a list with core DOM helpers

Use `each()` for a keyed list descriptor in core DOM rendering:

```js
import { each, h, mount, signal } from 'nodula-framework';

const [items, setItems] = signal([{ id: 'a', name: 'First' }]);

function ItemList() {
  return h('ul', {}, each(
    items,
    (item) => item.id,
    (item) => h('li', { 'data-id': () => item().id }, () => item().name),
  ));
}

const unmount = mount('#app', ItemList);
```

`each(items, key, render)` returns a render descriptor; its renderer receives an item accessor.

### Use `list()` for a direct keyed container

Core `list(items, key, render)` creates an `HTMLDivElement` container. Its renderer receives the item value and index as ordinary arguments:

```js
import { list, signal } from 'nodula-framework';

const [items] = signal([{ id: 1, name: 'First' }]);
const listElement = list(
  items,
  (item) => item.id,
  (item, index) => {
    const row = document.createElement('li');
    row.textContent = `${index + 1}. ${item.name}`;
    return row;
  },
);

document.querySelector('#app').append(listElement);
```

Use `each()` when composing rows inside `h()` or compiled template rendering; use `list()` when a standalone keyed `div` container fits the DOM structure.

`list()` limits, compared with `each()`:

- It always creates its own `<div>` wrapper, so it cannot render rows directly inside a `<ul>`, `<table>`, or `<select>`.
- `render(item, index)` runs once per key. If an item object is replaced under the same key, or its position changes, the row keeps the item and `index` it was created with. Read row fields from signals or a store, or use `each()`, whose rows receive a reactive item accessor.
- Each row must render a single node; lifecycle (enter/leave) transitions are not applied.

New code should prefer `each()`; `list()` remains supported for existing standalone containers.

### Keep conditions inside rows

Put `@if` on a child or wrapper inside the loop row. A loop directive and `@if`/`@else` cannot be placed on the same element:

```html
<template>
  <ul>
    <li @for="item of items()" :key="item.id">
      <span>{{ item.name }}</span>
      <span @if="item().done">Complete</span>
    </li>
  </ul>
</template>
```

## Limitations and troubleshooting

- Missing keys, malformed loop expressions, or duplicate keys are errors. Provide `@for="item of items()" :key="item.id"` (or the supported legacy `each="item of items()" :key="item.id"` form).
- Keys must be unique within the current collection and stable across updates. Avoid indexes when items can reorder, insert, or delete.
- `@for` cannot share its element with `each`, `@if`, or `@else`; use nested elements instead.
- A loop alone cannot be the component template's root if the compiler requires a single root element. Wrap the loop in `<ul>`, `<div>`, or a supported conditional template structure.
- Removed rows are disposed immediately by default. Optional [Animation](/guide/animations) lifecycle transitions can delay DOM removal for leave animation, but the removed row is no longer reactive during that interval.
- Use `@show` for visibility toggling when a node should remain mounted; see [Conditional Rendering](/guide/conditional-rendering).

## Related guides

- [Single-File Components](/guide/templates) — `@for` and template syntax.
- [Conditional Rendering](/guide/conditional-rendering) — combine lists with `@if` and `@show`.
- [Reactivity and DOM](/guide/reactivity) — signal-backed collections and bindings.
- [Animations](/guide/animations) — optional keyed-row enter/leave transitions.
- Tests: `framework/vitest/compiler.test.js` and `framework/vitest/dom.test.js`.