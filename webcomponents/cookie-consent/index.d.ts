export interface CookieConsentCategory {
  id: string;
  label: string;
  description: string;
}

export interface CookieConsentRecord {
  version: string;
  necessary: true;
  choices: Record<string, boolean>;
  timestamp: string;
}

export interface CookieConsentLabels {
  consent?: string;
  title?: string;
  bannerDescription?: string;
  preferences?: string;
  necessary?: string;
  necessaryDescription?: string;
  analytics?: string;
  analyticsDescription?: string;
  personalization?: string;
  personalizationDescription?: string;
  marketing?: string;
  marketingDescription?: string;
  btn_acceptAll?: string;
  btn_reject?: string;
  btn_manage?: string;
  btn_save?: string;
  btn_cancel?: string;
  btn_settings?: string;
  privacyPolicy?: string;
}

/** Anything with a category subscription method: the element, or a consent manager. */
export interface CookieConsentSource {
  /** Call with whether category is allowed, initially and whenever that permission changes. */
  on(
    category: string,
    callback: (allowed: boolean, consent: CookieConsentRecord | null) => void,
  ): () => void;
}

/**
 * The `<nodula-cookie-consent>` element. Attributes and properties are read when its manager is
 * created, and re-read only after the element has been out of the document for a microtask
 * (e.g. `await Promise.resolve()` between remove and append). Removing and appending in the same
 * task keeps the existing manager and old options. Methods keep working until that microtask and
 * throw "not connected" after it (except `openSettings`, which does nothing).
 */
export interface CookieConsentElement extends HTMLElement, CookieConsentSource {
  /** Extra categories (or the `categories` JSON attribute). */
  categories?: CookieConsentCategory[];
  /** Label overrides (or the `labels` JSON attribute). */
  labels?: CookieConsentLabels;
  /** Optional Storage; `null` keeps the decision in memory. Defaults to window.localStorage. */
  storage?: Storage | null;
  openSettings(): void;
  getConsent(): CookieConsentRecord | null;
  hasConsent(category: string): boolean;
  setConsent(choices?: Record<string, boolean>): CookieConsentRecord | null;
  acceptAll(): CookieConsentRecord | null;
  rejectNonEssential(): CookieConsentRecord | null;
  /** Clear stored decision and show the first-layer notice again. */
  revokeConsent(): void;
  /** Register a new opt-in category; returns a function that removes that category. */
  registerCategory(category: CookieConsentCategory): () => void;
  addEventListener(
    type: "consent-change",
    listener: (event: CustomEvent<CookieConsentRecord | null>) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
}

/**
 * Register the element (default tag `nodula-cookie-consent`). Safe to call twice; throws when the
 * tag name belongs to another class.
 */
export function defineCookieConsentElement(tagName?: string): CookieConsentElementConstructor;

/** Constructor of the `<nodula-cookie-consent>` element class. */
export interface CookieConsentElementConstructor {
  new (): CookieConsentElement;
  prototype: CookieConsentElement;
}

declare global {
  interface HTMLElementTagNameMap {
    "nodula-cookie-consent": CookieConsentElement;
  }
}

/** Queue Google consent defaults and load the tag only while analytics consent is granted. */
export function setupGoogleAnalytics(
  consent: CookieConsentSource,
  measurementId: string,
): () => void;
