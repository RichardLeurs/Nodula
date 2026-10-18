# Form Add-on

The optional `nodula-framework/form` add-on provides reactive form values, synchronous and opt-in async field validation, native event handlers, async submission, reset helpers, and opt-in focus and error announcements after a failed submit. Import it separately so forms do not add code to the core runtime.

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
| `options.validateAsync` | `{ [field]: (value, { signal, values }) => string \| null \| undefined }`, may return a Promise | `{}` | Optional per-field async checks, run after the field's sync check passes: on blur and on submit. A non-empty string is the error. Must be an object of functions keyed by initial field names. See [Async validation](#async-validation). |
| `options.onSubmit` | `(values, event?) => void \| Promise<void>` | Optional callback, called after successful validation. |
| `options.idPrefix` | `string` | Unique per form | Prefix for the stable element IDs that `field()` generates. Must be a valid identifier. |
| `options.escapeHtml` | `boolean` | `true` | When `true` (the default), `onSubmit` receives HTML-escaped string values. Set `false` to receive the raw values. See [HTML escaping on submit](#html-escaping-on-submit). |
| `options.focusInvalid` | `boolean` | `false` | Opt-in. After a failed submit, focuses the control of the first invalid field in document order. Needs control ids from `field(name).attributes()` or `field(name).ids.control`; other values throw a `TypeError`. See [Accessibility helpers](#accessibility-helpers). |
| `options.announceErrors` | `boolean \| (errors) => string` | `false` | Opt-in. After a failed submit, writes a summary into a visually hidden `role="status"` region. `true` uses the built-in English text; a function receives a copy of the errors and returns the text to announce. Other values throw a `TypeError`. See [Accessibility helpers](#accessibility-helpers). |

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
| `validating()` | `() => boolean` | True while any async field check is running. |
| `setFieldValue(field, value)` | method | Update field; revalidates it if touched or already invalid. |
| `setFieldTouched(field, touched?)` | method | Set touched state; validates when set true. `touched` defaults to `true`. |
| `handleChange(field)` | `(event) => void` | Event handler that reads `target.checked` for checkboxes and `target.value` otherwise. |
| `handleBlur(field)` | `() => void` | Event handler that marks field touched. |
| `validate()` | `() => errors` | Run full-form validation and replace current errors. |
| `handleSubmit(event)` | `Promise<boolean>` | Prevent default, touch all fields, validate, run async field checks, and conditionally submit. |
| `reset()` | `() => void` | Restore initial values and clear errors, touched state, submitting, submitted, submit error, and async check state. In-flight async checks are aborted. |
| `field(name)` | `(name) => FormField` | Per-field helpers: value, error, touched, dirty, validating, async error, visible error, stable IDs, and control attributes. Throws for names that are not in the initial values. |
| `submitError()` | `() => unknown` | The error thrown by the most recent failed `onSubmit`, unchanged; `null` otherwise. The error is still rethrown to the caller. |

### Validation and submission behavior

- `handleSubmit(event)` resolves `false` when validation fails, when submission is already in progress, or when a checked value changes or `reset()` runs during the async checks. See [Async validation](#async-validation).
- It resolves `true` after `onSubmit` completes, including when no callback was supplied.
- Callback errors are rethrown. `submitting()` is reset in `finally`; `submitted()` remains false on failure.
- Validator errors with non-string or empty messages are ignored. A thrown `validate` error is propagated. Async check failures are handled differently; see [Async validation](#async-validation).
- `onSubmit` receives the reactive values object and the submit event when provided.
- `onSubmit` receives HTML-escaped values by default: a detached copy with HTML-sensitive characters escaped in every string value, including strings nested in arrays/plain objects. Pass `escapeHtml: false` to receive the reactive values object instead. `form.values` always remains raw for editing and validation. See [HTML escaping](#html-escaping-on-submit) below.
- Values are copied when the form is created and when it resets. Non-plain object values such as `Date`, `Map`, and class instances are rejected.

### HTML escaping on submit

The add-on escapes `&`, `<`, `>`, `"`, and `'` in string values immediately before calling `onSubmit`, so `<b>Hi</b>` is submitted as `&lt;b&gt;Hi&lt;/b&gt;` and `O'Reilly` as `O&#39;Reilly`. This is the default. Pass `escapeHtml: false` if you need what the user typed, for example to store it or to render it with `textContent`. The escaped values are a detached copy: fields and validators continue using the original `form.values`.

This is HTML-context output encoding—not an HTML sanitizer or a universal security filter. It does not remove markup, validate input, or protect database queries from SQL injection. Avoid escaping the submitted values again, render text with `textContent` where possible, and use context-appropriate encoding when inserting data into other output contexts. Always validate on the server and use parameterized database queries.

### Saving submitted data

The default escaped values are for display. A value saved to a database or API with escaping on would be stored as `O&#39;Reilly`, and the next reader would see the entity text. For saving, pass `escapeHtml: false` and encode the value for the context where it is displayed, for example with `textContent` or a server-side encoder.

## Field helpers and accessibility

`form.field(name)` groups one field's state with the attributes its control needs. It renders no markup, styling or field messages; those stay in your application. The one exception is the opt-in error announcement in [Accessibility helpers](#accessibility-helpers).

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
- `validating()` is true while that field's async check runs, and `asyncError()` returns the error from its last failed check, or `null`. See [Async validation](#async-validation).

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

Boundaries: sync validation runs in your `validate` function, and async checks run only when you opt in with `validateAsync`. Client validation improves feedback but is not server-side validation; the server must validate again. The helpers do not render labels, field messages or styles. The only text they write is the opt-in announcement, which is English unless you pass a function.

## Accessibility helpers

`focusInvalid` and `announceErrors` are opt-in and off by default. With both off, a failed submit changes no focus and adds no DOM.

- **`focusInvalid: true`** moves focus, after a failed submit, to the control of the first invalid field in document order. A field is invalid when it has a sync error or a failed async check. Controls are searched inside the submitted form first, then the document, using `field(name).ids.control`.
- **`announceErrors: true`** writes `1 field has an error.` or `N fields have errors.` into a visually hidden region with `role="status"` and `aria-live="polite"`. The region is created on the first announcement, inside the submitted form, or in `document.body` for a submit that did not come from a form. It is cleared and then set again, so a repeated failure is announced again. It is removed when the owning scope is disposed, and nothing is announced after that.
- **`announceErrors: (errors) => string`** receives a plain copy of the current errors, keyed by field name, and announces the string it returns. The region then has no `data-nodula-code`.

Behaviour notes:

- A submit ignored because another submit is in progress does nothing, and a late result from a superseded async check does nothing.
- If any field is changed into a sync error while async checks are pending, the submit fails and that field is focused and announced.
- Focus and announcements happen only on a failed submit. Typing, blurring and `validate()` do not move focus or announce.

Without control ids, `focusInvalid` has nothing to focus. Render each control with `field(name).attributes()`, or set `id` from `field(name).ids.control`. A field without a control is skipped. If no invalid field has a control, nothing happens and nothing is thrown.

```html
<script>
import { createForm } from 'nodula-framework/form';

const form = createForm({ name: '', email: '' }, {
  idPrefix: 'signup',
  validate: (values) => {
    const errors = {};
    if (!values.name.trim()) errors.name = 'Enter your name.';
    if (!values.email.includes('@')) errors.email = 'Enter an email address.';
    return errors;
  },
  focusInvalid: true,
  announceErrors: true,
  // Save what the user typed, not HTML-escaped text.
  escapeHtml: false,
  onSubmit: async (values) => saveSignup(values),
});

const name = form.field('name');
const email = form.field('email');
</script>

<template>
  <form @submit="form.handleSubmit($event)" novalidate>
    <label :for="name.ids.control">Name</label>
    <input
      :id="name.ids.control"
      :value="name.value()"
      :aria-invalid="name.invalid() ? 'true' : null"
      :aria-describedby="name.visibleError() ? name.ids.error : null"
      @input="form.handleChange('name')($event)"
      @blur="form.handleBlur('name')()"
    >
    <p :id="name.ids.error" @show="Boolean(name.visibleError())">{{ name.visibleError() ?? '' }}</p>

    <label :for="email.ids.control">Email</label>
    <input
      :id="email.ids.control"
      :value="email.value()"
      :aria-invalid="email.invalid() ? 'true' : null"
      :aria-describedby="email.visibleError() ? email.ids.error : null"
      @input="form.handleChange('email')($event)"
      @blur="form.handleBlur('email')()"
    >
    <p :id="email.ids.error" @show="Boolean(email.visibleError())">{{ email.visibleError() ?? '' }}</p>

    <button type="submit" :disabled="form.submitting()">Create account</button>
  </form>
</template>
```

With this page, submitting with both fields empty focuses the name input, the first invalid control in document order, and announces `2 fields have errors.`. With only the email invalid, it focuses the email input and announces `1 field has an error.` The error paragraphs still show the messages, so the announcement supplements them.

### Translating the announcement

The built-in text is catalogued under two codes: `nodula-form-errors-one` (`1 field has an error.`) and `nodula-form-errors-many` (`{count} fields have errors.`). With `true`, the region carries the matching `data-nodula-code`. The option has no text-replacement setting. To announce translated text, pass a function and look up your own strings, using the same codes as keys. See [Internationalization](/guide/internationalization).

### Limits

- Both options are opt-in. The default submit neither moves focus nor announces.
- Focus needs control ids. A field rendered without one is skipped, and no focus change happens if none is found.
- The built-in announcement is a polite count, not a list of fields or messages. Field messages remain the application's job, through `aria-describedby` and visible error text.
- They run only on a failed submit. They do not touch focus or announce on blur, typing or background async results.
- They are not an accessibility audit or a conformance guarantee. Test the form with keyboard and a screen reader in a real browser.

## Async validation

Use `validateAsync` for checks that need a server or another asynchronous source, such as username availability. Each entry is a function for one field. It receives the field's value and `{ signal, values }`, and returns a message, or nothing when the value is valid.

| Option | Type | Description |
|---|---|---|
| `validateAsync` | `{ [field]: (value, { signal, values }) => string \| null \| undefined }` | Object of functions keyed by initial field names. Each function may return a Promise. A non-empty string is the error. Any other result, including `''`, `null` or `undefined`, is valid. |
| `signal` | `AbortSignal` | Aborted when the check is superseded by a new check or a value change, when `reset()` runs, or when the owning scope is disposed. Pass it to `fetch`. |
| `values` | reactive `T` | The form values, for reading other fields. It does not re-run the check when those fields change. |

The example checks a username against an endpoint in a `.page` component:

```html
<script>
import { createForm } from 'nodula-framework/form';

const form = createForm({ username: '' }, {
  validate: (values) => (values.username.length >= 3 ? {} : { username: 'Use at least 3 characters.' }),
  validateAsync: {
    username: async (value, { signal }) => {
      const response = await fetch(`/api/usernames/${encodeURIComponent(value)}`, { signal });
      if (!response.ok) throw new Error(`Username check failed with status ${response.status}`);
      const { available } = await response.json();
      return available ? null : 'That username is taken.';
    },
  },
  onSubmit: async (values) => createAccount(values),
});

const username = form.field('username');
</script>

<template>
  <form @submit="form.handleSubmit($event)">
    <label :for="username.ids.control">Username</label>
    <input
      :id="username.ids.control"
      :value="username.value()"
      :aria-invalid="username.invalid() ? 'true' : null"
      @input="form.handleChange('username')($event)"
      @blur="form.handleBlur('username')()"
    >
    <p @show="username.validating()">Checking availability...</p>
    <p :id="username.ids.error" role="alert" @show="Boolean(username.visibleError())">{{ username.visibleError() ?? '' }}</p>
    <p role="status" @show="Boolean(username.asyncError())">Could not check this username. The server will check it when you submit.</p>
    <button type="submit" :disabled="form.submitting()">Create account</button>
  </form>
</template>
```

`field.validating()` and `field.asyncError()` drive the status text. `form.validating()` is true while any field's check runs. The `aria-invalid` and error element are the same ones shown for sync errors, because async messages are stored in `errors`.

### Async validation behavior

- **When it runs:** only for a field that has no sync error. It starts when the field is blurred (`setFieldTouched(field)` or `handleBlur(field)`) and when `handleSubmit` runs. Typing does not start it, so there are no debounced as-you-type checks.
- **Submit:** `handleSubmit` runs the sync validator, then awaits the async checks. `submitting()` is true during the checks, so a second submit returns `false`. `onSubmit` runs only when every check passes.
- **Passed values:** a value that passed its check is not checked again on submit. Changing the value makes the next submit check it again, even if the value changed back.
- **Value changes:** changing a field's value aborts its in-flight check, ignores its late result, and clears its async message and `asyncError()` at once. The check runs again on the next blur or submit.
- **Stale submits:** if a checked value changes, or `reset()` runs, while the checks are pending, `handleSubmit` resolves `false` without calling `onSubmit`. Submit again. If any field has a sync error once the checks finish, for example because it was edited meanwhile, submit also resolves `false` and reports it like any failed submit.
- **Reset and disposal:** `reset()` and disposal of the owning scope abort every in-flight check. Their results are ignored.
- **Errors:** a sync error for the same field wins over the async message. The async message is kept through `validate()` and revalidation, and it appears again when the sync error clears.
- **Calling `validate()`:** runs only the sync validator. It does not start async checks.

### Async failures fail open

If a check throws or rejects, the field gets no error, `asyncError()` returns the error, the form logs it with `console.error`, and submit is not blocked. Editing the field clears `asyncError()`, and the next check sets it again if that check also fails. A check that was aborted on purpose does not log. The server must still validate, because a failed check does not prove the value is valid.

### Async validation limits

- No debounced or as-you-type checks. Checks run on blur and submit only.
- No cross-field async rules. A field's check does not re-run when another field changes. Use the sync `validate` option for rules that depend on other fields; it runs on submit.
- No built-in timeout. A check that never settles keeps `validating()` true until its field changes, is blurred again, is reset, or the scope is disposed. Add a timeout in your check with `signal`.
- Async checks are not server-side validation. Validate again on the server.

## Native markup example

The add-on leaves markup to the application. Without the opt-in `focusInvalid` and `announceErrors` options, it also leaves focus and announcements to the application:

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
<script>
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

