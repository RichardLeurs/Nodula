// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { createAuth } from "nodula-framework/auth";
import { createDataClient } from "nodula-framework/data";

/** Refresh the ID token when it expires within this many milliseconds, so a request does not start with a dying token. */
const REFRESH_MARGIN_MS = 60_000;
/** Firebase Auth REST endpoint that exchanges a custom token for an ID token. */
const CUSTOM_TOKEN_EXCHANGE_URL =
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken";
/** Lifetime in seconds assumed for an ID token when Firebase does not send a usable `expiresIn`. */
const DEFAULT_ID_TOKEN_LIFETIME_SECONDS = 3600;
/** The refresh in progress for each auth instance, so parallel requests share one token exchange. */
const pendingRefreshes = new WeakMap();

/**
 * Check that a value is a non-empty string.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
const isFilled = (value) => typeof value === "string" && value.trim() !== "";

/**
 * Exchange the custom token from the server for a Firebase ID token.
 *
 * The web API key is public; it only identifies the Firebase project. The custom token is the credential.
 *
 * @param {ReturnType<typeof createDataClient>} client
 * @param {string} apiKey
 * @param {string} customToken
 * @returns {Promise<{ idToken: string, expiresAt: number, localId: string }>}
 * @throws {Error} When Firebase does not return an ID token.
 */
async function exchangeCustomToken(client, apiKey, customToken) {
  const url = `${CUSTOM_TOKEN_EXCHANGE_URL}?key=${encodeURIComponent(apiKey)}`;
  const body = await client.post(url, { token: customToken, returnSecureToken: true });
  if (!isFilled(body?.idToken))
    throw new Error("Firebase did not return an ID token for the custom token.");
  // A NaN expiry would make every request think the token is stale and refresh it again.
  const lifetime = Number(body.expiresIn);
  const seconds =
    Number.isFinite(lifetime) && lifetime > 0 ? lifetime : DEFAULT_ID_TOKEN_LIFETIME_SECONDS;
  return {
    idToken: body.idToken,
    expiresAt: Date.now() + seconds * 1000,
    localId: body.localId,
  };
}

/**
 * Create a Firebase auth controller for the demo.
 *
 * The browser asks `tokenUrl` (the PHP endpoint, which holds the service-account key) for a short-lived custom token,
 * then exchanges it for a Firebase ID token. Sessions are kept in memory only, never in localStorage.
 *
 * @param {object} options
 * @param {string} options.tokenUrl URL of the server endpoint that returns `{ customToken, expiresIn }` (POST).
 * @param {string} options.apiKey Firebase web API key of the project.
 * @param {typeof fetch} [options.fetcher] Fetch-compatible transport, default `fetch`.
 * @returns {ReturnType<typeof createAuth>} Auth controller whose session is `{ token, expiresAt }`.
 * @throws {TypeError} When `tokenUrl` or `apiKey` is not a non-empty string.
 */
export function createFirebaseAuth({ tokenUrl, apiKey, fetcher = fetch } = {}) {
  if (!isFilled(tokenUrl))
    throw new TypeError("createFirebaseAuth expects tokenUrl to be a non-empty string.");
  if (!isFilled(apiKey))
    throw new TypeError("createFirebaseAuth expects apiKey to be a non-empty string.");
  const client = createDataClient({ fetcher });
  let held = null;

  /**
   * Get a new custom token from the server, exchange it, and hold the resulting identity.
   *
   * @returns {Promise<{ user: { id: string }, session: { token: string, expiresAt: number } }>}
   */
  async function signInWithServer() {
    const { customToken } = (await client.post(tokenUrl)) ?? {};
    if (!isFilled(customToken))
      throw new Error("The Firebase token endpoint did not return a customToken.");
    const { idToken, expiresAt, localId } = await exchangeCustomToken(client, apiKey, customToken);
    held = { user: { id: localId }, session: { token: idToken, expiresAt } };
    return held;
  }

  return createAuth({
    /**
     * The held in-memory identity, or null when no sign-in has happened in this page load.
     *
     * @returns {Promise<object | null>}
     */
    async getSession() {
      return held;
    },
    /**
     * Sign in by fetching a custom token from the server. The credentials are not used.
     *
     * @returns {Promise<object>}
     */
    signIn: signInWithServer,
    /**
     * Forget the held session. Firebase ID tokens expire on their own, so nothing is revoked remotely.
     *
     * @returns {Promise<void>}
     */
    async signOut() {
      held = null;
    },
    /**
     * Replace the session with a new one from the server. The previous session is kept until this succeeds.
     *
     * @returns {Promise<object>}
     */
    refreshSession: signInWithServer,
  });
}

/**
 * Return a Firebase ID token for a request, refreshing it first when it is missing or close to expiry.
 *
 * Concurrent calls share one refresh, so a page that sends two requests at once makes one token exchange. Use it as
 * `getToken: () => getFirebaseToken(auth)`.
 *
 * @param {ReturnType<typeof createFirebaseAuth>} auth Auth controller from `createFirebaseAuth`.
 * @returns {Promise<string | null | undefined>} The ID token, or undefined when the refresh returned no session.
 * @throws {Error} When the server or Firebase rejects the refresh; the error is passed through.
 */
export async function getFirebaseToken(auth) {
  const session = auth.session();
  if (session && session.expiresAt - Date.now() > REFRESH_MARGIN_MS) return session.token;

  let refresh = pendingRefreshes.get(auth);
  if (!refresh) {
    refresh = auth.refresh().finally(() => pendingRefreshes.delete(auth));
    pendingRefreshes.set(auth, refresh);
  }
  // Read the token from the refresh result, not auth.session(): a newer refresh could replace the session first.
  const identity = await refresh;
  return identity?.session?.token;
}
