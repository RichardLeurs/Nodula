// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Declare component props with types, defaults and validation, and forward undeclared attributes to the root element. */
import { effect, untrack } from "nodula-framework";

const OPTION_KEYS = new Set(["type", "required", "default", "validate"]);
const PROP_NAME = /^[a-zA-Z_$][\w$-]*$/;
// Primitive constructors are checked with typeof, which also rejects boxed values such as new String("a").
const TYPEOF_TYPES = new Map([
  [String, "string"],
  [Number, "number"],
  [Boolean, "boolean"],
  [BigInt, "bigint"],
  [Symbol, "symbol"],
  [Function, "function"],
]);
// Attributes that a component cannot receive from a caller, because h() gives them special meaning.
const NEVER_FORWARDED = new Set(["ref", "bind", "show"]);

/**
 * Check whether a value is an object literal or an object without a prototype.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Check whether a key is an event listener prop, such as `onClick` or `on:click`.
 *
 * @param {string} key
 * @returns {boolean}
 */
function isEventKey(key) {
  return /^on(?::|[A-Z])/.test(key);
}

/**
 * Convert an event prop to the event name it listens for, matching how h() reads it.
 *
 * @param {string} key An `on:name` or `onName` prop.
 * @returns {string}
 */
function eventName(key) {
  return key.startsWith("on:") ? key.slice(3) : key.slice(2).toLowerCase();
}

/**
 * Validate a prop schema once, when the component is declared, so malformed schemas fail at startup.
 *
 * @param {unknown} schema
 * @returns {Record<string, object>} A copy of the schema with each entry copied.
 * @throws {TypeError} For a schema that is not an object, an entry that is not an options object, an unknown option,
 *   a non-constructor type, a non-function validator, a non-boolean `required`, `required` with a default, or an object
 *   default, which must be a factory so instances do not share it.
 */
function checkSchema(schema) {
  if (!isPlainObject(schema)) throw new TypeError("withProps schema must be a plain object.");
  const declared = Object.create(null);
  for (const [name, options] of Object.entries(schema)) {
    if (!PROP_NAME.test(name)) throw new TypeError(`withProps prop name "${name}" is not a valid name.`);
    if (!isPlainObject(options))
      throw new TypeError(`withProps prop "${name}" must be an options object, such as {}.`);
    for (const option of Object.keys(options)) {
      if (!OPTION_KEYS.has(option))
        throw new TypeError(`withProps prop "${name}" has unknown option "${option}".`);
    }

    const { type, required, default: fallback, validate } = options;
    if (type !== undefined && typeof type !== "function")
      throw new TypeError(`withProps prop "${name}" type must be a constructor.`);
    if (validate !== undefined && typeof validate !== "function")
      throw new TypeError(`withProps prop "${name}" validate must be a function.`);
    if (required !== undefined && typeof required !== "boolean")
      throw new TypeError(`withProps prop "${name}" required must be a boolean.`);
    if (required === true && fallback !== undefined)
      throw new TypeError(`withProps prop "${name}" cannot be both required and have a default.`);
    if (fallback !== null && typeof fallback === "object")
      throw new TypeError(
        `withProps prop "${name}" default must be a factory for objects and arrays, such as () => [].`,
      );
    declared[name] = { ...options };
  }
  return declared;
}

/**
 * Check whether a non-null value matches a constructor type.
 *
 * @param {Function} type A constructor from the schema.
 * @param {unknown} value A non-null value.
 * @returns {boolean}
 */
function matchesType(type, value) {
  if (TYPEOF_TYPES.has(type)) return typeof value === TYPEOF_TYPES.get(type);
  if (type === Array) return Array.isArray(value);
  if (type === Object) return typeof value === "object" && !Array.isArray(value);
  return value instanceof type;
}

/**
 * Describe a value for a warning, such as `string "3"` or `array`.
 *
 * @param {unknown} value
 * @returns {string}
 */
function describeValue(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "string") return `string "${value}"`;
  return typeof value;
}

/**
 * Serialise a style value to CSS text. Objects use camelCase keys, which become kebab-case declarations.
 *
 * @param {unknown} style A CSS text string or an object of declarations.
 * @returns {string}
 */
function styleText(style) {
  if (style === null || style === undefined || style === false) return "";
  if (typeof style !== "object") return String(style);
  return Object.entries(style)
    .filter(([, value]) => value !== null && value !== undefined && value !== false)
    .map(([name, value]) => `${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}:${value}`)
    .join(";");
}

/**
 * Read a prop value, calling it first when it is an accessor.
 *
 * @param {unknown} value A static value or an accessor.
 * @returns {unknown}
 */
function read(value) {
  return typeof value === "function" ? value() : value;
}

/**
 * Wrap a component so it declares its props and receives undeclared caller attributes.
 *
 * `props` exposes only the declared names, with defaults applied when the caller passes `undefined`. `attrs`
 * exposes every other prop the caller passed, so it can be spread onto the root element with `mergeAttrs`. Both
 * are read-only views over the live props, so reads stay reactive. Factory defaults are called once per instance.
 *
 * Contract violations (a missing required prop, a type mismatch, a failed `validate`) are logged with `console.warn`,
 * once per message for each component. They never throw, so the component still renders.
 *
 * @template {Record<string, object>} S
 * @param {S} schema Options per prop name, such as `{ size: { type: Number, default: 1 }, label: { required: true } }`.
 *   An empty options object declares a prop without checks.
 * @param {(context: { props: object, attrs: object, children?: unknown, slots?: object }) => Node} render The component body.
 * @returns {((context?: object) => Node) & { readonly propSchema: S }} A component that accepts the same context as render.
 * @throws {TypeError} For a malformed schema, such as an unknown option or a non-constructor type.
 */
export function withProps(schema, render) {
  if (typeof render !== "function") throw new TypeError("withProps render must be a function.");
  const declared = checkSchema(schema);
  const keys = Object.keys(declared);
  const label = `<${render.name || "Component"}>`;
  // Warnings are per component, so a bad prop used by many instances logs once.
  const warned = new Set();

  /**
   * Log a caller contract violation once for this component.
   *
   * @param {string} message
   */
  const warn = (message) => {
    if (warned.has(message)) return;
    warned.add(message);
    console.warn(`[nodula] ${label}: ${message}`);
  };

  /**
   * Render the component with its declared props and undeclared attributes.
   *
   * @param {object} [context] The props and slots that the template compiler or a direct call passes.
   * @returns {Node}
   */
  function propsComponent(context) {
    const source = context?.props ?? {};
    // Factory defaults are created once per instance, so arrays and objects are not shared between instances.
    const defaults = new Map();

    /**
     * Return the default for a declared prop, calling its factory once and caching the result.
     *
     * @param {string} key
     * @returns {unknown}
     */
    const defaultFor = (key) => {
      const { default: fallback, type } = declared[key];
      if (fallback === undefined) return undefined;
      if (typeof fallback !== "function" || type === Function) return fallback;
      if (!defaults.has(key)) defaults.set(key, untrack(fallback));
      return defaults.get(key);
    };

    /**
     * Return the caller's value for a declared prop, or its default when the caller passes undefined.
     *
     * @param {string} key
     * @returns {unknown}
     */
    const valueOf = (key) => {
      const value = source[key];
      return value !== undefined ? value : defaultFor(key);
    };

    /**
     * Check whether a key is declared by the schema.
     *
     * @param {PropertyKey} key
     * @returns {boolean}
     */
    const isDeclared = (key) => typeof key === "string" && Object.hasOwn(declared, key);

    /**
     * Throw for writes, because props belong to the parent until it passes a new value.
     *
     * @throws {TypeError} Always.
     */
    const readOnly = () => {
      throw new TypeError("props are read-only");
    };

    const props = new Proxy(
      {},
      {
        get: (_, key) => (isDeclared(key) ? valueOf(key) : undefined),
        has: (_, key) => isDeclared(key),
        ownKeys: () => [...keys],
        getOwnPropertyDescriptor: (_, key) =>
          isDeclared(key)
            ? { value: valueOf(key), writable: false, enumerable: true, configurable: true }
            : undefined,
        set: readOnly,
        deleteProperty: readOnly,
        defineProperty: readOnly,
      },
    );

    const attrs = new Proxy(
      {},
      {
        get: (_, key) => (isDeclared(key) ? undefined : source[key]),
        has: (_, key) => !isDeclared(key) && key in source,
        ownKeys: () => Reflect.ownKeys(source).filter((key) => !isDeclared(key)),
        getOwnPropertyDescriptor: (_, key) =>
          !isDeclared(key) && Object.hasOwn(source, key)
            ? { value: source[key], writable: false, enumerable: true, configurable: true }
            : undefined,
        set: readOnly,
        deleteProperty: readOnly,
        defineProperty: readOnly,
      },
    );

    /**
     * Check one declared prop. It runs again whenever the caller changes that prop.
     *
     * @param {string} key
     */
    const check = (key) => {
      const { type, required, validate } = declared[key];
      // Reading the raw value subscribes this check to the prop; the default is not a caller value.
      if (source[key] === undefined && required) warn(`required prop "${key}" is missing.`);
      const value = valueOf(key);
      // null and undefined are absent, so they skip the type and validate checks.
      if (value === null || value === undefined) return;
      if (type && !matchesType(type, value)) {
        const hint =
          typeof value === "string" && type !== String ? `; use :${key}="${value}"` : "";
        warn(`prop "${key}" expected ${type.name}, got ${describeValue(value)}${hint}.`);
      }
      // A validator that reads signals must not make this check re-run when they change.
      if (validate && !untrack(() => validate(value)))
        warn(`prop "${key}" failed its validate check with ${describeValue(value)}.`);
    };

    if (keys.length) effect(() => keys.forEach(check));

    return render({ ...context, props, attrs });
  }

  Object.defineProperty(propsComponent, "name", { value: render.name });
  propsComponent.propSchema = Object.freeze(declared);
  return propsComponent;
}

/**
 * Merge caller attributes into the props of an element that a component renders, so they land on that element.
 *
 * Own props win for `class` and `style`, which are joined with the caller's value. For event listeners, the own
 * handler runs first and the caller's handler runs after it, read when the event fires. Other attributes take the
 * caller's value unless it is `null` or `undefined`, in which case the own value applies. `ref`, `bind` and `show`
 * from the caller are dropped, because h() gives them meaning only on elements the component owns.
 *
 * Only the attribute names present when `mergeAttrs` is called are applied. Values stay reactive.
 *
 * @param {Record<string, unknown>} attrs The `attrs` object from withProps.
 * @param {Record<string, unknown>} [own] Props the component sets on the element itself.
 * @returns {Record<string, unknown>} Props for h(). When `attrs` has no keys, `own` is returned unchanged.
 */
export function mergeAttrs(attrs, own = {}) {
  // Snapshot the names untracked: a name added later is not applied, so the element does not re-render for it.
  const callerKeys = untrack(() => Object.keys(attrs ?? {}));
  if (!callerKeys.length) return own;

  const callerKeySet = new Set(callerKeys);
  /**
   * Read a caller attribute at the time it is used. Keys outside the snapshot are ignored.
   *
   * @param {string} key
   * @returns {unknown}
   */
  const fromCaller = (key) => (callerKeySet.has(key) ? attrs[key] : undefined);
  const result = { ...own };

  if (callerKeySet.has("class") || callerKeySet.has("className")) {
    delete result.class;
    result.className = () =>
      [read(own.class ?? own.className), fromCaller("class") ?? fromCaller("className")]
        .filter(Boolean)
        .join(" ");
  }

  if (callerKeySet.has("style")) {
    result.style = () =>
      [styleText(read(own.style)), styleText(fromCaller("style"))].filter(Boolean).join(";");
  }

  const ownEventKeys = Object.keys(own).filter(
    (key) => isEventKey(key) && typeof own[key] === "function",
  );
  // Only function-valued `onX` keys are listeners; any other value stays an attribute, as in h().
  const callerEventKeys = callerKeys.filter(
    (key) => isEventKey(key) && untrack(() => typeof attrs[key] === "function"),
  );
  const callerEventKeySet = new Set(callerEventKeys);
  for (const callerKey of callerEventKeys) {
    const name = eventName(callerKey);
    const ownKey = ownEventKeys.find((key) => eventName(key) === name);
    const ownHandler = ownKey ? own[ownKey] : undefined;
    // One listener per event: the own handler and the caller's handler share it, so both run.
    result[ownKey ?? callerKey] = (event) => {
      ownHandler?.(event);
      const handler = fromCaller(callerKey);
      if (typeof handler === "function") handler(event);
    };
  }

  for (const key of callerKeys) {
    if (
      NEVER_FORWARDED.has(key) ||
      key === "class" ||
      key === "className" ||
      key === "style" ||
      callerEventKeySet.has(key)
    )
      continue;
    result[key] = () => fromCaller(key) ?? read(own[key]);
  }
  return result;
}
