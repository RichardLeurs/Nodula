// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Provide reactive form values, validation, submission, and reset helpers. */
import { onCleanup, signal, untrack } from "nodula-framework";
import { createStore } from "nodula-framework/store";

/**
 * Register a dispose function with the current owner.
 *
 * Outside an owner the caller must dispose the form itself; there is no owner to clean up with.
 *
 * @param {() => void} dispose
 */
function registerCleanup(dispose) {
  try {
    onCleanup(dispose);
  } catch {
    // Forms can be created outside a Nodula owner; nothing else will abort their checks then.
  }
}

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

/** Element `DOCUMENT_POSITION_PRECEDING` bit: the other node comes before this one. */
const DOCUMENT_POSITION_PRECEDING = 2;

/** Visually hidden but read by screen readers, the same technique as the sortable live region. */
const visuallyHiddenStyle =
  "position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;";

let nextFormId = 0;

/** Create reactive form values, validation, touched state, submission, and reset helpers. */
export function createForm(
  initialValues,
  {
    validate: validateValues,
    validateAsync = {},
    onSubmit,
    escapeHtml = true,
    idPrefix = `nodula-form-${nextFormId++}`,
    focusInvalid = false,
    announceErrors = false,
  } = {},
) {
  if (!initialValues || typeof initialValues !== "object" || Array.isArray(initialValues)) {
    throw new TypeError("createForm expects an object of initial form values.");
  }
  if (typeof escapeHtml !== "boolean") throw new TypeError("createForm escapeHtml must be a boolean.");
  if (typeof focusInvalid !== "boolean") throw new TypeError("createForm focusInvalid must be a boolean.");
  if (announceErrors !== false && announceErrors !== true && typeof announceErrors !== "function")
    throw new TypeError("createForm announceErrors must be a boolean or a function.");
  if (typeof idPrefix !== "string" || !idPrefix)
    throw new TypeError("createForm idPrefix must be a non-empty string.");
  if (!/^[A-Za-z][\w-]*$/.test(idPrefix))
    throw new TypeError("createForm idPrefix must be a valid identifier (letters, digits, - or _).");
  if (!validateAsync || typeof validateAsync !== "object" || Array.isArray(validateAsync))
    throw new TypeError("createForm validateAsync must be an object of functions.");
  for (const [field, check] of Object.entries(validateAsync)) {
    if (!Object.hasOwn(initialValues, field))
      throw new TypeError(`createForm validateAsync has no field "${field}".`);
    if (typeof check !== "function")
      throw new TypeError(`createForm validateAsync field "${field}" must be a function.`);
  }

  const originalValues = cloneFormValue(initialValues);
  const values = createStore(cloneFormValue(originalValues));
  const errors = createStore({});
  const touched = createStore({});
  const [submitting, setSubmitting] = signal(false);
  const [submitted, setSubmitted] = signal(false);
  const [submitError, setSubmitError] = signal(null);
  // Sync and async results are kept apart and merged into `errors`, so re-running one never erases the other.
  const syncErrors = {};
  const asyncMessages = {};
  // The value of each field whose async check last passed; a submit skips the check for an unchanged value.
  const asyncPassed = {};
  const asyncChecks = {};
  const pendingFields = createStore({});
  const asyncFailures = createStore({});
  // The live region is created on the first announcement, so forms that do not announce add no DOM.
  let errorRegion = null;
  let announcementsEnded = false;

  /**
   * Remove every key from a store object.
   *
   * @param {object} store
   */
  function clearStore(store) {
    for (const key of Object.keys(store)) delete store[key];
  }

  /**
   * Show the sync error of a field, or else its async message. A sync error wins, so an async message never hides it.
   *
   * @param {string} field
   */
  function publishField(field) {
    const message = syncErrors[field] ?? asyncMessages[field];
    if (message) errors[field] = message;
    else delete errors[field];
  }

  /**
   * Run the validator over all values and replace the sync errors. Async messages are kept.
   *
   * @returns {object} The errors store.
   */
  function validate() {
    const nextErrors = validateValues?.(values) ?? {};
    clearStore(syncErrors);
    for (const [field, message] of Object.entries(nextErrors)) {
      if (typeof message === "string" && message) syncErrors[field] = message;
    }
    clearStore(errors);
    for (const field of Object.keys({ ...asyncMessages, ...syncErrors })) publishField(field);
    return errors;
  }

  /**
   * Re-run the validator and update the sync error of one field.
   *
   * @param {string} field
   */
  function validateField(field) {
    if (!validateValues) return;
    const nextErrors = validateValues(values);
    const message = nextErrors?.[field];
    if (typeof message === "string" && message) syncErrors[field] = message;
    else delete syncErrors[field];
    publishField(field);
  }

  /**
   * Abort the in-flight async check of a field. Its result is ignored when it settles.
   *
   * @param {string} field
   */
  function abortAsyncCheck(field) {
    const check = asyncChecks[field];
    if (!check) return;
    delete asyncChecks[field];
    delete pendingFields[field];
    check.controller.abort();
  }

  /**
   * Forget the async state of a field whose value changed. Its old result no longer describes the value.
   *
   * @param {string} field
   */
  function clearAsyncField(field) {
    abortAsyncCheck(field);
    delete asyncPassed[field];
    delete asyncMessages[field];
    delete asyncFailures[field];
    publishField(field);
  }

  /**
   * Apply a finished async check unless it was superseded.
   *
   * @param {string} field
   * @param {{ value: unknown, controller: AbortController }} check
   * @param {unknown} message The validator's result: a non-empty string is an error.
   * @returns {boolean} True when the value is current and passed, false when it failed or was superseded.
   */
  function settleAsyncCheck(field, check, message) {
    if (asyncChecks[field] !== check) return false;
    delete asyncChecks[field];
    delete pendingFields[field];
    delete asyncFailures[field];
    if (typeof message === "string" && message) {
      delete asyncPassed[field];
      asyncMessages[field] = message;
      publishField(field);
      return false;
    }
    asyncPassed[field] = check.value;
    delete asyncMessages[field];
    publishField(field);
    return true;
  }

  /**
   * Record a validator that threw or rejected. The field gets no error, so submit is not blocked (fail open).
   *
   * @param {string} field
   * @param {{ controller: AbortController }} check
   * @param {unknown} error
   * @returns {boolean} True, unless the check was superseded before it failed.
   */
  function failAsyncCheck(field, check, error) {
    if (asyncChecks[field] !== check) return false;
    delete asyncChecks[field];
    delete pendingFields[field];
    delete asyncMessages[field];
    delete asyncPassed[field];
    console.error(`createForm validateAsync failed for field "${field}":`, error);
    asyncFailures[field] = error;
    publishField(field);
    return true;
  }

  /**
   * Start the async check of one field, aborting any check already in flight for it.
   *
   * The validator runs untracked, so signals it reads are not tracked by the caller's effect.
   *
   * @param {string} field
   * @returns {Promise<boolean>} Resolves like settleAsyncCheck. Never rejects.
   */
  function startAsyncCheck(field) {
    abortAsyncCheck(field);
    const check = { value: cloneFormValue(values[field]), controller: new AbortController() };
    asyncChecks[field] = check;
    pendingFields[field] = true;
    check.promise = new Promise((resolve) => {
      resolve(
        untrack(() =>
          validateAsync[field](check.value, { signal: check.controller.signal, values }),
        ),
      );
    }).then(
      (message) => settleAsyncCheck(field, check, message),
      (error) => failAsyncCheck(field, check, error),
    );
    return check.promise;
  }

  /**
   * Abort every in-flight async check.
   */
  function abortAllAsyncChecks() {
    for (const field of Object.keys(asyncChecks)) abortAsyncCheck(field);
  }

  /**
   * Run the async checks that submit needs: fields with a validator, no sync error, and a value that has not passed.
   *
   * A check already in flight for the current value is awaited instead of restarted.
   *
   * @returns {Promise<boolean>} True when every check passed and none was superseded.
   */
  async function runAsyncChecks() {
    const checks = [];
    for (const field of Object.keys(validateAsync)) {
      if (syncErrors[field]) continue;
      const inFlight = asyncChecks[field];
      if (inFlight && equalFormValue(inFlight.value, values[field])) {
        checks.push(inFlight.promise);
      } else if (!(Object.hasOwn(asyncPassed, field) && equalFormValue(asyncPassed[field], values[field]))) {
        checks.push(startAsyncCheck(field));
      }
    }
    return (await Promise.all(checks)).every(Boolean);
  }

  /**
   * Set one field value. A changed value clears its async state; its error is re-checked once the field has been touched or has an error.
   *
   * @param {string} field
   * @param {unknown} value
   */
  function setFieldValue(field, value) {
    const revalidate = touched[field] || errors[field];
    const changed = !equalFormValue(values[field], value);
    values[field] = value;
    if (changed && Object.hasOwn(validateAsync, field)) clearAsyncField(field);
    if (revalidate) validateField(field);
  }

  /**
   * Mark a field touched or untouched. Touching it validates it, then runs its async check when it has no sync error.
   *
   * @param {string} field
   * @param {boolean} [isTouched]
   */
  function setFieldTouched(field, isTouched = true) {
    touched[field] = isTouched;
    if (!isTouched) return;
    validateField(field);
    if (Object.hasOwn(validateAsync, field) && !syncErrors[field]) startAsyncCheck(field);
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
   * Find the control element of a field, searching the submitted form first.
   *
   * @param {HTMLFormElement | undefined} form
   * @param {string} id
   * @returns {HTMLElement | null}
   */
  function findControl(form, id) {
    return form?.querySelector(`#${id}`) ?? (form?.ownerDocument ?? document).getElementById(id);
  }

  /**
   * Move focus to the control of the first invalid field in document order.
   *
   * Fields without a control element on the page are skipped, so the option needs `field().attributes()` or the control id.
   *
   * @param {HTMLFormElement | undefined} form
   */
  function focusFirstInvalid(form) {
    const controls = Object.keys(errors)
      .filter((name) => Object.hasOwn(originalValues, name))
      .map((name) => findControl(form, field(name).ids.control))
      .filter(Boolean);
    if (!controls.length) return;
    const first = controls.reduce((best, control) =>
      best.compareDocumentPosition(control) & DOCUMENT_POSITION_PRECEDING ? control : best,
    );
    first.focus();
  }

  /**
   * Write the error message to the visually hidden live region, creating the region on first use.
   *
   * The region sits inside the submitted form, or in the body when the submit did not come from a form.
   * The text is cleared before it is set, so repeating the same message is announced again.
   *
   * @param {HTMLFormElement | undefined} form
   */
  function announceFailure(form) {
    if (announcementsEnded) return;
    const snapshot = untrack(() => ({ ...errors }));
    const count = Object.keys(snapshot).length;
    if (!errorRegion) {
      errorRegion = (form?.ownerDocument ?? document).createElement("div");
      errorRegion.setAttribute("role", "status");
      errorRegion.setAttribute("aria-live", "polite");
      errorRegion.style.cssText = visuallyHiddenStyle;
    }
    const container = form ?? errorRegion.ownerDocument.body;
    if (errorRegion.parentNode !== container) container.append(errorRegion);

    let message;
    if (typeof announceErrors === "function") {
      delete errorRegion.dataset.nodulaCode;
      message = announceErrors(snapshot);
    } else if (count === 1) {
      errorRegion.dataset.nodulaCode = "nodula-form-errors-one";
      message = "1 field has an error.";
    } else {
      errorRegion.dataset.nodulaCode = "nodula-form-errors-many";
      message = `${count} fields have errors.`;
    }
    errorRegion.textContent = "";
    errorRegion.textContent = message;
  }

  /**
   * Remove the live region when the owner is disposed, and stop announcing afterwards.
   */
  function removeErrorRegion() {
    announcementsEnded = true;
    errorRegion?.remove();
    errorRegion = null;
  }

  /**
   * Apply the focus and announcement options after a submit failed validation.
   *
   * @param {HTMLFormElement | undefined} form The submitted form, when the event came from one.
   */
  function reportFailedSubmit(form) {
    if (focusInvalid) focusFirstInvalid(form);
    if (announceErrors !== false) announceFailure(form);
  }

  /**
   * Mark every field touched, validate, run the async checks, and call `onSubmit` when the form is valid.
   *
   * Submitting stays true during the async checks, so a second submit returns false. If a checked value changes
   * or `reset()` runs while the checks are pending, the result is stale: submit returns false without calling
   * `onSubmit`, and the user submits again.
   *
   * The error from `onSubmit` is recorded in `submitError()` and rethrown.
   *
   * With `focusInvalid` or `announceErrors`, a failed validation (sync or async) focuses the first invalid control
   * and announces the error count. Ignored submits and stale results do not.
   *
   * @param {SubmitEvent} [event] Its default action is prevented.
   * @returns {Promise<boolean>} True when the submit succeeded, false when validation failed.
   */
  async function handleSubmit(event) {
    // currentTarget is only set during dispatch, so read the form before the first await.
    const form = event?.currentTarget?.tagName === "FORM" ? event.currentTarget : undefined;
    event?.preventDefault?.();
    for (const field of Object.keys(values)) touched[field] = true;
    validate();
    if (submitting()) return false;
    if (Object.keys(errors).length) {
      reportFailedSubmit(form);
      return false;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      if (Object.keys(validateAsync).length && !(await runAsyncChecks())) {
        // A superseded check leaves no error behind, so only a failed check is reported.
        if (Object.keys(errors).length) reportFailedSubmit(form);
        return false;
      }
      // A field without an async check may have been changed into a sync error while the checks ran.
      if (Object.keys(errors).length) {
        reportFailedSubmit(form);
        return false;
      }
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
    abortAllAsyncChecks();
    clearStore(asyncPassed);
    clearStore(asyncMessages);
    clearStore(asyncFailures);
    clearStore(syncErrors);
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
      /** True while the async check of this field is running. */
      validating: () => Boolean(pendingFields[name]),
      /** The error thrown by the field's last async check, or null. The form continues without an error. */
      asyncError: () => asyncFailures[name] ?? null,
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

  registerCleanup(abortAllAsyncChecks);
  if (announceErrors !== false) registerCleanup(removeErrorRegion);

  return {
    values,
    errors,
    touched,
    submitting,
    submitted,
    dirty: () => !equalFormValue(values, originalValues),
    valid: () => Object.keys(errors).length === 0,
    /** True while any async check of the form is running. */
    validating: () => Object.keys(pendingFields).length > 0,
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
