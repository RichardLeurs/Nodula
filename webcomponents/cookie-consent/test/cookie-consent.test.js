// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from "vitest";
import { Window } from "happy-dom";

let window;
let document;
let define;
let setupGoogleAnalytics;
let createConsentManager;
let tagCounter = 0;
const STORAGE_KEY = "nodula-cookie-consent";

beforeAll(async () => {
  // Imported before any DOM global exists: the module must be SSR-safe.
  ({ defineCookieConsentElement: define, setupGoogleAnalytics } = await import("../src/index.js"));
  ({ createConsentManager } = await import("../src/consent-manager.js"));
  window = new Window({ url: "http://localhost/" });
  document = window.document;
  Object.assign(globalThis, {
    window,
    document,
    location: window.location,
    HTMLElement: window.HTMLElement,
    customElements: window.customElements,
    CustomEvent: window.CustomEvent,
  });
});

afterAll(() => {
  window.close();
  for (const name of [
    "window",
    "document",
    "location",
    "HTMLElement",
    "customElements",
    "CustomEvent",
  ])
    delete globalThis[name];
});

/**
 * Reset everything a test can leave behind: storage, cookies, Google globals, scripts and elements.
 */
function resetPage() {
  // Removing the elements closes their managers, which ends every subscription.
  document.body.replaceChildren();
  window.localStorage.clear();
  for (const entry of document.cookie.split(/;\s*/)) {
    const name = entry.split("=")[0];
    if (name) document.cookie = `${name}=; Expires=${new Date(0).toUTCString()}; Path=/`;
  }
  delete window.gtag;
  delete window.dataLayer;
  document.head.querySelectorAll("script").forEach((script) => script.remove());
}

beforeEach(resetPage);
afterEach(resetPage);

/**
 * Register a fresh tag name and return a connected element, built from attributes.
 *
 * @param {Record<string, string>} [attributes]
 * @param {(element: HTMLElement) => void} [prepare] Runs before the element connects.
 * @returns {HTMLElement}
 */
function mount(attributes = {}, prepare) {
  const tag = `cc-test-${++tagCounter}`;
  define(tag);
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  prepare?.(element);
  document.body.append(element);
  return element;
}

/**
 * Click the first button inside `root` whose text equals `text`.
 *
 * @param {Element} root
 * @param {string} text
 */
function click(root, text) {
  const button = [...root.querySelectorAll("button")].find((b) => b.textContent === text);
  assert.ok(button, `button "${text}" not found`);
  button.click();
}

/**
 * Call connectedCallback directly so a thrown error is observable (browsers only report it).
 *
 * @param {Record<string, string>} attributes
 * @param {(element: HTMLElement) => void} [prepare]
 * @returns {() => void}
 */
function connectWith(attributes, prepare) {
  const tag = `cc-test-${++tagCounter}`;
  define(tag);
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  prepare?.(element);
  return () => element.connectedCallback();
}

describe("defineCookieConsentElement", () => {
  it("registers the same class when called twice for one tag", () => {
    // Given
    const tag = `cc-twice-${++tagCounter}`;
    // When
    const first = define(tag);
    const second = define(tag);
    // Then
    assert.equal(first, second);
    assert.equal(customElements.get(tag), first);
  });

  it("throws when the tag name belongs to another class", () => {
    // Given
    const tag = `cc-clash-${++tagCounter}`;
    customElements.define(tag, class extends window.HTMLElement {});
    // When / Then
    assert.throws(() => define(tag), /already registered by another element class/);
  });

  it("registers the default tag name", () => {
    // When
    define();
    // Then
    assert.ok(customElements.get("nodula-cookie-consent"));
  });
});

describe("<nodula-cookie-consent> rendering", () => {
  it("renders the banner inside the element when it connects", () => {
    // When
    const element = mount();
    // Then
    assert.ok(element.querySelector(".ui-cookie-consent .ui-cookie-consent__banner"));
    assert.equal(document.body.querySelectorAll(".ui-cookie-consent").length, 1);
    assert.ok(document.head.querySelector("style[data-nodula-cookieconsent-styles]"));
  });

  it("injects the stylesheet only once for several elements", () => {
    // When
    mount();
    mount();
    // Then
    assert.equal(
      document.head.querySelectorAll("style[data-nodula-cookieconsent-styles]").length,
      1,
    );
  });

  it("shows only the settings button when a valid decision is stored", () => {
    // Given
    const first = mount();
    first.acceptAll();
    first.remove();
    // When
    const element = mount();
    // Then
    assert.equal(element.querySelector(".ui-cookie-consent__banner"), null);
    assert.ok(element.querySelector(".ui-cookie-consent__settings"));
  });

  it("asks again when the version attribute differs from the stored decision", () => {
    // Given
    mount({ version: "1.0" }).acceptAll();
    // When
    const element = mount({ version: "2.0" });
    // Then
    assert.ok(element.querySelector(".ui-cookie-consent__banner"));
  });

  it("applies attributes as options", () => {
    // When
    const element = mount({
      description: "Custom text",
      "privacy-policy-url": "https://example.com/privacy",
      "show-marketing": "false",
      "show-personalization": "false",
      "storage-key": "custom-key",
    });
    // Then
    assert.equal(
      element.querySelector(".ui-cookie-consent__description").textContent,
      "Custom text",
    );
    assert.equal(
      element.querySelector("a.ui-cookie-consent__policy-link").href,
      "https://example.com/privacy",
    );
    click(element, "Manage preferences");
    const labels = [...element.querySelectorAll("label strong")].map((n) => n.textContent);
    assert.deepEqual(labels, ["Analytics"]);
    element.acceptAll();
    assert.ok(window.localStorage.getItem("custom-key"));
    assert.equal(window.localStorage.getItem(STORAGE_KEY), null);
  });

  it("hides the settings button when show-settings-button is false", () => {
    // Given
    const element = mount({ "show-settings-button": "false" });
    // When
    element.acceptAll();
    // Then
    assert.equal(element.querySelector(".ui-cookie-consent__settings"), null);
  });

  it("reads categories and labels from JSON attributes", () => {
    // When
    const element = mount({
      labels: JSON.stringify({ title: "Hello", btn_acceptAll: "Yes please" }),
      categories: JSON.stringify([{ id: "chat", label: "Chat", description: "Live chat widget" }]),
    });
    // Then
    assert.equal(element.querySelector("h2").textContent, "Hello");
    assert.ok([...element.querySelectorAll("button")].some((b) => b.textContent === "Yes please"));
    element.setConsent({ chat: true });
    assert.equal(element.hasConsent("chat"), true);
  });

  it("prefers the categories and labels properties over attributes", () => {
    // When
    const element = mount({ labels: JSON.stringify({ title: "Attribute" }) }, (el) => {
      el.labels = { title: "Property" };
    });
    // Then
    assert.equal(element.querySelector("h2").textContent, "Property");
  });
});

describe("<nodula-cookie-consent> behaviour", () => {
  it("fires a bubbling consent-change event with the record on accept, reject and save", () => {
    // Given
    const element = mount();
    const records = [];
    document.body.addEventListener("consent-change", (event) => {
      assert.equal(event.bubbles, true);
      assert.equal(event.composed, true);
      records.push(event.detail);
    });
    // When
    click(element, "Accept all");
    element.openSettings();
    click(element, "Save preferences");
    element.revokeConsent();
    click(element, "Reject non-essential");
    // Then
    assert.equal(records.length, 4);
    assert.equal(records[0].choices.analytics, true);
    assert.equal(records[1].choices.analytics, true);
    assert.equal(records[2], null);
    assert.equal(records[3].choices.analytics, false);
  });

  it("does not fire consent-change when connecting with a stored decision", () => {
    // Given
    mount().acceptAll();
    let fired = 0;
    const tag = `cc-test-${++tagCounter}`;
    define(tag);
    const element = document.createElement(tag);
    element.addEventListener("consent-change", () => fired++);
    // When
    document.body.append(element);
    // Then
    assert.equal(fired, 0);
  });

  it("exposes the consent methods", () => {
    // Given
    const element = mount();
    const seen = [];
    element.on("analytics", (allowed) => seen.push(allowed));
    // When
    const record = element.setConsent({ analytics: true });
    // Then
    assert.equal(record.necessary, true);
    assert.equal(element.hasConsent("analytics"), true);
    assert.equal(element.hasConsent("marketing"), false);
    assert.equal(element.hasConsent("necessary"), true);
    assert.deepEqual(element.getConsent().choices, record.choices);
    assert.deepEqual(seen, [false, true]);
    element.rejectNonEssential();
    assert.equal(element.hasConsent("analytics"), false);
    assert.equal(element.acceptAll().choices.marketing, true);
    element.revokeConsent();
    assert.equal(element.getConsent(), null);
    assert.ok(element.querySelector(".ui-cookie-consent__banner"));
  });

  it("registers a category that asks the visitor again", () => {
    // Given
    const element = mount();
    element.acceptAll();
    // When
    const remove = element.registerCategory({
      id: "chat",
      label: "Chat",
      description: "Live chat",
    });
    // Then
    assert.equal(element.getConsent(), null);
    assert.ok(element.querySelector(".ui-cookie-consent__banner"));
    remove();
    assert.throws(() => element.setConsent({ chat: true }), /Unknown cookie consent category/);
  });

  it("throws from a method while the element is not connected", () => {
    // Given
    const tag = `cc-test-${++tagCounter}`;
    define(tag);
    const element = document.createElement(tag);
    // When / Then
    assert.throws(() => element.acceptAll(), /not connected/);
    assert.doesNotThrow(() => element.openSettings());
  });

  it("opens the preferences view and moves focus into it", () => {
    // Given
    const element = mount();
    element.acceptAll();
    // When
    element.openSettings();
    // Then
    assert.ok(element.querySelector(".ui-cookie-consent__preferences"));
    assert.equal(document.activeElement, element.querySelector("h3"));
  });

  it("closes when removed: DOM and listeners are gone, and removing again is harmless", async () => {
    // Given
    const element = mount();
    const calls = [];
    element.on("analytics", (allowed) => calls.push(allowed));
    element.acceptAll();
    // When
    element.remove();
    await Promise.resolve();
    element.disconnectedCallback();
    await Promise.resolve();
    // Then
    assert.equal(element.querySelector(".ui-cookie-consent"), null);
    assert.equal(element.children.length, 0);
    assert.deepEqual(calls, [false, true]);
    assert.throws(() => element.getConsent(), /not connected/);
  });

  it("builds a fresh banner when the element is added again after a real removal", async () => {
    // Given
    const element = mount();
    element.remove();
    await Promise.resolve();
    // When
    document.body.append(element);
    // Then
    assert.equal(element.querySelectorAll(".ui-cookie-consent").length, 1);
  });
});

describe("<nodula-cookie-consent> lifecycle", () => {
  it("keeps subscriptions and Google Analytics revocation when the element is moved", async () => {
    // Given
    const element = mount();
    setupGoogleAnalytics(element, "G-ABC");
    const seen = [];
    element.on("analytics", (allowed) => seen.push(allowed));
    element.acceptAll();
    document.cookie = "_ga=1; path=/";
    const target = document.createElement("div");
    document.body.append(target);
    // When
    element.remove();
    target.append(element);
    await Promise.resolve();
    element.rejectNonEssential();
    // Then
    assert.deepEqual(seen, [false, true, false]);
    assert.deepEqual(
      [...window.dataLayer.at(-1)],
      ["consent", "update", { analytics_storage: "denied" }],
    );
    assert.equal(document.cookie.includes("_ga="), false);
    assert.equal(element.querySelectorAll(".ui-cookie-consent").length, 1);
  });

  it("does not close until the microtask runs, so methods still work right after removal", async () => {
    // Given
    const element = mount();
    // When
    element.remove();
    // Then
    assert.doesNotThrow(() => element.getConsent());
    await Promise.resolve();
    assert.throws(() => element.getConsent(), /not connected/);
  });

  it("uses a property set before the element was defined", () => {
    // Given
    const tag = `cc-upgrade-${++tagCounter}`;
    const element = document.createElement(tag);
    element.storage = null;
    element.labels = { title: "Early" };
    document.body.append(element);
    // When
    define(tag);
    // Then
    element.acceptAll();
    assert.equal(window.localStorage.getItem(STORAGE_KEY), null);
    assert.equal(element.querySelector(".ui-cookie-consent__settings") !== null, true);
    element.revokeConsent();
    assert.equal(element.querySelector("h2").textContent, "Early");
  });

  it("describes the initialisation error from a method after a failed connect", () => {
    // Given
    const tag = `cc-fail-${++tagCounter}`;
    define(tag);
    const element = document.createElement(tag);
    element.setAttribute("version", " ");
    // When
    assert.throws(() => element.connectedCallback(), /version must be a non-empty string/);
    // Then
    assert.throws(() => element.acceptAll(), /failed to initialise: Cookie consent version/);
  });

  it("leaves exactly one preferences panel when a consent-change handler opens the settings", () => {
    // Given
    const element = mount();
    element.addEventListener("consent-change", () => element.openSettings());
    // When
    element.acceptAll();
    // Then
    const panels = element.querySelectorAll(".ui-cookie-consent__preferences");
    assert.equal(panels.length, 1);
    const ids = [...element.querySelectorAll("[id]")].map((node) => node.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("uses unique ids across instances, distinct from the add-on prefix", () => {
    // Given
    const first = mount();
    const second = mount();
    // When
    first.openSettings();
    second.openSettings();
    // Then
    const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
    assert.equal(ids.length, 4);
    assert.equal(new Set(ids).size, 4);
    assert.ok(ids.every((id) => id.startsWith("nodula-cookie-consent-")));
  });

  it("carries focus into the new view after a button click", () => {
    // Given
    const element = mount();
    const accept = [...element.querySelectorAll("button")].find(
      (b) => b.textContent === "Accept all",
    );
    accept.focus();
    // When
    accept.click();
    // Then
    assert.equal(document.activeElement, element.querySelector(".ui-cookie-consent__settings"));
  });

  it("fires consent-change with null when removing a category clears the decision", () => {
    // Given
    const element = mount();
    const remove = element.registerCategory({
      id: "chat",
      label: "Chat",
      description: "Live chat",
    });
    element.acceptAll();
    const records = [];
    element.addEventListener("consent-change", (event) => records.push(event.detail));
    // When
    remove();
    // Then
    assert.deepEqual(records, [null]);
  });

  it("stores hidden categories as denied", () => {
    // Given
    const element = mount({ "show-marketing": "false" });
    // When
    element.acceptAll();
    // Then
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    assert.equal(stored.choices.marketing, false);
    assert.equal(stored.choices.analytics, true);
    assert.equal(element.hasConsent("marketing"), false);
  });
});

describe("<nodula-cookie-consent> validation", () => {
  it("throws a TypeError for invalid JSON in the labels attribute", () => {
    // Given an attribute with an invalid value
    // When the element connects
    // Then connecting throws a clear error
    assert.throws(
      connectWith({ labels: "{nope" }),
      (e) => e instanceof TypeError && /labels attribute must be valid JSON/.test(e.message),
    );
  });

  it("throws a TypeError for invalid JSON in the categories attribute", () => {
    // Given an attribute with an invalid value
    // When the element connects
    // Then connecting throws a clear error
    assert.throws(connectWith({ categories: "[" }), /categories attribute must be valid JSON/);
  });

  it("throws the function API errors for invalid values", () => {
    // Given an attribute with an invalid value
    // When the element connects
    // Then connecting throws a clear error
    assert.throws(connectWith({ categories: '{"a":1}' }), /categories must be an array/);
    assert.throws(
      connectWith({ labels: '{"title":""}' }),
      /label overrides must be non-empty strings/,
    );
    assert.throws(connectWith({ version: "  " }), /version must be a non-empty string/);
    assert.throws(connectWith({ "storage-key": "" }), /storageKey must be a non-empty string/);
    assert.throws(connectWith({ image: "javascript:alert(1)" }), /image must use HTTP or HTTPS/);
    assert.throws(
      connectWith({ "privacy-policy-url": "javascript:alert(1)" }),
      /privacyPolicyUrl must use HTTP or HTTPS/,
    );
    assert.throws(
      connectWith({ categories: '[{"id":"necessary","label":"x","description":"y"}]' }),
      /reserved/,
    );
  });
});

describe("consent manager storage", () => {
  it("keeps the decision in memory only when storage is null", () => {
    // Given
    const element = mount({}, (el) => {
      el.storage = null;
    });
    // When
    element.acceptAll();
    // Then
    assert.equal(window.localStorage.getItem(STORAGE_KEY), null);
    assert.equal(element.hasConsent("analytics"), true);
  });

  it("starts without a decision on a corrupt entry and replaces it on the first write", () => {
    // Given
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    const element = mount();
    // Then
    assert.ok(element.querySelector(".ui-cookie-consent__banner"));
    assert.equal(window.localStorage.getItem(STORAGE_KEY), "{not json");
    // When
    element.acceptAll();
    // Then
    assert.equal(JSON.parse(window.localStorage.getItem(STORAGE_KEY)).choices.analytics, true);
  });

  it("keeps working in memory when storage is blocked", () => {
    // Given
    const blocked = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("full");
      },
    };
    const errors = [];
    const original = console.error;
    console.error = (...args) => errors.push(args.join(" "));
    try {
      const element = mount({}, (el) => {
        el.storage = blocked;
      });
      // When
      element.acceptAll();
      // Then
      assert.equal(element.hasConsent("analytics"), true);
      assert.equal(errors.length, 1);
    } finally {
      console.error = original;
    }
  });

  it("reads a record written by the function API format", () => {
    // Given
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: "1.0",
        necessary: true,
        choices: { analytics: true, personalization: false, marketing: false },
        timestamp: "2026-01-01T00:00:00.000Z",
      }),
    );
    // When
    const element = mount();
    // Then
    assert.equal(element.hasConsent("analytics"), true);
    assert.equal(element.querySelector(".ui-cookie-consent__banner"), null);
  });

  it("writes the record format the function API reads", () => {
    // When
    mount().setConsent({ analytics: true });
    // Then
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    assert.deepEqual(Object.keys(stored).sort(), ["choices", "necessary", "timestamp", "version"]);
    assert.equal(stored.necessary, true);
    assert.deepEqual(stored.choices, { analytics: true, personalization: false, marketing: false });
  });
});

describe("consent manager", () => {
  it("renders into the appendTo element and validates it", () => {
    // Given
    const host = document.createElement("div");
    document.body.append(host);
    // When
    const manager = createConsentManager({ appendTo: host, storage: null });
    // Then
    assert.equal(manager.element.parentNode, host);
    manager.close();
    manager.close();
    assert.equal(host.children.length, 0);
    assert.throws(() => createConsentManager({ appendTo: {} }), /appendTo must be an element/);
  });
});

describe("re-entrant consent changes", () => {
  it("ends denied when a consent-change handler denies analytics after acceptAll", () => {
    // Given
    const element = mount();
    setupGoogleAnalytics(element, "G-ABC");
    const seen = [];
    element.on("analytics", (allowed) => seen.push(allowed));
    element.addEventListener("consent-change", (event) => {
      if (event.detail?.choices.analytics) element.setConsent({ analytics: false });
    });
    // When
    element.acceptAll();
    // Then
    assert.equal(element.hasConsent("analytics"), false);
    assert.deepEqual(seen, [false, true, false]);
    assert.deepEqual(
      [...window.dataLayer.at(-1)],
      ["consent", "update", { analytics_storage: "denied" }],
    );
  });

  it("ends denied when an on() callback denies analytics while being notified", () => {
    // Given
    const element = mount();
    setupGoogleAnalytics(element, "G-ABC");
    const seen = [];
    element.on("analytics", (allowed) => {
      if (allowed) element.setConsent({ analytics: false });
    });
    element.on("analytics", (allowed) => seen.push(allowed));
    // When
    element.acceptAll();
    // Then
    assert.equal(element.hasConsent("analytics"), false);
    // The denying callback runs first; the later listener never sees the stale grant.
    assert.deepEqual(seen, [false]);
    assert.deepEqual(
      [...window.dataLayer.at(-1)],
      ["consent", "update", { analytics_storage: "denied" }],
    );
  });
});

describe("setupGoogleAnalytics", () => {
  const ID = "G-ABC123";
  const gaScript = () => document.querySelector('script[src*="googletagmanager.com/gtag/js"]');

  it("loads the script only after analytics consent and accepts the element", () => {
    // Given
    const element = mount();
    const stop = setupGoogleAnalytics(element, ID);
    assert.equal(gaScript(), null);
    // When
    element.setConsent({ analytics: true });
    // Then
    assert.equal(gaScript().src, `https://www.googletagmanager.com/gtag/js?id=${ID}`);
    stop();
  });

  it("deletes Google Analytics cookies when analytics consent is revoked", () => {
    // Given
    const element = mount();
    setupGoogleAnalytics(element, ID);
    element.setConsent({ analytics: true });
    document.cookie = "_ga=1; path=/";
    document.cookie = "_ga_ABC123=1; path=/";
    document.cookie = "other=1; path=/";
    // When
    element.setConsent({ analytics: false });
    // Then
    assert.equal(document.cookie, "other=1");
  });

  it("rejects an invalid measurement ID and a missing manager", () => {
    assert.throws(
      () => setupGoogleAnalytics(mount(), "UA-1"),
      /valid Google Analytics measurement ID/,
    );
    assert.throws(() => setupGoogleAnalytics(null, ID), /expects a cookie consent manager/);
  });
});

describe("build output", () => {
  /**
   * Read a built file from dist.
   *
   * @param {string} file
   * @returns {Promise<string>}
   */
  const readDist = (file) =>
    readFile(
      new URL(`../../../dist/webcomponents/cookie-consent/${file}`, import.meta.url),
      "utf8",
    );

  it.each(["nodula-cookie-consent.js", "nodula-cookie-consent.iife.js"])(
    "%s is self-contained",
    async (file) => {
      // When
      const text = await readDist(file);
      // Then
      assert.doesNotMatch(text, /nodula-framework/);
      assert.doesNotMatch(text, /\.\/nodula-core\.js/);
      assert.doesNotMatch(text, /^\s*import[\s{]/m);
    },
  );

  it("the IIFE registers the element, survives a second load, and exposes the API", async () => {
    // Given a page that has not defined the element yet
    const code = await readDist("nodula-cookie-consent.iife.js");
    const page = new Window({ url: "http://localhost/" });
    try {
      // When
      page.eval(code);
      // Then
      assert.ok(page.customElements.get("nodula-cookie-consent"));
      assert.equal(page.eval("typeof NodulaCookieConsent.setupGoogleAnalytics"), "function");
      assert.equal(page.eval("typeof NodulaCookieConsent.defineCookieConsentElement"), "function");
      assert.doesNotThrow(() => page.eval(code));
      const element = page.document.createElement("nodula-cookie-consent");
      page.document.body.append(element);
      assert.ok(element.querySelector(".ui-cookie-consent__banner"));
    } finally {
      await page.happyDOM.close();
    }
  });
});
