// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

import { createAuth } from "nodula-framework/auth";

let demoRouter;

/**
 * Give the demo auth helpers the router they navigate with. Called once when the app shell starts.
 *
 * @param {{ navigate(path: string): void }} router
 */
export function setDemoRouter(router) {
  demoRouter = router;
}

/**
 * Navigate the demo router to a path.
 *
 * @param {string} path
 * @throws {Error} If the router is not set yet.
 */
export function navigateDemoRoute(path) {
  if (!demoRouter) throw new Error("The demo router is not ready yet.");
  demoRouter.navigate(path);
}

/* Demo-only adapter: this deliberately demonstrates client state, not real authentication. */
export const demoAuth = createAuth({
  /**
   * Demo adapter: there is no session when the page loads.
   *
   * @returns {Promise<null>}
   */
  async getSession() {
    return null;
  },
  /**
   * Demo adapter: accepts only the demo administrator sign-in. The session is in memory and is not real authentication.
   *
   * @param {{ demoAdmin?: boolean }} credentials
   * @returns {Promise<object>} The demo administrator identity and session.
   * @throws {Error} For any other sign-in.
   */
  async signIn(credentials) {
    if (credentials?.demoAdmin !== true)
      throw new Error("Use the demo administrator sign-in button.");
    return {
      user: { id: "demo-admin", name: "Demo Administrator", role: "admin" },
      session: { kind: "in-memory-demo-session" },
    };
  },
  async signOut() {},
});

let initialization;

/**
 * Load the demo session once. Later calls return the same promise.
 *
 * @returns {Promise<object | null>}
 */
export function initializeDemoAuth() {
  initialization ??= demoAuth.initialize();
  return initialization;
}

/**
 * Route guard for the demo: sends visitors who are not the demo administrator from `/admin` to `/login`, and signed-in administrators away from `/login`.
 *
 * @param {{ to: string }} context Target route path.
 * @returns {Promise<true | string>} True to allow, or the path to redirect to.
 */
export async function protectDemoAdminRoute({ to }) {
  await initializeDemoAuth();
  if (to === "/admin" && (!demoAuth.isAuthenticated() || demoAuth.user()?.role !== "admin"))
    return "/login";
  if (to === "/login" && demoAuth.isAuthenticated()) return "/admin";
  return true;
}

/**
 * Sign out the demo administrator and return to the sign-in page.
 *
 * @returns {Promise<"/login">} The path to navigate to.
 */
export async function signOutDemoAdmin() {
  await demoAuth.signOut();
  return "/login";
}
