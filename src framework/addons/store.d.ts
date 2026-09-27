/** Create a deeply reactive proxy over a plain object or array. */
export function createStore<T extends object>(initialValue: T): T;