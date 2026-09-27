import { batch, signal } from '../reactivity.js';

const STORE_KEYS = Symbol('nodula.store.keys');
const ARRAY_MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin']);

function isStoreObject(value) {
  return value !== null && typeof value === 'object' &&
    (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

/** Create a deeply reactive proxy over a plain object or array. */
export function createStore(initialValue) {
  if (!isStoreObject(initialValue)) throw new TypeError('createStore expects a plain object or array.');
  const proxies = new WeakMap();
  const targets = new WeakMap();
  const subscriptions = new WeakMap();

  function subscribersFor(target, key) {
    let keys = subscriptions.get(target);
    if (!keys) {
      keys = new Map();
      subscriptions.set(target, keys);
    }
    if (!keys.has(key)) keys.set(key, signal(0));
    return keys.get(key);
  }

  function publish(target, key) {
    const [, setVersion] = subscribersFor(target, key);
    setVersion((version) => version + 1);
  }

  function wrap(target) {
    if (!isStoreObject(target)) return target;
    if (proxies.has(target)) return proxies.get(target);
    for (const key of Reflect.ownKeys(target)) subscribersFor(target, key);
    subscribersFor(target, STORE_KEYS);

    const proxy = new Proxy(target, {
      get(object, key, receiver) {
        if (Array.isArray(object) && ARRAY_MUTATORS.has(key)) {
          return (...args) => batch(() => Array.prototype[key].apply(receiver, args));
        }
        const [read] = subscribersFor(object, key);
        read();
        return wrap(Reflect.get(object, key, receiver));
      },
      set(object, key, value) {
        return batch(() => {
          const raw = targets.get(value) ?? value;
          const existed = Object.prototype.hasOwnProperty.call(object, key);
          const previous = Reflect.get(object, key);
          const length = Array.isArray(object) ? object.length : 0;
          const changed = Reflect.set(object, key, raw);
          if (!changed) return false;
          if (!existed || !Object.is(previous, raw)) publish(object, key);
          if (!existed) publish(object, STORE_KEYS);
          if (Array.isArray(object) && key !== 'length' && object.length !== length) publish(object, 'length');
          if (Array.isArray(object) && key === 'length' && raw < length) {
            for (let index = raw; index < length; index += 1) publish(object, String(index));
            publish(object, STORE_KEYS);
          }
          return true;
        });
      },
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
      has(object, key) {
        const [read] = subscribersFor(object, key);
        read();
        return Reflect.has(object, key);
      },
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

  return wrap(initialValue);
}