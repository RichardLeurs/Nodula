import type { Accessor } from "nodula-framework";

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

export interface CookieConsentOptions {
  /** Policy/category version. Changing it asks visitors for consent again. Defaults to `1.0`. */
  version?: string;
  /** localStorage key. Defaults to `nodula-cookie-consent`. */
  storageKey?: string;
  /** Optional Storage implementation; defaults to window.localStorage. */
  storage?: Storage | null;
  /** Responsible site or organisation name. Defaults to the current hostname. */
  siteName?: string;
  /** Specific summary of why the site uses cookies or similar technologies. */
  description?: string;
  /** Optional decorative image displayed to the left of the banner content. Accepts a relative or HTTP(S) URL. */
  image?: string;
  /** Optional privacy-policy link. */
  privacyPolicyUrl?: string;
  /** Override built-in categories by id or add optional categories; all start denied until explicitly selected. */
  categories?: CookieConsentCategory[];
  /** Show the Analytics preference checkbox. Defaults to `true`. Hidden categories remain unconsented. */
  showAnalytics?: boolean;
  /** Show the Personalisation preference checkbox. Defaults to `true`. Hidden categories remain unconsented. */
  showPersonalization?: boolean;
  /** Show the Marketing preference checkbox. Defaults to `true`. Hidden categories remain unconsented. */
  showMarketing?: boolean;
  /** Show the floating settings button after a consent decision. Defaults to `true`. */
  showSettingsButton?: boolean;
  /** Override all built-in consent UI text. Category keys override built-in category copy. */
  labels?: CookieConsentLabels;
}

export interface CookieConsent {
  element: HTMLElement;
  /** Read current accepted record, or null before valid consent. */
  consent: Accessor<CookieConsentRecord | null>;
  getConsent: () => CookieConsentRecord | null;
  /** Necessary storage is always allowed; optional categories are false until explicitly accepted. */
  hasConsent(category: string): boolean;
  /** Save explicit choices; omitted optional categories are treated as false. */
  setConsent(choices?: Record<string, boolean>): CookieConsentRecord;
  acceptAll(): CookieConsentRecord;
  rejectNonEssential(): CookieConsentRecord;
  /** Clear stored decision and show the first-layer notice again. */
  revokeConsent(): void;
  /** Register a new opt-in category; returns a function that removes that category. */
  registerCategory(category: CookieConsentCategory): () => void;
  /** Call with whether category is allowed, initially and whenever that permission changes. */
  on(
    category: string,
    callback: (allowed: boolean, consent: CookieConsentRecord | null) => void,
  ): () => void;
  openSettings(): void;
  close(): void;
}

/** Queue Google consent defaults and load the tag only while analytics consent is granted. */
export function setupGoogleAnalytics(consent: CookieConsent, measurementId: string): () => void;

/** Create a bottom-floating consent notice and localStorage-backed consent manager. */
export function createCookieConsent(options?: CookieConsentOptions): CookieConsent;
