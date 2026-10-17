// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Provide reactive form values, validation, submission, and reset helpers. */
import { signal } from "nodula-framework";
import { createStore } from "nodula-framework/store";

/**
 * Deep-copy form values so the initial values and the reactive values never share objects.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
function cloneFormValue(value) {
  if (Array.isArray(value)) return value.map(cloneFormValue);
  if (value && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(
        "createForm values must contain only plain objects, arrays, and primitive values.",
      );
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneFormValue(entry)]),
    );
  }
  return value;
}

/**
 * Compare form values structurally, for the dirty state.
 *
 * @param {unknown} left
 * @param {unknown} right
 * @returns {boolean}
 */
function equalFormValue(left, right) {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(right, key) && equalFormValue(left[key], right[key]),
    )
  );
}

/**
 * Escape HTML-sensitive characters in every string of a value, returning a copy.
 *
 * Used for `onSubmit` values when `escapeHtml` is on. Nested arrays and plain objects are escaped too.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
function escapeFormHtml(value) {
  if (typeof value === "string") {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  }
  if (Array.isArray(value)) return value.map(escapeFormHtml);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, escapeFormHtml(entry)]),
    );
  }
  return value;
}

let nextFormId = 0;

/** Create reactive form values, validation, touched state, submission, and reset helpers. */
export function createForm(
  initialValues,
  {
    validate: validateValues,
    onSubmit,
    escapeHtml = true,
    idPrefix = `nodula-form-${nextFormId++}`,
  } = {},
) {
  if (!initialValues || typeof initialValues !== "object" || Array.isArray(initialValues)) {
    throw new TypeError("createForm expects an object of initial form values.");
  }
  if (typeof escapeHtml !== "boolean") throw new TypeError("createForm escapeHtml must be a boolean.");
  if (typeof idPrefix !== "string" || !idPrefix)
    throw new TypeError("createForm idPrefix must be a non-empty string.");
  if (!/^[A-Za-z][\w-]*$/.test(idPrefix))
    throw new TypeError("createForm idPrefix must be a valid identifier (letters, digits, - or _).");

  const originalValues = cloneFormValue(initialValues);
  const values = createStore(cloneFormValue(originalValues));
  const errors = createStore({});
  const touched = createStore({});
  const [submitting, setSubmitting] = signal(false);
  const [submitted, setSubmitted] = signal(false);
  const [submitError, setSubmitError] = signal(null);

  /**
   * Remove every key from a store object.
   *
   * @param {object} store
   */
  function clearStore(store) {
    for (const key of Object.keys(store)) delete store[key];
  }

  /**
   * Run the validator over all values and replace the errors.
   *
   * @returns {object} The errors store.
   */
  function validate() {
    const nextErrors = validateValues?.(values) ?? {};
    clearStore(errors);
    for (const [field, message] of Object.entries(nextErrors)) {
      if (typeof message === "string" && message) errors[field] = message;
    }
    return errors;
  }

  /**
   * Re-run the validator and update the error of one field.
   *
   * @param {string} field
   */
  function validateField(field) {
    if (!validateValues) return;
    const nextErrors = validateValues(values);
    const message = nextErrors?.[field];
    if (typeof message === "string" && message) errors[field] = message;
    else delete errors[field];
  }

  /**
   * Set one field value. Its error is re-checked once the field has been touched or has an error.
   *
   * @param {string} field
   * @param {unknown} value
   */
  function setFieldValue(field, value) {
    values[field] = value;
    if (touched[field] || errors[field]) validateField(field);
  }

  /**
   * Mark a field touched or untouched, and validate it when it becomes touched.
   *
   * @param {string} field
   * @param {boolean} [isTouched]
   */
  function setFieldTouched(field, isTouched = true) {
    touched[field] = isTouched;
    if (isTouched) validateField(field);
  }

  /**
   * Create a change handler that writes a control value to a field.
   *
   * Checkboxes write their checked state.
   *
   * @param {string} field
   * @returns {(event: Event) => void}
   * @throws {TypeError} When the event has no target.
   */
  function handleChange(field) {
    return (event) => {
      const target = event?.currentTarget ?? event?.target;
      if (!target) throw new TypeError("Form change handlers expect an event with a target.");
      setFieldValue(field, target.type === "checkbox" ? Boolean(target.checked) : target.value);
    };
  }

  /**
   * Create a blur handler that marks a field touched.
   *
   * @param {string} field
   * @returns {() => void}
   */
  function handleBlur(field) {
    return () => setFieldTouched(field);
  }

  /**
   * Mark every field touched, validate, and call `onSubmit` when the form is valid.
   *
   * The error from `onSubmit` is recorded in `submitError()` and rethrown.
   *
   * @param {SubmitEvent} [event] Its default action is prevented.
   * @returns {Promise<boolean>} True when the submit succeeded, false when validation failed.
   */
  async function handleSubmit(event) {
    event?.preventDefault?.();
    for (const field of Object.keys(values)) touched[field] = true;
    validate();
    if (Object.keys(errors).length || submitting()) return false;

    setSubmitting(true);
    setSubmitError(null);
    try {
      // Escaped by default for HTML-context output; escapeHtml: false passes the reactive values object.
      await onSubmit?.(escapeHtml ? escapeFormHtml(values) : values, event);
      setSubmitted(true);
      return true;
    } catch (error) {
      // Record the failure for the UI, then rethrow so callers still see it.
      setSubmitError(() => error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Restore the initial values and clear errors, touched state, and submission state.
   */
  function reset() {
    clearStore(values);
    for (const [field, value] of Object.entries(cloneFormValue(originalValues)))
      values[field] = value;
    clearStore(errors);
    clearStore(touched);
    setSubmitting(false);
    setSubmitted(false);
    setSubmitError(null);
  }

  // Stable IDs derive from the prefix and field name, so label, description and error elements can reference each other.
  /**
   * Return helpers for one field: its value, error, touched and dirty state, stable IDs and control attributes.
   *
   * @param {string} name A key of the initial values.
   * @returns {object}
   * @throws {TypeError} If the name is not a field of the form.
   */
  function field(name) {
    if (typeof name !== "string" || !Object.hasOwn(originalValues, name))
      throw new TypeError(`createForm has no field "${name}".`);
    const control = `${idPrefix}-${name.replace(/[^A-Za-z0-9_-]/g, "-")}`;
    const ids = { control, description: `${control}-description`, error: `${control}-error` };
    /**
     * The error to show: only once the field is touched.
     */
    const visibleError = () => (touched[name] && errors[name]) || null;
    return {
      name,
      ids,
      value: () => values[name],
      error: () => errors[name] ?? null,
      touched: () => Boolean(touched[name]),
      dirty: () => !equalFormValue(values[name], originalValues[name]),
      /** The error to show: only after the field has been touched or a submit was attempted. */
      visibleError,
      invalid: () => visibleError() !== null,
      /** Attributes for the control. Reference the description only when the app renders one. */
      attributes({ description = false } = {}) {
        const describedBy = [description ? ids.description : null, visibleError() ? ids.error : null]
          .filter(Boolean)
          .join(" ");
        return {
          id: ids.control,
          ...(describedBy ? { "aria-describedby": describedBy } : {}),
          ...(visibleError() ? { "aria-invalid": "true" } : {}),
        };
      },
    };
  }

  return {
    values,
    errors,
    touched,
    submitting,
    submitted,
    dirty: () => !equalFormValue(values, originalValues),
    valid: () => Object.keys(errors).length === 0,
    setFieldValue,
    setFieldTouched,
    handleChange,
    handleBlur,
    validate,
    handleSubmit,
    reset,
    field,
    submitError: () => submitError(),
  };
}
