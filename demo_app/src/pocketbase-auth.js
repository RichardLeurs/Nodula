// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { DataError } from "nodula-framework/data";

/** Refresh the token when it expires within this many milliseconds, so a request does not start with a dying token. */
const REFRESH_MARGIN_MS = 60_000;
/** Lifetime in seconds assumed for a token when the server does not send a usable `expiresAt`. */
const DEFAULT_TOKEN_LIFETIME_SECONDS = 3600;

/**
 * Check that a value is a non-empty string.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
const isFilled = (value) => typeof value === "string" && value.trim() !== "";

/**
 * Create a token source for the PocketBase demo.
 *
 * The browser POSTs `tokenUrl` (the PHP endpoint, which holds the PocketBase credentials) and receives
 * `{ token, expiresAt }`. The token is sent as the raw `Authorization` header, so pass `getToken` to
 * `createPocketBaseAdapter`. The token is kept in memory only, never in localStorage.
 *
 * @param {object} options
 * @param {string} options.tokenUrl URL of the server endpoint that returns `{ token, expiresAt }` (POST).
 * @param {typeof fetch} [options.fetcher] Fetch-compatible transport, default `fetch`.
 * @returns {{ getToken: () => Promise<string> }} Token source; `getToken` gives a token that is fresh enough to use.
 * @throws {TypeError} When `tokenUrl` is not a non-empty string.
 */
export function createPocketBaseTokenSource({ tokenUrl, fetcher = fetch } = {}) {
  if (!isFilled(tokenUrl))
    throw new TypeError("createPocketBaseTokenSource expects tokenUrl to be a non-empty string.");
  let held = null;
  let pending = null;

  /**
   * Ask the server for a new token and hold it.
   *
   * @returns {Promise<string>} The new token.
   * @throws {DataError} When the server answers with a non-success status.
   * @throws {Error} When the server answers successfully but without a string token.
   */
  async function fetchToken() {
    const response = await fetcher(tokenUrl, { method: "POST" });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new DataError(response, body);
    if (!isFilled(body?.token))
      throw new Error("The PocketBase token endpoint did not return a token.");
    // A missing or garbled expiry would make every request refetch the token, or never refetch it.
    const expiresAt = Number.isFinite(body.expiresAt)
      ? body.expiresAt * 1000
      : Date.now() + DEFAULT_TOKEN_LIFETIME_SECONDS * 1000;
    held = { token: body.token, expiresAt };
    return body.token;
  }

  /**
   * Return a token, fetching a new one when none is held or the held one is close to expiry.
   *
   * Concurrent calls share one request. A failed request is not remembered, so the next call tries again.
   * Use it as `getToken: tokenSource.getToken`.
   *
   * @returns {Promise<string>} The token.
   * @throws {DataError} When the server rejects the request; the error is passed through.
   */
  async function getToken() {
    if (held && held.expiresAt - Date.now() > REFRESH_MARGIN_MS) return held.token;
    pending ??= fetchToken().finally(() => {
      pending = null;
    });
    return pending;
  }

  return { getToken };
}
