import { createRoot, onCleanup } from 'nodula-framework';
import { createLocalStorage } from 'nodula-framework/localstorage';
import { injectAddonStyles } from './inject-styles.js';
import cookieConsentStyles from '../assets/css/nodula-cookieconsent.css?inline';

const defaultCategories = [
  { id: 'analytics', label: 'Analytics', description: 'Helps us understand how visitors use this website.' },
  { id: 'personalization', label: 'Personalisation', description: 'Remembers preferences and adapts content.' },
  { id: 'marketing', label: 'Marketing', description: 'Measures advertising and supports relevant campaigns.' },
];

function validateCategoryId(id) {
  if (typeof id !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(id)
    || ['necessary', '__proto__', 'prototype', 'constructor'].includes(id)) {
    throw new TypeError('Cookie consent category ids must be lowercase identifiers; "necessary" is reserved.');
  }
}

function validateCategory(category) {
  if (!category || typeof category !== 'object' || Array.isArray(category)) {
    throw new TypeError('registerCategory expects an id and category options.');
  }
  validateCategoryId(category.id);
  if (typeof category.label !== 'string' || !category.label.trim()
    || typeof category.description !== 'string' || !category.description.trim()) {
    throw new TypeError('Cookie consent category label and description must be non-empty strings.');
  }
  return { id: category.id, label: category.label, description: category.description };
}

function validateConsent(value, version, categories, visibleCategories) {
  if (!value || typeof value !== 'object' || value.version !== version
    || typeof value.timestamp !== 'string' || !value.choices || typeof value.choices !== 'object') return null;
  const choices = {};
  for (const id of categories.keys()) choices[id] = visibleCategories.has(id) && value.choices[id] === true;
  return { version, necessary: true, choices, timestamp: value.timestamp };
}

function createButton(label, className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function createDisclosureButton(label, className, onClick, expanded, controls) {
  const button = createButton(label, className, onClick);
  button.setAttribute('aria-expanded', String(expanded));
  button.setAttribute('aria-controls', controls);
  return button;
}

function notifyListener(callback, allowed, currentConsent) {
  try { callback(allowed, currentConsent); }
  catch (error) { console.error('Cookie consent listener failed:', error); }
}

/** Load Google Analytics only while the consent manager grants analytics permission. */
export function setupGoogleAnalytics(consent, measurementId) {
  if (!consent || typeof consent.on !== 'function') {
    throw new TypeError('setupGoogleAnalytics expects a cookie consent manager.');
  }
  if (typeof measurementId !== 'string' || !/^G-[A-Z0-9]+$/.test(measurementId)) {
    throw new TypeError('setupGoogleAnalytics expects a valid Google Analytics measurement ID.');
  }

  let googleTagLoaded = false;
  let googleTagScript;

  // Queue consent as denied before any Google tag can run.
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', measurementId);

  return consent.on('analytics', (allowed) => {
    window.gtag('consent', 'update', {
      analytics_storage: allowed ? 'granted' : 'denied',
    });

    if (!allowed) {
      googleTagScript?.remove();
      googleTagScript = null;
      googleTagLoaded = false;
      return;
    }
    if (googleTagLoaded) return;

    googleTagLoaded = true;
    googleTagScript = document.createElement('script');
    googleTagScript.async = true;
    googleTagScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.append(googleTagScript);
  });
}

/** Create a consent manager with a floating notice, preference UI, and localStorage-backed decisions. */
export function createCookieConsent(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('createCookieConsent expects an options object.');
  }
  const {
    version = '1.0',
    storageKey = 'nodula-cookie-consent',
    storage,
    siteName = typeof location === 'undefined' ? 'This website' : location.hostname,
    description = 'We use cookies and similar technologies. Necessary storage keeps the website working; optional categories need your permission.',
    image,
    privacyPolicyUrl,
    categories: customCategories = [],
    labels = {},
    showAnalytics = true,
    showPersonalization = true,
    showMarketing = true,
    showSettingsButton = true,
  } = options;
  if (typeof version !== 'string' || !version.trim()) throw new TypeError('Cookie consent version must be a non-empty string.');
  if (typeof storageKey !== 'string' || !storageKey.trim()) throw new TypeError('Cookie consent storageKey must be a non-empty string.');
  if (typeof siteName !== 'string' || !siteName.trim() || typeof description !== 'string' || !description.trim()) {
    throw new TypeError('Cookie consent siteName and description must be non-empty strings.');
  }
  if (image !== undefined && (typeof image !== 'string' || !image.trim())) {
    throw new TypeError('Cookie consent image must be a non-empty URL string.');
  }
  if (privacyPolicyUrl !== undefined && typeof privacyPolicyUrl !== 'string') {
    throw new TypeError('Cookie consent privacyPolicyUrl must be a string.');
  }
  if (!Array.isArray(customCategories)) throw new TypeError('Cookie consent categories must be an array.');
  for (const [name, value] of Object.entries({ showAnalytics, showPersonalization, showMarketing, showSettingsButton })) {
    if (typeof value !== 'boolean') throw new TypeError(`Cookie consent ${name} must be a boolean.`);
  }
  if (labels !== undefined && (!labels || typeof labels !== 'object' || Array.isArray(labels))) {
    throw new TypeError('Cookie consent labels must be an object.');
  }
  if (Object.values(labels).some((label) => typeof label !== 'string' || !label.trim())) {
    throw new TypeError('Cookie consent label overrides must be non-empty strings.');
  }
  if (typeof document === 'undefined' || !document.body) throw new Error('createCookieConsent requires a browser document.');
  if (privacyPolicyUrl && !['http:', 'https:'].includes(new URL(privacyPolicyUrl, document.baseURI).protocol)) {
    throw new TypeError('Cookie consent privacyPolicyUrl must use HTTP or HTTPS.');
  }
  if (image && !['http:', 'https:'].includes(new URL(image, document.baseURI).protocol)) {
    throw new TypeError('Cookie consent image must use HTTP or HTTPS.');
  }

  const categoryMap = new Map(defaultCategories.map((category) => [category.id, { ...category }]));
  const configuredCategoryIds = new Set();
  for (const category of customCategories) {
    const validated = validateCategory(category);
    if (configuredCategoryIds.has(validated.id)) throw new Error(`Cookie consent category already registered: ${validated.id}`);
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
    ...(showAnalytics ? ['analytics'] : []),
    ...(showPersonalization ? ['personalization'] : []),
    ...(showMarketing ? ['marketing'] : []),
    ...customCategories.map((category) => category.id).filter((id) => !defaultCategories.some((category) => category.id === id)),
  ]);

  const [[readStoredConsent, writeStoredConsent], disposeStorage] = createRoot(() => createLocalStorage(
    storageKey,
    null,
    storage === undefined ? {} : { storage },
  ));
  const consent = () => validateConsent(readStoredConsent(), version, categoryMap, visibleCategories);
  const listeners = new Map();
  let choicesChanged = false;
  let render;
  let visiblePanel = null;
  let closed = false;

  injectAddonStyles('cookieconsent', cookieConsentStyles);
  const element = document.createElement('section');
  element.className = 'ui-cookie-consent';
  element.setAttribute('aria-label', labels.consent ?? 'Cookie consent');
  document.body.append(element);

  function setConsent(choices = {}) {
    if (closed) throw new Error('Cookie consent manager is closed.');
    if (!choices || typeof choices !== 'object' || Array.isArray(choices)) {
      throw new TypeError('setConsent expects an object of category choices.');
    }
    for (const [id, value] of Object.entries(choices)) {
      if (!categoryMap.has(id)) throw new Error(`Unknown cookie consent category: ${id}`);
      if (typeof value !== 'boolean') throw new TypeError(`Cookie consent choice for "${id}" must be a boolean.`);
    }
    const normalizedChoices = {};
    for (const id of categoryMap.keys()) normalizedChoices[id] = visibleCategories.has(id) && choices[id] === true;
    choicesChanged = true;
    writeStoredConsent({ version, necessary: true, choices: normalizedChoices, timestamp: new Date().toISOString() });
    if (render) {
      visiblePanel = null;
      render();
    }
    return consent();
  }

  function acceptAll() {
    return setConsent(Object.fromEntries([...visibleCategories].map((id) => [id, true])));
  }

  function rejectNonEssential() {
    return setConsent({});
  }

  function revokeConsent() {
    if (closed) throw new Error('Cookie consent manager is closed.');
    writeStoredConsent(null);
    choicesChanged = true;
    if (render) {
      visiblePanel = null;
      render();
    }
  }

  function hasConsent(id) {
    if (id === 'necessary') return true;
    if (!categoryMap.has(id)) return false;
    return consent()?.choices[id] === true;
  }

  function on(id, callback) {
    if (closed) throw new Error('Cookie consent manager is closed.');
    if (id !== 'necessary' && !categoryMap.has(id)) throw new Error(`Unknown cookie consent category: ${id}`);
    if (typeof callback !== 'function') throw new TypeError('Cookie consent listener must be a function.');
    let callbacks = listeners.get(id);
    if (!callbacks) listeners.set(id, callbacks = new Map());
    const listener = { unsubscribe: null, previous: hasConsent(id) };
    notifyListener(callback, listener.previous, consent());
    const unsubscribe = () => {
      callbacks.delete(callback);
      if (!callbacks.size) listeners.delete(id);
    };
    listener.unsubscribe = unsubscribe;
    callbacks.set(callback, listener);
    try { onCleanup(unsubscribe); }
    catch { /* Cookie consent listeners can be managed manually outside a Nodula owner. */ }
    return unsubscribe;
  }

  function registerCategory(category) {
    if (closed) throw new Error('Cookie consent manager is closed.');
    const validated = validateCategory(category);
    if (categoryMap.has(validated.id)) throw new Error(`Cookie consent category already registered: ${validated.id}`);
    const hasExistingDecision = Boolean(consent());
    categoryMap.set(validated.id, validated);
    visibleCategories.add(validated.id);
    if (hasExistingDecision) {
      writeStoredConsent(null);
      choicesChanged = true;
    }
    render();
    return () => {
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

  function notifyListeners() {
    if (!choicesChanged) return;
    choicesChanged = false;
    const current = consent();
    for (const [id, callbacks] of listeners) {
      const allowed = id === 'necessary' || current?.choices[id] === true;
      for (const [callback, listener] of callbacks) {
        if (listener.previous === allowed) continue;
        listener.previous = allowed;
        notifyListener(callback, allowed, current);
      }
    }
  }

  function renderPreferences() {
    const panel = document.createElement('div');
    panel.className = 'ui-cookie-consent__preferences';
    panel.id = 'ui-cookie-consent-preferences';
    panel.setAttribute('aria-labelledby', 'ui-cookie-consent-preferences-title');
    const heading = document.createElement('h3');
    heading.className = 'ui-cookie-consent__title';
    heading.id = 'ui-cookie-consent-preferences-title';
    heading.textContent = labels.preferences ?? 'Cookie preferences';
    panel.append(heading);

    const necessary = document.createElement('div');
    necessary.className = 'ui-cookie-consent__category';
    const necessaryCopy = document.createElement('div');
    const necessaryLabel = document.createElement('strong');
    necessaryLabel.textContent = labels.necessary ?? 'Necessary';
    const necessaryDescription = document.createElement('span');
    necessaryDescription.className = 'ui-cookie-consent__category-description';
    necessaryDescription.textContent = labels.necessaryDescription ?? 'Required for this website to function. Always active.';
    const required = document.createElement('input');
    required.type = 'checkbox';
    required.checked = true;
    required.disabled = true;
    required.setAttribute('aria-label', labels.necessary ?? 'Necessary');
    necessaryCopy.append(necessaryLabel, necessaryDescription);
    necessary.append(necessaryCopy, required);
    panel.append(necessary);

    const currentChoices = consent()?.choices ?? {};
    const controls = new Map();
    for (const category of categoryMap.values()) {
      if (!visibleCategories.has(category.id)) continue;
      const row = document.createElement('label');
      row.className = 'ui-cookie-consent__category';
      const copy = document.createElement('span');
      const name = document.createElement('strong');
      name.textContent = category.label;
      const detail = document.createElement('span');
      detail.className = 'ui-cookie-consent__category-description';
      detail.textContent = category.description;
      copy.append(name, detail);
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = currentChoices[category.id] === true;
      checkbox.setAttribute('aria-label', category.label);
      controls.set(category.id, checkbox);
      row.append(copy, checkbox);
      panel.append(row);
    }

    const actions = document.createElement('div');
    actions.className = 'ui-cookie-consent__actions';
    actions.append(createButton(labels.btn_save ?? 'Save preferences', 'ui-cookie-consent__button ui-cookie-consent__button--primary', () => {
      setConsent(Object.fromEntries([...controls].map(([id, checkbox]) => [id, checkbox.checked])));
    }));
    actions.append(createButton(labels.btn_cancel ?? 'Cancel', 'ui-cookie-consent__button', () => {
      visiblePanel = 'banner';
      render();
    }));
    panel.append(actions);
    return panel;
  }

  function renderBanner() {
    const panel = document.createElement('div');
    panel.className = 'ui-cookie-consent__banner';
    if (image) {
      const bannerImage = document.createElement('img');
      bannerImage.className = 'ui-cookie-consent__image';
      bannerImage.src = image;
      bannerImage.alt = '';
      bannerImage.setAttribute('aria-hidden', 'true');
      panel.append(bannerImage);
    }
    const content = document.createElement('div');
    const heading = document.createElement('h2');
    heading.className = 'ui-cookie-consent__title';
    heading.textContent = labels.title ?? 'Your privacy choices';
    const message = document.createElement('p');
    message.className = 'ui-cookie-consent__description';
    const purposes = [...categoryMap.values()]
      .filter((category) => visibleCategories.has(category.id))
      .map(({ label, description: purpose }) => `${label}: ${purpose}`)
      .join(' ');
   // message.textContent = `${siteName}: ${description} Optional purposes: ${purposes} You can change or withdraw your choice at any time using Cookie settings.`;
     message.textContent = labels.bannerDescription ?? description;
   
    content.append(heading, message);
    if (privacyPolicyUrl) {
      const link = document.createElement('a');
      link.className = 'ui-cookie-consent__policy-link';
      link.href = privacyPolicyUrl;
      link.textContent = labels.privacyPolicy ?? 'Privacy policy';
      content.append(link);
    }
    panel.append(content);
    const actions = document.createElement('div');
    actions.className = 'ui-cookie-consent__actions';
    actions.append(createButton(labels.btn_acceptAll ?? 'Accept all', 'ui-cookie-consent__button', acceptAll));
    actions.append(createButton(labels.btn_reject ?? 'Reject non-essential', 'ui-cookie-consent__button', rejectNonEssential));
    actions.append(createDisclosureButton(labels.btn_manage ?? 'Manage preferences', 'ui-cookie-consent__button', () => {
      visiblePanel = 'preferences';
      render();
    }, visiblePanel === 'preferences', 'ui-cookie-consent-preferences'));
    panel.append(actions);
    return panel;
  }

  render = function render() {
    if (closed) return;
    element.replaceChildren();
    const current = consent();
    notifyListeners();
    if (visiblePanel === 'preferences') {
      element.append(renderPreferences());
      return;
    }
    if (!current) {
      visiblePanel = 'banner';
      element.append(renderBanner());
      return;
    }
    visiblePanel = null;
    if (!showSettingsButton) return;
    element.append(createDisclosureButton(labels.btn_settings ?? 'Cookie settings', 'ui-cookie-consent__settings', () => {
      visiblePanel = 'preferences';
      render();
    }, false, 'ui-cookie-consent-preferences'));
  };

  function openSettings() {
    if (closed) return;
    visiblePanel = 'preferences';
    render();
  }

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
  try { onCleanup(close); }
  catch { /* The consent manager can be closed manually when created outside a Nodula owner. */ }

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