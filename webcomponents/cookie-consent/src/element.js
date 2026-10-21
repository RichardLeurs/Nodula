// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* The <nodula-cookie-consent> custom element: a light-DOM wrapper around the consent manager. */
import { createConsentManager, setupGoogleAnalytics } from "./consent-manager.js";

export { setupGoogleAnalytics };

const STRING_ATTRIBUTES = {
  "storage-key": "storageKey",
  version: "version",
  description: "description",
  image: "image",
  "privacy-policy-url": "privacyPolicyUrl",
};
const BOOLEAN_ATTRIBUTES = {
  "show-analytics": "showAnalytics",
  "show-personalization": "showPersonalization",
  "show-marketing": "showMarketing",
  "show-settings-button": "showSettingsButton",
};

/**
 * Parse a JSON attribute value.
 *
 * @param {string} name Attribute name, used in the message.
 * @param {string} text
 * @returns {unknown}
 * @throws {TypeError} For text that is not valid JSON.
 */
function parseJsonAttribute(name, text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new TypeError(`Cookie consent ${name} attribute must be valid JSON.`);
  }
}

/**
 * Create the element class. Called lazily so importing this module never touches the DOM.
 *
 * @returns {CustomElementConstructor}
 */
function createElementClass() {
  return class NodulaCookieConsentElement extends HTMLElement {
    /** @type {ReturnType<typeof createConsentManager> | null} */
    #manager = null;
    #categories;
    #labels;
    #storage;
    #initError = null;

    /** Categories to add; a property, or the `categories` JSON attribute. */
    get categories() {
      return this.#categories;
    }
    /**
     * @param {unknown} value New categories option, read on the next connect.
     */
    set categories(value) {
      this.#categories = value;
    }

    /** Label overrides; a property, or the `labels` JSON attribute. */
    get labels() {
      return this.#labels;
    }
    /**
     * @param {unknown} value New labels option, read on the next connect.
     */
    set labels(value) {
      this.#labels = value;
    }

    /** Optional Storage implementation (`null` keeps the decision in memory); property only. */
    get storage() {
      return this.#storage;
    }
    /**
     * @param {unknown} value New storage option, read on the next connect.
     */
    set storage(value) {
      this.#storage = value;
    }

    /**
     * Build the consent manager inside this element.
     *
     * Options are read when a manager is created. They are re-read only after the element has been
     * out of the document for a microtask (for example `await Promise.resolve()` between remove and
     * append). Removing and appending in the same task keeps the existing manager and its old options.
     *
     * @throws {TypeError} For an invalid attribute or property value.
     */
    connectedCallback() {
      // A moved element keeps its manager: the close in disconnectedCallback is deferred and skipped.
      if (this.#manager) return;
      this.#initError = null;
      // A property set before the element was defined shadows the accessor; hand it back to it.
      for (const name of ["categories", "labels", "storage"]) {
        if (Object.hasOwn(this, name)) {
          const value = this[name];
          delete this[name];
          this[name] = value;
        }
      }
      const options = { appendTo: this, onChange: (record) => this.#emitChange(record) };
      for (const [attribute, option] of Object.entries(STRING_ATTRIBUTES)) {
        if (this.hasAttribute(attribute)) options[option] = this.getAttribute(attribute);
      }
      // A present boolean attribute is true unless it is "false"; absent keeps the default (true).
      for (const [attribute, option] of Object.entries(BOOLEAN_ATTRIBUTES)) {
        if (this.hasAttribute(attribute))
          options[option] = this.getAttribute(attribute) !== "false";
      }
      try {
        for (const name of ["categories", "labels"]) {
          if (this[name] !== undefined) options[name] = this[name];
          else if (this.hasAttribute(name))
            options[name] = parseJsonAttribute(name, this.getAttribute(name));
        }
        if (this.#storage !== undefined) options.storage = this.#storage;
        this.#manager = createConsentManager(options);
      } catch (error) {
        this.#initError = error;
        throw error;
      }
    }

    /**
     * Close the manager once the element has really left the document.
     *
     * The close is deferred a microtask so that moving the element (remove then append, as routers
     * and list re-renders do) keeps the banner and every subscription.
     */
    disconnectedCallback() {
      queueMicrotask(() => {
        if (this.isConnected) return;
        this.#manager?.close();
        this.#manager = null;
      });
    }

    /**
     * Return the manager, or throw when the element is not connected.
     *
     * @returns {ReturnType<typeof createConsentManager>}
     * @throws {Error} Before connecting and after disconnecting.
     */
    #use() {
      if (!this.#manager) {
        throw new Error(
          this.#initError
            ? `Cookie consent element failed to initialise: ${this.#initError.message}`
            : "Cookie consent element is not connected.",
        );
      }
      return this.#manager;
    }

    /**
     * Dispatch `consent-change` with the consent record (or null after a revoke).
     *
     * @param {object | null} record
     */
    #emitChange(record) {
      this.dispatchEvent(
        new CustomEvent("consent-change", { detail: record, bubbles: true, composed: true }),
      );
    }

    /** Open the preferences view. */
    openSettings() {
      this.#manager?.openSettings();
    }
    /** @returns {object | null} The stored consent record. */
    getConsent() {
      return this.#use().getConsent();
    }
    /**
     * @param {string} id
     * @returns {boolean} Whether the category is allowed.
     */
    hasConsent(id) {
      return this.#use().hasConsent(id);
    }
    /**
     * @param {Record<string, boolean>} [choices]
     * @returns {object | null}
     */
    setConsent(choices) {
      return this.#use().setConsent(choices);
    }
    /** @returns {object | null} */
    acceptAll() {
      return this.#use().acceptAll();
    }
    /** @returns {object | null} */
    rejectNonEssential() {
      return this.#use().rejectNonEssential();
    }
    /** Clear the stored decision and ask again. */
    revokeConsent() {
      this.#use().revokeConsent();
    }
    /**
     * @param {{ id: string, label: string, description: string }} category
     * @returns {() => void} Removes the category.
     */
    registerCategory(category) {
      return this.#use().registerCategory(category);
    }
    /**
     * @param {string} id
     * @param {(allowed: boolean, consent: object | null) => void} callback
     * @returns {() => void} Unsubscribes.
     */
    on(id, callback) {
      return this.#use().on(id, callback);
    }
  };
}

// One class per tag name: a browser refuses to register the same constructor twice.
const elementClasses = new Map();

/**
 * Register the cookie-consent custom element.
 *
 * Safe to call more than once for the same tag name. Returns the same class each time.
 *
 * @param {string} [tagName] Custom element name, default `nodula-cookie-consent`.
 * @returns {CustomElementConstructor} The element class.
 * @throws {Error} When the tag name is already registered by another class.
 */
export function defineCookieConsentElement(tagName = "nodula-cookie-consent") {
  const existing = customElements.get(tagName);
  if (existing) {
    if (existing !== elementClasses.get(tagName))
      throw new Error(
        `Cookie consent: <${tagName}> is already registered by another element class.`,
      );
    return existing;
  }
  const elementClass = createElementClass();
  elementClasses.set(tagName, elementClass);
  customElements.define(tagName, elementClass);
  return elementClass;
}
