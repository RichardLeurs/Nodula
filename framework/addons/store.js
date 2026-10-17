// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Provide deeply reactive object and array state as an optional add-on. */
import { batch, signal } from "../reactivity.js";

const STORE_KEYS = Symbol("nodula.store.keys");
const ARRAY_MUTATORS = new Set([
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
  "fill",
  "copyWithin",
]);

/**
 * Whether a value can be wrapped in a store: an array, or an object with a plain or null prototype.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isStoreObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    (Array.isArray(value) ||
      Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

// One registry for every store: an object has a single proxy and subscriber set, so nesting
// one store inside another keeps identity and both see the same updates.
const proxies = new WeakMap();
const targets = new WeakMap();
const subscriptions = new WeakMap();

/**
 * Get the signal that tracks one property of a target, creating it on first use.
 *
 * @param {object} target
 * @param {PropertyKey} key
 * @returns {[() => number, (update: (version: number) => number) => number]}
 */
function subscribersFor(target, key) {
  let keys = subscriptions.get(target);
  if (!keys) {
    keys = new Map();
    subscriptions.set(target, keys);
  }
  if (!keys.has(key)) keys.set(key, signal(0));
  return keys.get(key);
}

/**
 * Notify readers of one property by bumping its version.
 *
 * @param {object} target
 * @param {PropertyKey} key
 */
function publish(target, key) {
  const [, setVersion] = subscribersFor(target, key);
  setVersion((version) => version + 1);
}

/**
 * Return the raw object behind a store proxy, or the value itself.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
const unwrap = (value) => targets.get(value) ?? value;

/**
 * Return the store proxy for a plain object or array, creating and caching it on first use.
 *
 * Other values are returned unchanged.
 *
 * @param {unknown} target
 * @returns {unknown}
 */
function wrap(target) {
  if (targets.has(target)) return target;
  if (!isStoreObject(target)) return target;
  if (proxies.has(target)) return proxies.get(target);
  for (const key of Reflect.ownKeys(target)) subscribersFor(target, key);
  subscribersFor(target, STORE_KEYS);

  const proxy = new Proxy(target, {
    /**
     * Proxy read trap. Tracks the property and wraps nested objects.
     *
     * Array mutators return a function that runs as a single batch.
     */
    get(object, key, receiver) {
      if (Array.isArray(object) && ARRAY_MUTATORS.has(key)) {
        return (...args) => batch(() => Array.prototype[key].apply(receiver, args));
      }
      const [read] = subscribersFor(object, key);
      read();
      return wrap(Reflect.get(object, key, receiver));
    },
    /**
     * Proxy write trap. Stores the raw value and notifies readers of the property.
     *
     * Key enumeration is notified when a key is added, and array length when it changes. The whole write is one batch.
     */
    set(object, key, value) {
      return batch(() => {
        const raw = unwrap(value);
        const existed = Object.prototype.hasOwnProperty.call(object, key);
        const previous = Reflect.get(object, key);
        const length = Array.isArray(object) ? object.length : 0;
        const changed = Reflect.set(object, key, raw);
        if (!changed) return false;
        if (!existed || !Object.is(previous, raw)) publish(object, key);
        if (!existed) publish(object, STORE_KEYS);
        if (Array.isArray(object) && key !== "length" && object.length !== length)
          publish(object, "length");
        if (Array.isArray(object) && key === "length" && raw < length) {
          for (let index = raw; index < length; index += 1) publish(object, String(index));
          publish(object, STORE_KEYS);
        }
        return true;
      });
    },
    // Object.defineProperty bypasses the set trap, so it publishes on its own.
    /**
     * Proxy trap for `Object.defineProperty`. Stores the descriptor and notifies readers, as a write does.
     */
    defineProperty(object, key, descriptor) {
      return batch(() => {
        const previous = Reflect.getOwnPropertyDescriptor(object, key);
        const length = Array.isArray(object) ? object.length : 0;
        const next = "value" in descriptor ? { ...descriptor, value: unwrap(descriptor.value) } : descriptor;
        if (!Reflect.defineProperty(object, key, next)) return false;
        publish(object, key);
        if (!previous || ("enumerable" in next && next.enumerable !== previous.enumerable))
          publish(object, STORE_KEYS);
        if (Array.isArray(object) && key !== "length" && object.length !== length)
          publish(object, "length");
        return true;
      });
    },
    /**
     * Proxy trap for `delete`. Removes the property and notifies its readers and key enumeration.
     */
    deleteProperty(object, key) {
      if (!Object.prototype.hasOwnProperty.call(object, key)) return true;
      return batch(() => {
        const deleted = Reflect.deleteProperty(object, key);
        if (deleted) {
          publish(object, key);
          publish(object, STORE_KEYS);
        }
        return deleted;
      });
    },
    /**
     * Proxy trap for the `in` operator. Tracks the property presence.
     */
    has(object, key) {
      const [read] = subscribersFor(object, key);
      read();
      return Reflect.has(object, key);
    },
    /**
     * Proxy trap for own-key enumeration. Tracks key enumeration.
     */
    ownKeys(object) {
      const [read] = subscribersFor(object, STORE_KEYS);
      read();
      return Reflect.ownKeys(object);
    },
  });
  proxies.set(target, proxy);
  targets.set(proxy, target);
  return proxy;
}

/** Create a deeply reactive proxy over a plain object or array. Passing a store returns it unchanged. */
export function createStore(initialValue) {
  const raw = unwrap(initialValue);
  if (!isStoreObject(raw)) throw new TypeError("createStore expects a plain object or array.");
  return wrap(raw);
}
