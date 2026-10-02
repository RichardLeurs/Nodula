# Forms

Form state is an optional add-on, imported separately from the core runtime:

```
import { createForm } from 'nodula-framework/form';

const form = createForm(
  { email: '', updates: false },
  {
    validate: (values) => values.email.includes('@')
      ? {}
      : { email: 'Enter a valid email.' },
    onSubmit: async (values) => saveProfile(values),
  },
);
```

`createForm(initialValues, options)` returns reactive `values`, `errors`, and `touched` stores; `submitting` and `submitted` signal getters; and `dirty()` and `valid()` accessors. Form values should contain plain objects, arrays, and primitive values.

## Native event handlers

Connect the helpers to native form events:

```
emailInput.addEventListener('input', form.handleChange('email'));
emailInput.addEventListener('blur', form.handleBlur('email'));

const succeeded = await form.handleSubmit(submitEvent);
```

`handleChange(field)` reads a text-like control's value or a checkbox's checked state. `handleBlur(field)` marks the field touched. `handleSubmit(event)` prevents native submission, touches the fields, validates, and calls `onSubmit(values, event)` only when valid and not already submitting. It resolves to `true` after a successful callback and `false` when invalid or already submitting; callback errors are rethrown after the submitting state is reset.

The returned API also includes `setFieldValue`, `setFieldTouched`, `validate`, and `reset`. Reset restores the initial values and clears errors, touched state, and submission status. The `.page` compiler additionally supports explicit `value` and `checked` bindings; it does not support arbitrary two-way binding expressions. See [single-file components](/guide/templates) for the binding syntax.
