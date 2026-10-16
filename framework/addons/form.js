/* Provide reactive form values, validation, submission, and reset helpers. */
import { signal } from "nodula-framework";
import { createStore } from "nodula-framework/store";

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

/** Create reactive form values, validation, touched state, submission, and reset helpers. */
export function createForm(initialValues, { validate: validateValues, onSubmit } = {}) {
  if (!initialValues || typeof initialValues !== "object" || Array.isArray(initialValues)) {
    throw new TypeError("createForm expects an object of initial form values.");
  }

  const originalValues = cloneFormValue(initialValues);
  const values = createStore(cloneFormValue(originalValues));
  const errors = createStore({});
  const touched = createStore({});
  const [submitting, setSubmitting] = signal(false);
  const [submitted, setSubmitted] = signal(false);

  function clearStore(store) {
    for (const key of Object.keys(store)) delete store[key];
  }

  function validate() {
    const nextErrors = validateValues?.(values) ?? {};
    clearStore(errors);
    for (const [field, message] of Object.entries(nextErrors)) {
      if (typeof message === "string" && message) errors[field] = message;
    }
    return errors;
  }

  function validateField(field) {
    if (!validateValues) return;
    const nextErrors = validateValues(values);
    const message = nextErrors?.[field];
    if (typeof message === "string" && message) errors[field] = message;
    else delete errors[field];
  }

  function setFieldValue(field, value) {
    values[field] = value;
    if (touched[field] || errors[field]) validateField(field);
  }

  function setFieldTouched(field, isTouched = true) {
    touched[field] = isTouched;
    if (isTouched) validateField(field);
  }

  function handleChange(field) {
    return (event) => {
      const target = event?.currentTarget ?? event?.target;
      if (!target) throw new TypeError("Form change handlers expect an event with a target.");
      setFieldValue(field, target.type === "checkbox" ? Boolean(target.checked) : target.value);
    };
  }

  function handleBlur(field) {
    return () => setFieldTouched(field);
  }

  async function handleSubmit(event) {
    event?.preventDefault?.();
    for (const field of Object.keys(values)) touched[field] = true;
    validate();
    if (Object.keys(errors).length || submitting()) return false;

    setSubmitting(true);
    try {
      await onSubmit?.(escapeFormHtml(values), event);
      setSubmitted(true);
      return true;
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    clearStore(values);
    for (const [field, value] of Object.entries(cloneFormValue(originalValues)))
      values[field] = value;
    clearStore(errors);
    clearStore(touched);
    setSubmitting(false);
    setSubmitted(false);
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
  };
}
