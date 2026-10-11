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
| `reset()` | `() => void` | Restore initial values and clear errors, touched state, submitting, and submitted state. |

### Validation and submission behavior

- `handleSubmit(event)` resolves `false` when validation fails or submission is already in progress.
- It resolves `true` after `onSubmit` completes, including when no callback was supplied.
- Callback errors are rethrown. `submitting()` is reset in `finally`; `submitted()` remains false on failure.
- Validator errors with non-string or empty messages are ignored. A thrown validator error is propagated.
- `onSubmit` receives the reactive values object and the submit event when provided.
- Before `onSubmit`, the add-on passes a detached copy with HTML-sensitive characters escaped in every string value, including strings nested in arrays/plain objects. `form.values` remains raw for editing and validation. This is HTML-context output encoding, not a general sanitizer or a substitute for server-side validation; avoid escaping the submitted values a second time, and use context-appropriate encoding when displaying them elsewhere.
- Values are copied when the form is created and when it resets. Non-plain object values such as `Date`, `Map`, and class instances are rejected.

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

