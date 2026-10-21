// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Provide versioned cookie-consent UI, preferences, and gated integrations. */
import { createRoot, onCleanup } from "nodula-framework";
import { createLocalStorage, deleteCookie } from "nodula-framework/localstorage";
import { injectAddonStyles } from "./utils/inject-styles.js";
import cookieConsentStyles from "../assets/css/nodula-cookieconsent.css?inline";

let nextCookieConsentId = 0;

const defaultCategories = [
  {
    id: "analytics",
    label: "Analytics",
    description: "Helps us understand how visitors use this website.",
  },
  {
    id: "personalization",
    label: "Personalisation",
    description: "Remembers preferences and adapts content.",
  },
  {
    id: "marketing",
    label: "Marketing",
    description: "Measures advertising and supports relevant campaigns.",
  },
];

/**
 * Throw a TypeError unless `id` is a lowercase identifier that is not reserved.
 *
 * @param {unknown} id
 * @throws {TypeError}
 */
function validateCategoryId(id) {
  if (
    typeof id !== "string" ||
    !/^[a-z][a-z0-9_-]*$/.test(id) ||
    ["necessary", "__proto__", "prototype", "constructor"].includes(id)
  ) {
    throw new TypeError(
      'Cookie consent category ids must be lowercase identifiers; "necessary" is reserved.',
    );
  }
}

/**
 * Check a custom category and return a copy with only its id, label and description.
 *
 * @param {object} category
 * @returns {{ id: string, label: string, description: string }}
 * @throws {TypeError} For a malformed category.
 */
function validateCategory(category) {
  if (!category || typeof category !== "object" || Array.isArray(category)) {
    throw new TypeError("registerCategory expects an id and category options.");
  }
  validateCategoryId(category.id);
  if (
    typeof category.label !== "string" ||
    !category.label.trim() ||
    typeof category.description !== "string" ||
    !category.description.trim()
  ) {
    throw new TypeError("Cookie consent category label and description must be non-empty strings.");
  }
  return { id: category.id, label: category.label, description: category.description };
}

/**
 * Read a stored consent record and return it normalized to the current categories, or null when it is invalid or from another version.
 *
 * A category that is no longer visible is treated as denied.
 *
 * @param {unknown} value Parsed stored value.
 * @param {string} version Current consent version.
 * @param {Map<string, object>} categories
 * @param {Set<string>} visibleCategories
 * @returns {object | null}
 */
function validateConsent(value, version, categories, visibleCategories) {
  if (
    !value ||
    typeof value !== "object" ||
    value.version !== version ||
    typeof value.timestamp !== "string" ||
    !value.choices ||
    typeof value.choices !== "object"
  )
    return null;
  const choices = {};
  for (const id of categories.keys())
    choices[id] = visibleCategories.has(id) && value.choices[id] === true;
  return { version, necessary: true, choices, timestamp: value.timestamp };
}

/**
 * Create a `type="button"` element with a label and a click handler.
 *
 * @param {string} label
 * @param {string} className
 * @param {() => void} onClick
 * @returns {HTMLButtonElement}
 */
function createButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

/**
 * Call one consent listener. A listener that throws is logged and does not affect the others.
 *
 * @param {(allowed: boolean, consent: object | null) => void} callback
 * @param {boolean} allowed
 * @param {object | null} currentConsent
 */
function notifyListener(callback, allowed, currentConsent) {
  try {
    callback(allowed, currentConsent);
  } catch (error) {
    console.error("Cookie consent listener failed:", error);
  }
}

/** Load Google Analytics only while the consent manager grants analytics permission. */
export function setupGoogleAnalytics(consent, measurementId) {
  if (!consent || typeof consent.on !== "function") {
    throw new TypeError("setupGoogleAnalytics expects a cookie consent manager.");
  }
  if (typeof measurementId !== "string" || !/^G-[A-Z0-9]+$/.test(measurementId)) {
    throw new TypeError("setupGoogleAnalytics expects a valid Google Analytics measurement ID.");
  }

  let googleTagLoaded = false;

  // Queue consent as denied before any Google tag can run. Under Consent Mode, window.gtag
  // stays defined after revocation so app calls keep working; the denied state is honoured.
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    /**
     * Queue a Google tag command on `window.dataLayer`, as gtag.js does before it loads.
     */
    function gtag() {
      window.dataLayer.push(arguments);
    };

  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  return consent.on("analytics", (allowed) => {
    window.gtag("consent", "update", {
      analytics_storage: allowed ? "granted" : "denied",
    });

    if (!allowed) {
      deleteGoogleAnalyticsCookies();
      return;
    }
    // gtag.js keeps running once loaded (removing its <script> does not unload it),
    // so load it once; later grants only update consent.
    if (googleTagLoaded) return;

    googleTagLoaded = true;
    // Queued after the grant, so the first page view is sent with consent already granted.
    window.gtag("js", new Date());
    window.gtag("config", measurementId);
    const googleTagScript = document.createElement("script");
    googleTagScript.async = true;
    googleTagScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.append(googleTagScript);
  });
}

/** Expire Google Analytics cookies (_ga, _ga_*, _gid, _gat*) for this host and its parent domains. */
function deleteGoogleAnalyticsCookies() {
  const names = document.cookie
    .split(/;\s*/)
    .map((entry) => entry.split("=")[0])
    .filter((name) => /^(_ga|_gid|_gat)(_|$)/.test(name));
  if (!names.length) return;
  // GA usually sets cookies on the highest possible domain, so try every parent domain too.
  const labels = location.hostname.split(".");
  const domains = [undefined, ...labels.slice(0, -1).map((_, index) => labels.slice(index).join("."))];
  for (const name of names) {
    for (const domain of domains) deleteCookie(name, domain ? { path: "/", domain } : { path: "/" });
  }
}

/** Create a consent manager with a floating notice, preference UI, and localStorage-backed decisions. */
export function createCookieConsent(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("createCookieConsent expects an options object.");
  }
  const {
    version = "1.0",
    storageKey = "nodula-cookie-consent",
    storage,
    // file:// and about:blank pages have an empty hostname, which would fail the check below.
    siteName = (typeof location === "undefined" ? "" : location.hostname) || "This website",
    description = "We use cookies and similar technologies. Necessary storage keeps the website working; optional categories need your permission.",
    image,
    privacyPolicyUrl,
    categories: customCategories = [],
    labels = {},
    showAnalytics = true,
    showPersonalization = true,
    showMarketing = true,
    showSettingsButton = true,
  } = options;
  if (typeof version !== "string" || !version.trim())
    throw new TypeError("Cookie consent version must be a non-empty string.");
  if (typeof storageKey !== "string" || !storageKey.trim())
    throw new TypeError("Cookie consent storageKey must be a non-empty string.");
  if (
    typeof siteName !== "string" ||
    !siteName.trim() ||
    typeof description !== "string" ||
    !description.trim()
  ) {
    throw new TypeError("Cookie consent siteName and description must be non-empty strings.");
  }
  if (image !== undefined && (typeof image !== "string" || !image.trim())) {
    throw new TypeError("Cookie consent image must be a non-empty URL string.");
  }
  if (privacyPolicyUrl !== undefined && typeof privacyPolicyUrl !== "string") {
    throw new TypeError("Cookie consent privacyPolicyUrl must be a string.");
  }
  if (!Array.isArray(customCategories))
    throw new TypeError("Cookie consent categories must be an array.");
  for (const [name, value] of Object.entries({
    showAnalytics,
    showPersonalization,
    showMarketing,
    showSettingsButton,
  })) {
    if (typeof value !== "boolean")
      throw new TypeError(`Cookie consent ${name} must be a boolean.`);
  }
  if (labels !== undefined && (!labels || typeof labels !== "object" || Array.isArray(labels))) {
    throw new TypeError("Cookie consent labels must be an object.");
  }
  if (Object.values(labels).some((label) => typeof label !== "string" || !label.trim())) {
    throw new TypeError("Cookie consent label overrides must be non-empty strings.");
  }
  if (typeof document === "undefined" || !document.body)
    throw new Error("createCookieConsent requires a browser document.");
  if (
    privacyPolicyUrl &&
    !["http:", "https:"].includes(new URL(privacyPolicyUrl, document.baseURI).protocol)
  ) {
    throw new TypeError("Cookie consent privacyPolicyUrl must use HTTP or HTTPS.");
  }
  if (image && !["http:", "https:"].includes(new URL(image, document.baseURI).protocol)) {
    throw new TypeError("Cookie consent image must use HTTP or HTTPS.");
  }

  const categoryMap = new Map(defaultCategories.map((category) => [category.id, { ...category }]));
  const configuredCategoryIds = new Set();
  for (const category of customCategories) {
    const validated = validateCategory(category);
    if (configuredCategoryIds.has(validated.id))
      throw new Error(`Cookie consent category already registered: ${validated.id}`);
    configuredCategoryIds.add(validated.id);
    categoryMap.set(validated.id, validated);
  }
  for (const category of defaultCategories) {
    const configured = categoryMap.get(category.id);
    categoryMap.set(category.id, {
      ...configured,
      label: labels[category.id] ?? configured.label,
      description: labels[`${category.id}Description`] ?? configured.description,
    });
  }
  const visibleCategories = new Set([
    ...(showAnalytics ? ["analytics"] : []),
    ...(showPersonalization ? ["personalization"] : []),
    ...(showMarketing ? ["marketing"] : []),
    ...customCategories
      .map((category) => category.id)
      .filter((id) => !defaultCategories.some((category) => category.id === id)),
  ]);

  const [[readStoredConsent, writeStoredConsent], disposeStorage] = createRoot(() =>
    createLocalStorage(storageKey, null, storage === undefined ? {} : { storage }),
  );
  /**
   * The current consent record, or null when there is no valid decision.
   */
  const consent = () =>
    validateConsent(readStoredConsent(), version, categoryMap, visibleCategories);
  const listeners = new Map();
  let choicesChanged = false;
  let render;
  let visiblePanel = null;
  let closed = false;
  // Each view nominates the element that receives focus after a re-render replaces the old one.
  let focusTarget = null;
  const idPrefix = `ui-cookie-consent-${nextCookieConsentId++}`;

  injectAddonStyles("cookieconsent", cookieConsentStyles);
  const element = document.createElement("section");
  element.className = "ui-cookie-consent";
  element.setAttribute("aria-label", labels.consent ?? "Cookie consent");
  document.body.append(element);

  /**
   * Save a decision. Categories that are missing or not visible are denied.
   *
   * @param {Record<string, boolean>} [choices]
   * @returns {object | null} The stored consent record.
   * @throws {TypeError} For a malformed choices object or a non-boolean choice.
   * @throws {Error} For an unknown category, or after `close()`.
   */
  function setConsent(choices = {}) {
    if (closed) throw new Error("Cookie consent manager is closed.");
    if (!choices || typeof choices !== "object" || Array.isArray(choices)) {
      throw new TypeError("setConsent expects an object of category choices.");
    }
    for (const [id, value] of Object.entries(choices)) {
      if (!categoryMap.has(id)) throw new Error(`Unknown cookie consent category: ${id}`);
      if (typeof value !== "boolean")
        throw new TypeError(`Cookie consent choice for "${id}" must be a boolean.`);
    }
    const normalizedChoices = {};
    for (const id of categoryMap.keys())
      normalizedChoices[id] = visibleCategories.has(id) && choices[id] === true;
    choicesChanged = true;
    writeStoredConsent({
      version,
      necessary: true,
      choices: normalizedChoices,
      timestamp: new Date().toISOString(),
    });
    if (render) {
      visiblePanel = null;
      render();
    }
    return consent();
  }

  /**
   * Accept every visible category.
   */
  function acceptAll() {
    return setConsent(Object.fromEntries([...visibleCategories].map((id) => [id, true])));
  }

  /**
   * Reject every optional category.
   */
  function rejectNonEssential() {
    return setConsent({});
  }

  /**
   * Remove the stored decision and show the banner again.
   */
  function revokeConsent() {
    if (closed) throw new Error("Cookie consent manager is closed.");
    writeStoredConsent(null);
    choicesChanged = true;
    if (render) {
      visiblePanel = null;
      render();
    }
  }

  /**
   * Whether a category is currently allowed. `necessary` is always allowed.
   *
   * @param {string} id
   * @returns {boolean}
   */
  function hasConsent(id) {
    if (id === "necessary") return true;
    if (!categoryMap.has(id)) return false;
    return consent()?.choices[id] === true;
  }

  /**
   * Subscribe to changes in a category’s permission.
   *
   * The callback runs at once with the current value, and again each time it changes. The subscription ends with the owner.
   *
   * @param {string} id Category id, or `"necessary"`.
   * @param {(allowed: boolean, consent: object | null) => void} callback
   * @returns {() => void} Unsubscribes.
   * @throws {Error} For an unknown category, or after `close()`.
   */
  function on(id, callback) {
    if (closed) throw new Error("Cookie consent manager is closed.");
    if (id !== "necessary" && !categoryMap.has(id))
      throw new Error(`Unknown cookie consent category: ${id}`);
    if (typeof callback !== "function")
      throw new TypeError("Cookie consent listener must be a function.");
    let callbacks = listeners.get(id);
    if (!callbacks) listeners.set(id, (callbacks = new Map()));
    const listener = { unsubscribe: null, previous: hasConsent(id) };
    notifyListener(callback, listener.previous, consent());
    /**
     * Remove this callback from its category.
     */
    const unsubscribe = () => {
      callbacks.delete(callback);
      if (!callbacks.size) listeners.delete(id);
    };
    listener.unsubscribe = unsubscribe;
    callbacks.set(callback, listener);
    try {
      onCleanup(unsubscribe);
    } catch {
      /* Cookie consent listeners can be managed manually outside a Nodula owner. */
    }
    return unsubscribe;
  }

  /**
   * Add a custom category to the preferences. The existing decision is cleared, so the banner asks again.
   *
   * @param {{ id: string, label: string, description: string }} category
   * @returns {() => void} Removes the category. It runs once; later calls and calls after `close()` do nothing.
   * @throws {Error} If the id is already registered, or after `close()`.
   */
  function registerCategory(category) {
    if (closed) throw new Error("Cookie consent manager is closed.");
    const validated = validateCategory(category);
    if (categoryMap.has(validated.id))
      throw new Error(`Cookie consent category already registered: ${validated.id}`);
    const hasExistingDecision = Boolean(consent());
    categoryMap.set(validated.id, validated);
    visibleCategories.add(validated.id);
    if (hasExistingDecision) {
      writeStoredConsent(null);
      choicesChanged = true;
    }
    render();
    let registered = true;
    return () => {
      if (!registered || closed) return;
      registered = false;
      const hasDecision = Boolean(consent());
      categoryMap.delete(validated.id);
      visibleCategories.delete(validated.id);
      if (hasDecision) {
        writeStoredConsent(null);
        choicesChanged = true;
      }
      notifyListeners();
      render();
    };
  }

  /**
   * Tell each subscriber whose permission has changed since it was last notified.
   */
  function notifyListeners() {
    if (!choicesChanged) return;
    choicesChanged = false;
    const current = consent();
    for (const [id, callbacks] of listeners) {
      const allowed = id === "necessary" || current?.choices[id] === true;
      for (const [callback, listener] of callbacks) {
        if (listener.previous === allowed) continue;
        listener.previous = allowed;
        notifyListener(callback, allowed, current);
      }
    }
  }

  /**
   * Render the preferences view with a checkbox for each visible category.
   *
   * Focus is moved to the heading.
   *
   * @returns {HTMLElement}
   */
  function renderPreferences() {
    const panel = document.createElement("div");
    panel.className = "ui-cookie-consent__preferences";
    panel.id = `${idPrefix}-preferences`;
    panel.setAttribute("aria-labelledby", `${idPrefix}-preferences-title`);
    const heading = document.createElement("h3");
    heading.className = "ui-cookie-consent__title";
    heading.id = `${idPrefix}-preferences-title`;
    heading.tabIndex = -1;
    heading.textContent = labels.preferences ?? "Cookie preferences";
    panel.append(heading);
    focusTarget = heading;

    const necessary = document.createElement("div");
    necessary.className = "ui-cookie-consent__category";
    const necessaryCopy = document.createElement("div");
    const necessaryLabel = document.createElement("strong");
    necessaryLabel.textContent = labels.necessary ?? "Necessary";
    const necessaryDescription = document.createElement("span");
    necessaryDescription.className = "ui-cookie-consent__category-description";
    necessaryDescription.textContent =
      labels.necessaryDescription ?? "Required for this website to function. Always active.";
    const required = document.createElement("input");
    required.type = "checkbox";
    required.checked = true;
    required.disabled = true;
    required.setAttribute("aria-label", labels.necessary ?? "Necessary");
    necessaryCopy.append(necessaryLabel, necessaryDescription);
    necessary.append(necessaryCopy, required);
    panel.append(necessary);

    const currentChoices = consent()?.choices ?? {};
    const controls = new Map();
    for (const category of categoryMap.values()) {
      if (!visibleCategories.has(category.id)) continue;
      const row = document.createElement("label");
      row.className = "ui-cookie-consent__category";
      const copy = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = category.label;
      const detail = document.createElement("span");
      detail.className = "ui-cookie-consent__category-description";
      detail.textContent = category.description;
      copy.append(name, detail);
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = currentChoices[category.id] === true;
      checkbox.setAttribute("aria-label", category.label);
      controls.set(category.id, checkbox);
      row.append(copy, checkbox);
      panel.append(row);
    }

    const actions = document.createElement("div");
    actions.className = "ui-cookie-consent__actions";
    actions.append(
      createButton(
        labels.btn_save ?? "Save preferences",
        "ui-cookie-consent__button ui-cookie-consent__button--primary",
        () => {
          setConsent(
            Object.fromEntries([...controls].map(([id, checkbox]) => [id, checkbox.checked])),
          );
        },
      ),
    );
    actions.append(
      createButton(labels.btn_cancel ?? "Cancel", "ui-cookie-consent__button", () => {
        visiblePanel = "banner";
        render();
      }),
    );
    panel.append(actions);
    return panel;
  }

  /**
   * Render the first-layer banner with accept, reject and manage actions.
   *
   * @returns {HTMLElement}
   */
  function renderBanner() {
    const panel = document.createElement("div");
    panel.className = "ui-cookie-consent__banner";
    if (image) {
      const bannerImage = document.createElement("img");
      bannerImage.className = "ui-cookie-consent__image";
      bannerImage.src = image;
      bannerImage.alt = "";
      bannerImage.setAttribute("aria-hidden", "true");
      panel.append(bannerImage);
    }
    const content = document.createElement("div");
    const heading = document.createElement("h2");
    heading.className = "ui-cookie-consent__title";
    heading.textContent = labels.title ?? "Your privacy choices";
    const message = document.createElement("p");
    message.className = "ui-cookie-consent__description";
    // message.textContent = `${siteName}: ${description} Optional purposes: ${purposes} You can change or withdraw your choice at any time using Cookie settings.`;
    message.textContent = labels.bannerDescription ?? description;

    content.append(heading, message);
    if (privacyPolicyUrl) {
      const link = document.createElement("a");
      link.className = "ui-cookie-consent__policy-link";
      link.href = privacyPolicyUrl;
      link.textContent = labels.privacyPolicy ?? "Privacy policy";
      content.append(link);
    }
    panel.append(content);
    const actions = document.createElement("div");
    actions.className = "ui-cookie-consent__actions";
    actions.append(
      createButton(labels.btn_acceptAll ?? "Accept all", "ui-cookie-consent__button", acceptAll),
    );
    actions.append(
      createButton(
        labels.btn_reject ?? "Reject non-essential",
        "ui-cookie-consent__button",
        rejectNonEssential,
      ),
    );
    // The preferences view replaces the banner, so this is a plain button, not a disclosure.
    const manage = createButton(
      labels.btn_manage ?? "Manage preferences",
      "ui-cookie-consent__button",
      () => {
        visiblePanel = "preferences";
        render();
      },
    );
    actions.append(manage);
    panel.append(actions);
    focusTarget = manage;
    return panel;
  }

  /**
   * Render the view for the current state: preferences, banner, or the settings button after a decision.
   *
   * @param {object | null} current The current consent record.
   */
  function renderView(current) {
    if (visiblePanel === "preferences") {
      element.append(renderPreferences());
      return;
    }
    if (!current) {
      visiblePanel = "banner";
      element.append(renderBanner());
      return;
    }
    visiblePanel = null;
    if (!showSettingsButton) return;
    const settings = createButton(
      labels.btn_settings ?? "Cookie settings",
      "ui-cookie-consent__settings",
      () => {
        visiblePanel = "preferences";
        render();
      },
    );
    element.append(settings);
    focusTarget = settings;
  }

  render = function render({ focus = false } = {}) {
    if (closed) return;
    // replaceChildren() drops the focused button, so carry focus into the new view.
    const keepFocus = focus || element.contains(document.activeElement);
    element.replaceChildren();
    focusTarget = null;
    const current = consent();
    notifyListeners();
    renderView(current);
    if (keepFocus) focusTarget?.focus();
  };

  /**
   * Open the preferences view and move focus to it. Does nothing after `close()`.
   */
  function openSettings() {
    if (closed) return;
    visiblePanel = "preferences";
    render({ focus: true });
  }

  /**
   * Close the manager: end every subscription, remove the element and release storage. Safe to call more than once.
   */
  function close() {
    if (closed) return;
    closed = true;
    for (const callbacks of listeners.values()) {
      for (const listener of callbacks.values()) listener.unsubscribe();
    }
    listeners.clear();
    choicesChanged = true;
    notifyListeners();
    disposeStorage();
    element.remove();
  }

  render();
  try {
    onCleanup(close);
  } catch {
    /* The consent manager can be closed manually when created outside a Nodula owner. */
  }

  return {
    element,
    consent,
    getConsent: consent,
    hasConsent,
    setConsent,
    acceptAll,
    rejectNonEssential,
    revokeConsent,
    registerCategory,
    on,
    openSettings,
    close,
  };
}
