// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Register Nodula components as native custom elements, and load global stylesheets once. */
import { component, createRoot, fragment, onCleanup, signal } from "nodula-framework";

const PROP_TYPES = [String, Number, Boolean, Object, Array];
const PROP_OPTION_KEYS = new Set(["type", "reflect", "attribute"]);
const PROP_NAME = /^[a-zA-Z][\w-]*$/;
const ATTRIBUTE_NAME = /^[a-z][\w.-]*$/;
const PROPS_SHAPE_MESSAGE =
  "Custom element props must be an array of valid property names or an object of prop options.";
// Host members that a form-associated element exposes from its ElementInternals.
const FORM_HOST_PROPERTIES = ["form", "labels", "validity", "validationMessage", "willValidate"];
const FORM_HOST_METHODS = ["checkValidity", "reportValidity"];

/**
 * Convert a kebab-case attribute or prop name to camelCase.
 *
 * The core keeps its own copy for `h()`. The add-on cannot import it, so the two stay in step by convention.
 *
 * @param {string} name
 * @returns {string}
 */
function customElementPropertyName(name) {
  return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert a camelCase prop name to its kebab-case attribute name.
 *
 * @param {string} name
 * @returns {string}
 */
function customElementAttributeName(name) {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Convert a custom event name such as `item-selected` to its `on…` prop name, such as `onItemSelected`.
 *
 * @param {string} name
 * @returns {string}
 */
function customElementEventProp(name) {
  return `on${name[0].toUpperCase()}${name.slice(1).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}`;
}

/**
 * Check for a plain options object, excluding arrays and null.
 *
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isOptionsObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Check whether a value is an object or function, which attributes cannot hold as text.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isObjectLike(value) {
  return value !== null && (typeof value === "object" || typeof value === "function");
}

/**
 * Read one object-form prop declaration, such as `Number` or `{ type: Number, reflect: true }`.
 *
 * @param {string} prop Camel-case prop name.
 * @param {unknown} spec A prop type or an options object.
 * @returns {{ prop: string, attribute: string | false, type: Function | undefined, reflect: boolean, legacy: false }}
 * @throws {TypeError} For an unknown option, type, reflect value or attribute name.
 */
function parsePropOption(prop, spec) {
  const isType = PROP_TYPES.includes(spec);
  if (!isType && !isOptionsObject(spec)) {
    throw new TypeError(
      `Custom element prop "${prop}" must be String, Number, Boolean, Object, Array or an options object.`,
    );
  }
  const options = isType ? { type: spec } : spec;
  for (const option of Object.keys(options)) {
    if (!PROP_OPTION_KEYS.has(option)) {
      throw new TypeError(`Custom element prop "${prop}" has unknown option "${option}".`);
    }
  }

  const { type, reflect = false, attribute } = options;
  if (type !== undefined && !PROP_TYPES.includes(type)) {
    throw new TypeError(
      `Custom element prop "${prop}" type must be String, Number, Boolean, Object, or Array.`,
    );
  }
  if (typeof reflect !== "boolean") {
    throw new TypeError(`Custom element prop "${prop}" reflect must be a boolean.`);
  }
  if (
    attribute !== undefined &&
    attribute !== false &&
    (typeof attribute !== "string" || !ATTRIBUTE_NAME.test(attribute))
  ) {
    throw new TypeError(
      `Custom element prop "${prop}" attribute must be a lowercase attribute name or false.`,
    );
  }

  const resolvedAttribute = attribute === undefined ? customElementAttributeName(prop) : attribute;
  if (reflect && (type === Object || type === Array)) {
    throw new TypeError(`Custom element prop "${prop}" cannot reflect an Object or Array value.`);
  }
  if (reflect && resolvedAttribute === false) {
    throw new TypeError(`Custom element prop "${prop}" cannot reflect without an attribute.`);
  }
  return { prop, attribute: resolvedAttribute, type, reflect, legacy: false };
}

/**
 * Normalise the `props` option into one entry per camel-case prop.
 *
 * The array form keeps its original behaviour: each name reflects implicitly and values are not converted.
 * The object form declares a type, an attribute name and whether to reflect.
 *
 * @param {unknown} props An array of prop names or an object of prop declarations.
 * @param {boolean} formAssociated Whether the element is form-associated, which reserves some prop names.
 * @returns {Map<string, { prop: string, attribute: string | false, type: Function | undefined, reflect: boolean, legacy: boolean }>}
 * @throws {TypeError} For an invalid shape, name, option or attribute collision.
 */
function normalizeProps(props, formAssociated) {
  const legacy = Array.isArray(props);
  if (!legacy && !isOptionsObject(props)) throw new TypeError(PROPS_SHAPE_MESSAGE);

  const declared = legacy ? props.map((name) => [name, undefined]) : Object.entries(props);
  const entries = new Map();
  for (const [name, spec] of declared) {
    if (typeof name !== "string" || !PROP_NAME.test(name)) throw new TypeError(PROPS_SHAPE_MESSAGE);
    const prop = customElementPropertyName(name);
    // Names that differ only by kebab or camel case declare the same prop, so the first one wins.
    if (entries.has(prop)) continue;

    const entry = legacy
      ? {
          prop,
          attribute: customElementAttributeName(prop),
          type: undefined,
          reflect: true,
          legacy: true,
        }
      : { ...parsePropOption(prop, spec), legacy: false };
    if (
      formAssociated &&
      (prop === "formControl" ||
        FORM_HOST_PROPERTIES.includes(prop) ||
        FORM_HOST_METHODS.includes(prop))
    ) {
      throw new TypeError(
        `Custom element prop "${prop}" is reserved for form-associated elements.`,
      );
    }
    if (entry.attribute !== false) {
      const owner = [...entries.values()].find((other) => other.attribute === entry.attribute);
      if (owner) {
        throw new TypeError(
          `Custom element props "${owner.prop}" and "${prop}" use the same attribute "${entry.attribute}".`,
        );
      }
    }
    entries.set(prop, entry);
  }
  return entries;
}

/**
 * Convert an attribute value to the value its prop holds. Property sets are never converted.
 *
 * @param {{ attribute: string | false, type: Function | undefined, legacy: boolean }} entry
 * @param {string | null} value The attribute value, or null when the attribute is absent or removed.
 * @param {Element} element Names the element in a warning.
 * @returns {unknown}
 */
function convertAttribute(entry, value, element) {
  if (entry.legacy) return value;
  // A Boolean prop is present whenever the attribute is, whatever its value, so "false" is true, as in HTML.
  if (entry.type === Boolean) return value !== null;
  if (value === null) return undefined;
  if (entry.type === Number) return value.trim() === "" ? NaN : Number(value);
  if (entry.type === Object || entry.type === Array) {
    try {
      return JSON.parse(value);
    } catch {
      console.warn(
        `[nodula] ${element.localName}: attribute "${entry.attribute}" is not valid JSON.`,
      );
      return undefined;
    }
  }
  return value;
}

/**
 * Work out the attribute value a property set should reflect.
 *
 * @param {{ type: Function | undefined, legacy: boolean }} entry
 * @param {unknown} value The value that was set as a property.
 * @returns {string | null | undefined} The attribute value, null to remove the attribute, or undefined to leave it alone.
 */
function reflectedAttribute(entry, value) {
  if (entry.legacy) {
    if (value === undefined || isObjectLike(value)) return undefined;
    if (value === null || value === false) return null;
    return value === true ? "" : String(value);
  }
  if (entry.type === Boolean) return value ? "" : null;
  if (value === undefined || value === null) return null;
  return isObjectLike(value) ? undefined : String(value);
}

/**
 * Register a Nodula component as a native custom element.
 *
 * @param {string} name A custom element name containing a hyphen, such as `date-range-picker`.
 * @param {(context: { props: Record<string, unknown>, children?: unknown, slots?: object }) => Node} render Renders the component.
 * @param {{ props?: string[] | Record<string, Function | object>, events?: string[], shadow?: "open" | "closed" | false, formAssociated?: boolean }} [options] Props, events, shadow mode and form association.
 * @returns {CustomElementConstructor} The registered element class.
 * @throws {TypeError} For an invalid name, render function, prop, event, shadow or formAssociated option.
 * @throws {Error} If the name is already registered or custom elements are unavailable.
 */
export function defineCustomElement(
  name,
  render,
  { props = [], events = [], shadow = "open", formAssociated = false } = {},
) {
  if (typeof name !== "string" || !/^[a-z][.0-9_a-z-]*-[.0-9_a-z-]*$/.test(name)) {
    throw new TypeError(
      "defineCustomElement expects a valid custom element name containing a hyphen.",
    );
  }
  if (typeof render !== "function")
    throw new TypeError("defineCustomElement expects a component render function.");
  if (typeof formAssociated !== "boolean")
    throw new TypeError("Custom element formAssociated must be a boolean.");
  const propEntries = normalizeProps(props, formAssociated);
  if (
    !Array.isArray(events) ||
    events.some((event) => typeof event !== "string" || !/^[a-z][\w-]*$/.test(event))
  ) {
    throw new TypeError("Custom element events must be an array of valid event names.");
  }
  if (shadow !== false && shadow !== "open" && shadow !== "closed") {
    throw new TypeError("Custom element shadow must be false, open, or closed.");
  }

  const registry = document.defaultView?.customElements ?? globalThis.customElements;
  const ElementBase = document.defaultView?.HTMLElement ?? globalThis.HTMLElement;
  const CustomEventBase = document.defaultView?.CustomEvent ?? globalThis.CustomEvent;
  if (!registry || !ElementBase)
    throw new Error("Custom elements are unavailable in this environment.");
  if (formAssociated && typeof ElementBase.prototype.attachInternals !== "function")
    throw new Error("Form-associated custom elements are unavailable in this environment.");
  if (registry.get(name)) throw new Error(`Custom element is already registered: ${name}`);

  // Attribute-backed props, keyed by attribute name, are the ones the element observes.
  const attributeEntries = new Map(
    [...propEntries.values()]
      .filter((entry) => entry.attribute !== false)
      .map((entry) => [entry.attribute, entry]),
  );
  const observedAttributes = [...attributeEntries.keys()];
  const eventNames = [...new Set(events)];

  /**
   * Custom element class generated by `defineCustomElement`.
   *
   * It mounts the component on connect, disposes it on disconnect, and keeps its props in sync with attributes and properties.
   */
  class NodulaCustomElement extends ElementBase {
    static formAssociated = formAssociated;

    static get observedAttributes() {
      return observedAttributes;
    }

    /**
     * Create the element with its private state. The root is mounted when the element connects.
     */
    constructor() {
      super();
      this._nodulaValues = new Map();
      this._nodulaExplicitProperties = new Set();
      // The props are a signal over a plain object. Each write replaces the object, and the mounted
      // component copies the keys that changed, so only readers of those props update.
      const [readProps, writeProps] = signal({});
      this._nodulaReadProps = readProps;
      this._nodulaWriteProps = writeProps;
      this._nodulaMountPoint = shadow === false ? this : this.attachShadow({ mode: shadow });

      if (formAssociated) {
        const internals = this.attachInternals();
        const [disabled, setDisabled] = signal(false);
        const form = {
          setDisabled,
          resetHandlers: new Set(),
          restoreHandlers: new Set(),
          pendingRestore: null,
        };
        this._nodulaInternals = internals;
        this._nodulaForm = form;
        writeProps((props) => ({
          ...props,
          formControl: {
            internals,
            disabled,
            /**
             * Run `handler` when the owning form resets. It is removed when the render scope is disposed.
             *
             * @param {() => void} handler
             */
            onReset(handler) {
              onCleanup(() => form.resetHandlers.delete(handler));
              form.resetHandlers.add(handler);
            },
            /**
             * Run `handler` with the restored state. A restore that arrived before any handler existed runs once for the first handler.
             *
             * @param {(state: unknown, mode: string) => void} handler
             */
            onRestore(handler) {
              onCleanup(() => form.restoreHandlers.delete(handler));
              form.restoreHandlers.add(handler);
              if (form.pendingRestore) {
                const [state, mode] = form.pendingRestore;
                form.pendingRestore = null;
                handler(state, mode);
              }
            },
          },
        }));
      }

      for (const prop of propEntries.keys()) {
        if (Object.hasOwn(this, prop)) {
          const value = this[prop];
          delete this[prop];
          this[prop] = value;
        }
      }
    }

    /**
     * Apply a changed observed attribute to its prop, unless the prop was set as a property.
     *
     * @param {string} attribute
     * @param {string | null} _previous
     * @param {string | null} value
     */
    attributeChangedCallback(attribute, _previous, value) {
      const entry = attributeEntries.get(attribute);
      if (!entry || this._nodulaExplicitProperties.has(entry.prop)) return;
      this._setNodulaProperty(entry.prop, convertAttribute(entry, value, this), false);
    }

    /**
     * Mount the component into the element when it connects, applying attributes that were set before upgrade.
     */
    connectedCallback() {
      for (const [attribute, entry] of attributeEntries) {
        if (this._nodulaExplicitProperties.has(entry.prop)) continue;
        // An absent Boolean is false, so it is set even without the attribute.
        if (this.hasAttribute(attribute) || entry.type === Boolean) {
          this._setNodulaProperty(
            entry.prop,
            convertAttribute(entry, this.getAttribute(attribute), this),
            false,
          );
        }
      }

      for (const eventName of eventNames) {
        this._nodulaWriteProps((props) => ({
          ...props,
          [customElementEventProp(eventName)]: (detail) => {
            this.dispatchEvent(
              new CustomEventBase(eventName, {
                detail,
                bubbles: true,
                composed: true,
              }),
            );
          },
        }));
      }

      const [, dispose] = createRoot(() =>
        this._nodulaMountPoint.append(fragment(component(render, this._nodulaReadProps))),
      );
      this._nodulaDispose = dispose;
    }

    /**
     * Dispose the mounted component and clear the mount point when the element leaves the document.
     */
    disconnectedCallback() {
      this._nodulaDispose?.();
      this._nodulaDispose = null;
      this._nodulaMountPoint.replaceChildren();
    }

    /**
     * Called by the browser when the element becomes disabled or enabled, including through a disabled fieldset.
     *
     * @param {boolean} disabled
     */
    formDisabledCallback(disabled) {
      this._nodulaForm.setDisabled(disabled);
    }

    /**
     * Called by the browser when the owning form resets. Runs the handlers registered with `formControl.onReset`.
     */
    formResetCallback() {
      for (const handler of this._nodulaForm.resetHandlers) handler();
    }

    /**
     * Called by the browser when form state is restored. Passes it to the handlers, or keeps the latest one until a handler exists.
     *
     * @param {File | string | FormData | null} state
     * @param {"restore" | "autocomplete"} mode
     */
    formStateRestoreCallback(state, mode) {
      const form = this._nodulaForm;
      if (form.restoreHandlers.size === 0) {
        form.pendingRestore = [state, mode];
        return;
      }
      for (const handler of form.restoreHandlers) handler(state, mode);
    }

    /**
     * Store a prop value and update the mounted component. A property set reflects to its attribute when the prop reflects.
     *
     * @param {string} prop Camel-case prop name.
     * @param {unknown} value
     * @param {boolean} explicit True when set as a property rather than from an attribute.
     */
    _setNodulaProperty(prop, value, explicit) {
      if (explicit) this._nodulaExplicitProperties.add(prop);
      this._nodulaValues.set(prop, value);
      this._nodulaWriteProps((props) => ({ ...props, [prop]: value }));

      const entry = propEntries.get(prop);
      if (!explicit || !entry?.reflect) return;
      const attributeValue = reflectedAttribute(entry, value);
      if (attributeValue === null) {
        if (this.hasAttribute(entry.attribute)) this.removeAttribute(entry.attribute);
      } else if (
        attributeValue !== undefined &&
        this.getAttribute(entry.attribute) !== attributeValue
      ) {
        this.setAttribute(entry.attribute, attributeValue);
      }
    }
  }

  for (const prop of propEntries.keys()) {
    Object.defineProperty(NodulaCustomElement.prototype, prop, {
      configurable: true,
      enumerable: true,
      /**
       * Return the current value of this prop.
       */
      get() {
        return this._nodulaValues.get(prop);
      },
      /**
       * Set this prop as a property, which takes precedence over attributes.
       *
       * @param {unknown} value
       */
      set(value) {
        this._setNodulaProperty(prop, value, true);
      },
    });
  }

  if (formAssociated) {
    for (const member of FORM_HOST_PROPERTIES) {
      Object.defineProperty(NodulaCustomElement.prototype, member, {
        configurable: true,
        enumerable: true,
        /**
         * Read the same member from the element's ElementInternals.
         */
        get() {
          return this._nodulaInternals[member];
        },
      });
    }
    for (const method of FORM_HOST_METHODS) {
      Object.defineProperty(NodulaCustomElement.prototype, method, {
        configurable: true,
        writable: true,
        /**
         * Call the same method on the element's ElementInternals.
         */
        value() {
          return this._nodulaInternals[method]();
        },
      });
    }
  }

  registry.define(name, NodulaCustomElement);
  return NodulaCustomElement;
}

/** Load a global stylesheet once and return its link element. */
export const Nodula = /* @__PURE__ */ Object.freeze({
  defineCustomElement,
  /**
   * Load a global stylesheet once and return its link element.
   *
   * @param {string} href Stylesheet URL, resolved against the document base URI.
   * @returns {HTMLLinkElement} The existing or newly appended `<link rel="stylesheet">`.
   */
  css(href) {
    const absoluteHref = new URL(href, document.baseURI).href;
    const existing = [...document.querySelectorAll('link[rel="stylesheet"]')].find(
      (link) => link.href === absoluteHref,
    );
    if (existing) return existing;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = absoluteHref;
    document.head.append(link);
    return link;
  },
});
