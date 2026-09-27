export type Accessor<T> = () => T;

export type FormErrors<T extends object> = Partial<Record<keyof T, string>>;
export type FormValidator<T extends object> = (values: T) => FormErrors<T>;
export interface FormOptions<T extends object> {
  validate?: FormValidator<T>;
  onSubmit?: (values: T, event?: SubmitEvent) => void | Promise<void>;
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
}

/** Create a reactive form controller with optional validation and submit handling. */
export function createForm<T extends object>(initialValues: T, options?: FormOptions<T>): FormController<T>;