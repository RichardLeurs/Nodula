export type Accessor<T> = () => T;

export type FormErrors<T extends object> = Partial<Record<keyof T, string>>;
export type FormValidator<T extends object> = (values: T) => FormErrors<T>;
export interface FormOptions<T extends object> {
  validate?: FormValidator<T>;
  onSubmit?: (values: T, event?: SubmitEvent) => void | Promise<void>;
  /** When true (the default), onSubmit receives a detached copy with HTML-sensitive characters escaped. Set false for raw values. */
  escapeHtml?: boolean;
  /** Prefix for generated element IDs. Defaults to a unique per-form prefix; must be a valid identifier. */
  idPrefix?: string;
}
export interface FormFieldAttributes {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: "true";
}
export interface FormField<V> {
  name: string;
  ids: { control: string; description: string; error: string };
  value: Accessor<V>;
  error: Accessor<string | null>;
  touched: Accessor<boolean>;
  dirty: Accessor<boolean>;
  /** The error to show: only after the field is touched or a submit was attempted. */
  visibleError: Accessor<string | null>;
  invalid: Accessor<boolean>;
  /** Attributes for the control. Pass { description: true } only when a description element is rendered. */
  attributes(options?: { description?: boolean }): FormFieldAttributes;
}
export interface FormController<T extends object> {
  values: T;
  errors: FormErrors<T>;
  touched: Partial<Record<keyof T, boolean>>;
  submitting: Accessor<boolean>;
  submitted: Accessor<boolean>;
  dirty: Accessor<boolean>;
  valid: Accessor<boolean>;
  setFieldValue<K extends keyof T>(field: K, value: T[K]): void;
  setFieldTouched<K extends keyof T>(field: K, touched?: boolean): void;
  handleChange<K extends keyof T>(field: K): (event: Event) => void;
  handleBlur<K extends keyof T>(field: K): () => void;
  validate(): FormErrors<T>;
  handleSubmit(event: SubmitEvent): Promise<boolean>;
  reset(): void;
  /** Helpers for one field. Throws for a name that is not in the initial values. */
  field<K extends keyof T & string>(name: K): FormField<T[K]>;
  /** The error thrown by the most recent failed onSubmit, unchanged; null otherwise. */
  submitError: Accessor<unknown>;
}

/** Create a reactive form controller with optional validation and submit handling. */
export function createForm<T extends object>(
  initialValues: T,
  options?: FormOptions<T>,
): FormController<T>;
