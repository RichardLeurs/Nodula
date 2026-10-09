# Form Input Bindings

Nodula template bindings connect supported form-control values to an explicit signal getter/setter pair. They synchronize UI input with application state; validation, touched state, submission, and reset helpers are provided separately by the optional [Form add-on](/guide/forms).

## Prerequisites

Bindings are supported in compiled `.page` and `.comp` templates. Import the getter/setter pair from `nodula-framework`:

```js
import { signal } from 'nodula-framework';
```

For general event handling and template setup, see [Event Handling](/guide/event-handling) and [Single-File Components](/guide/templates).

## Core concepts

- A **value binding** reads a string from an accessor and writes user edits through a setter. It listens to the `input` event.
- A **checked binding** reads a boolean and writes checkbox/radio changes through a setter. It listens to the `change` event.
- Bindings require explicit getter and setter identifiers, such as `draft, setDraft`.
- Bound state remains ordinary Nodula reactive state. Other DOM bindings update when the signal changes.

## Quick start

```html
<script>
import { signal } from 'nodula-framework';

const [name, setName] = signal('');
const [updates, setUpdates] = signal(false);
</script>

<template>
  <form>
    <label>
      Name
      <input type="text" @bind:value="name, setName" />
    </label>

    <label>
      <input type="checkbox" @bind:checked="updates, setUpdates" />
      Send me updates
    </label>

    <p>Name: {{ name() }}</p>
  </form>
</template>
```

Changing the input updates its signal. Updating the signal in code also updates the bound control.

## Supported syntax and controls

| Binding | Supported controls | DOM property | Event |
|---|---|---|---|
| `@bind:value="read, write"` | Text-like `<input>`, `<textarea>`, `<select>` | `value` | `input` |
| `@bind:checked="read, write"` | `<input type="checkbox">`, `<input type="radio">` | `checked` | `change` |
| `bind:value="read, write"` / `bind:checked="read, write"` | Same as above | Same | Same |
| `@bind="read, write"` | Value binding by default; checked binding for checkbox input | `value` or `checked` | `input` or `change` |

The compiler accepts both `@bind:` and `bind:` forms. A shorthand binding on `<input type="checkbox">` is inferred as `checked`; other shorthand bindings use `value`. Prefer explicit `@bind:value` or `@bind:checked` when intent should be unmistakable.

### Textarea and select

```html
<script>
import { signal } from 'nodula-framework';

const [message, setMessage] = signal('Hello');
const [color, setColor] = signal('blue');
</script>

<template>
  <label>
    Message
    <textarea @bind:value="message, setMessage"></textarea>
  </label>

  <label>
    Color
    <select @bind:value="color, setColor">
      <option value="blue">Blue</option>
      <option value="green">Green</option>
    </select>
  </label>
</template>
```

Select bindings initialize after option children are mounted, so the current signal value can select the matching option.

## How it works

The compiler emits a binding descriptor with the property name and getter/setter. Nodula initializes the DOM property from the getter, listens for the control's input/change event, and passes the current property value to the setter. Subsequent signal changes update the DOM property. Listener cleanup follows the owning component/root lifecycle.

For event-specific behavior beyond reading/writing the bound value, use native event handlers alongside state elsewhere in the component. See [Event Handling](/guide/event-handling).

## Limitations and troubleshooting

- Only `value` and `checked` bindings are supported. `value` is for text-like inputs, textarea, and select; it is not supported for checkbox, radio, or file inputs.
- `checked` requires checkbox or radio input. Other elements cannot use these bindings.
- Binding values must contain exactly two identifiers: a getter and a setter. Inline expressions such as `@bind:value="name() + suffix, setName"` are not accepted; derive values separately.
- Use at most one binding per element. Do not combine a binding with a reactive `:value` or `:checked` for the same control.
- Shorthand `@bind` infers checkbox `checked`; for radio inputs and other controls, use an explicit binding property.
- These bindings do not validate data, display errors, or submit forms. Use the [Form add-on](/guide/forms) for field validation and submission state.
- Keep a visible, programmatic label for each input. Binding does not provide accessible naming automatically.

## Related guides

- [Forms](/guide/forms) — validation, touched state, submission, and reset.
- [Event Handling](/guide/event-handling) — native input and change events.
- [Reactivity and DOM](/guide/reactivity) — signal behavior and bindings.
- [Single-File Components](/guide/templates) — template compiler syntax.
- Binding tests: `framework/vitest/compiler.test.js` and `framework/vitest/dom.test.js`.