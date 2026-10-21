// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Script-tag entry: registers <nodula-cookie-consent> as soon as the script runs. */
import { defineCookieConsentElement, setupGoogleAnalytics } from "./element.js";

// Loading the script twice, or next to the ES module build, must not throw.
if (!customElements.get("nodula-cookie-consent")) defineCookieConsentElement();

export { defineCookieConsentElement, setupGoogleAnalytics };
