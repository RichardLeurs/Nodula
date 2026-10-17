# Form Add-on

The optional `nodula-framework/form` add-on provides reactive form values, validation state, native event handlers, async submission, and reset helpers. Import it separately so forms do not add code to the core runtime.

## Install and import

The add-on is included with Nodula. Import `createForm` from its package entry:

```js
import { createForm } from 'nodula-framework/form';
```

## Quick start

```js
const form = createForm(
  { email: '', updates: false },
  {
    validate: (values) => values.email.includes('@')
      ? {}
      : { email: 'Enter a valid email.' },
    // Save what the user typed, not HTML-escaped text.
    escapeHtml: false,
    onSubmit: async (values) => saveProfile(values),
  },
);

emailInput.addEventListener('input', form.handleChange('email'));
emailInput.addEventListener('blur', form.handleBlur('email'));
checkbox.addEventListener('change', form.handleChange('updates'));
formElement.addEventListener('submit', (event) => form.handleSubmit(event));
```

`createForm(initialValues, options?)` copies the initial values and returns a controller. Form values may contain plain objects, arrays, and primitive values. Keep DOM values in sync with `form.values`; the add-on supplies state and event helpers, not form markup or automatic DOM bindings.

## API reference

### `createForm(initialValues, options?)`

Creates reactive form state.

| Argument | Type | Description |
|---|---|---|
| `initialValues` | `object` | Initial fields. Must be a non-array object containing only plain objects, arrays, and primitive values. |
| `options.validate` | `(values) => errors` | Optional validator. Return an object mapping invalid field names to non-empty error messages. Return `{}` when valid. |
| `options.onSubmit` | `(values, event?) => void \| Promise<void>` | Optional callback, called after successful validation. |
| `options.idPrefix` | `string` | Unique per form | Prefix for the stable element IDs that `field()` generates. Must be a valid identifier. |
| `options.escapeHtml` | `boolean` | `true` | When `true` (the default), `onSubmit` receives HTML-escaped string values. Set `false` to receive the raw values. See [HTML escaping on submit](#html-escaping-on-submit). |

Returns a `FormController<T>` with:

| Member | Type | Purpose |
|---|---|---|
| `values` | reactive `T` | Current field values. |
| `errors` | reactive `Partial<Record<keyof T, string>>` | Current validation messages. |
| `touched` | reactive `Partial<Record<keyof T, boolean>>` | Whether each field has been blurred or submission attempted. |
| `submitting()` | `() => boolean` | True while async submit callback is running. |
| `submitted()` | `() => boolean` | True after submit callback completes successfully; reset clears it. |
| `dirty()` | `() => boolean` | True when current values differ from initial values. |
| `valid()` | `() => boolean` | True when no errors are present. It does not run validation by itself. |
| `setFieldValue(field, value)` | method | Update field; revalidates it if touched or already invalid. |
| `setFieldTouched(field, touched?)` | method | Set touched state; validates when set true. `touched` defaults to `true`. |
| `handleChange(field)` | `(event) => void` | Event handler that reads `target.checked` for checkboxes and `target.value` otherwise. |
| `handleBlur(field)` | `() => void` | Event handler that marks field touched. |
| `validate()` | `() => errors` | Run full-form validation and replace current errors. |
| `handleSubmit(event)` | `Promise<boolean>` | Prevent default, touch all fields, validate, and conditionally submit. |
| `reset()` | `() => void` | Restore initial values and clear errors, touched state, submitting, submitted, and submit error. |
| `field(name)` | `(name) => FormField` | Per-field helpers: value, error, touched, dirty, visible error, stable IDs, and control attributes. Throws for names that are not in the initial values. |
| `submitError()` | `() => unknown` | The error thrown by the most recent failed `onSubmit`, unchanged; `null` otherwise. The error is still rethrown to the caller. |

### Validation and submission behavior

- `handleSubmit(event)` resolves `false` when validation fails or submission is already in progress.
- It resolves `true` after `onSubmit` completes, including when no callback was supplied.
- Callback errors are rethrown. `submitting()` is reset in `finally`; `submitted()` remains false on failure.
- Validator errors with non-string or empty messages are ignored. A thrown validator error is propagated.
- `onSubmit` receives the reactive values object and the submit event when provided.
- `onSubmit` receives HTML-escaped values by default: a detached copy with HTML-sensitive characters escaped in every string value, including strings nested in arrays/plain objects. Pass `escapeHtml: false` to receive the reactive values object instead. `form.values` always remains raw for editing and validation. See [HTML escaping](#html-escaping-on-submit) below.
- Values are copied when the form is created and when it resets. Non-plain object values such as `Date`, `Map`, and class instances are rejected.

### HTML escaping on submit

The add-on escapes `&`, `<`, `>`, `"`, and `'` in string values immediately before calling `onSubmit`, so `<b>Hi</b>` is submitted as `&lt;b&gt;Hi&lt;/b&gt;` and `O'Reilly` as `O&#39;Reilly`. This is the default. Pass `escapeHtml: false` if you need what the user typed, for example to store it or to render it with `textContent`. The escaped values are a detached copy: fields and validators continue using the original `form.values`.

This is HTML-context output encoding—not an HTML sanitizer or a universal security filter. It does not remove markup, validate input, or protect database queries from SQL injection. Avoid escaping the submitted values again, render text with `textContent` where possible, and use context-appropriate encoding when inserting data into other output contexts. Always validate on the server and use parameterized database queries.

### Saving submitted data

The default escaped values are for display. A value saved to a database or API with escaping on would be stored as `O&#39;Reilly`, and the next reader would see the entity text. For saving, pass `escapeHtml: false` and encode the value for the context where it is displayed, for example with `textContent` or a server-side encoder.

## Field helpers and accessibility

`form.field(name)` groups one field's state with the attributes its control needs. It renders nothing; markup, styling and messages stay in your application.

```js
const form = createForm({ email: '' }, {
  idPrefix: 'signup',
  validate: (values) => (values.email.includes('@') ? {} : { email: 'Enter an email address.' }),
  escapeHtml: false,
  onSubmit: async (values) => save(values),
});
const email = form.field('email');
// email.ids → { control: 'signup-email', description: 'signup-email-description', error: 'signup-email-error' }
```

- `value()`, `error()`, `touched()` and `dirty()` are reactive accessors for that field.
- `visibleError()` returns the error only after the field is touched or a submit was attempted, so users are not told about errors before they have interacted. A rejected submit touches every field.
- `attributes({ description })` returns `id`, `aria-describedby` and `aria-invalid` for the control. `aria-describedby` references the error element only while an error is visible, and the description element only when you pass `description: true`, so it never points at an element that does not exist.

With `h()`, pass the attributes straight into the props:

```js
h('input', { ...email.attributes({ description: true }), type: 'email', bind: { property: 'value', read: email.value, write: (value) => form.setFieldValue('email', value) } });
```

In a `.page` or `.comp` template, bind each attribute from `email.ids` and `email.invalid()`, and create the elements yourself, for example:

```html
<label :for="email.ids.control">Email</label>
<input :id="email.ids.control" :aria-invalid="email.invalid() ? 'true' : null">
<p :id="email.ids.error">{{ email.visibleError() }}</p>
```

Boundaries: validation is synchronous and runs in your `validate` function. Client validation improves feedback but is not server-side validation; the server must validate again. The helpers do not render labels, messages or styles, and do not choose a language for messages.

## Native markup example

The add-on leaves markup and accessibility choices to the application:

```js
const formElement = document.querySelector('form');
const emailInput = document.querySelector('[name="email"]');
const emailError = document.querySelector('[data-error="email"]');

emailInput.addEventListener('input', form.handleChange('email'));
emailInput.addEventListener('blur', form.handleBlur('email'));

formElement.addEventListener('submit', async (event) => {
  const succeeded = await form.handleSubmit(event);
  emailError.textContent = form.errors.email ?? '';
  emailInput.setAttribute('aria-invalid', String(Boolean(form.errors.email)));
  if (succeeded) console.log('Form submitted');
});
```

Use labels, error descriptions, and `aria-invalid` in the UI as appropriate. Validation in the browser improves feedback but does not replace server-side validation.

## Framework page example

In a Nodula `.page` component, call the handlers from event bindings and read the controller state in the template:

```html
<script setup>
import { createForm } from 'nodula-framework/form';

const form = createForm({ email: '' }, {
  validate: (values) => values.email.includes('@') ? {} : { email: 'Enter a valid email.' },
  // Save what the user typed, not HTML-escaped text.
  escapeHtml: false,
  onSubmit: async (values) => saveProfile(values),
});
</script>

<template>
  <form @submit="form.handleSubmit($event)">
    <label for="email">Email</label>
    <input id="email" :value="form.values.email" @input="form.handleChange('email')($event)" @blur="form.handleBlur('email')()">
    <p role="alert" @show="Boolean(form.errors.email)">{{ form.errors.email ?? '' }}</p>
    <button type="submit" :disabled="form.submitting()">Submit</button>
  </form>
</template>
```

See the [single-file component guide](/guide/templates) for supported template syntax. The runnable form example is on the [Nodula demo site](https://nodula.richardleurs.nl/forms).

