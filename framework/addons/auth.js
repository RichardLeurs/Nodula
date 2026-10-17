// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Provide adapter-backed reactive authentication state and access checks. */
import { signal } from "nodula-framework";

/**
 * Check that an adapter result is an identity with a user, or null.
 *
 * @param {unknown} identity Result of an adapter method.
 * @param {string} methodName Adapter method name, used in the error message.
 * @returns {object} The identity.
 * @throws {TypeError} If the result has no `user`, or `user` is null.
 */
function requireIdentity(identity, methodName) {
  if (
    !identity ||
    typeof identity !== "object" ||
    !Object.hasOwn(identity, "user") ||
    identity.user == null
  ) {
    throw new TypeError(`Auth adapter ${methodName} must return an identity with a user, or null.`);
  }
  return identity;
}

/**
 * Collect a user’s roles from `role` and `roles`. Non-string entries are ignored.
 *
 * @param {object} identityUser
 * @returns {Set<string>}
 */
function getUserRoles(identityUser) {
  const roles = new Set();
  if (typeof identityUser?.role === "string") roles.add(identityUser.role);
  if (Array.isArray(identityUser?.roles)) {
    for (const role of identityUser.roles) {
      if (typeof role === "string") roles.add(role);
    }
  }
  return roles;
}

/**
 * Collect a user’s direct permissions. Non-string entries are ignored.
 *
 * @param {object} identityUser
 * @returns {Set<string>}
 */
function getUserPermissions(identityUser) {
  if (!Array.isArray(identityUser?.permissions)) return new Set();
  return new Set(identityUser.permissions.filter((permission) => typeof permission === "string"));
}

/** Create reactive client-side auth state backed by authentication methods supplied by the app. */
export function createAuth(adapter, options = {}) {
  if (!adapter || typeof adapter !== "object") {
    throw new TypeError("createAuth expects an adapter object.");
  }
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("createAuth expects an options object.");
  }
  const configuredRolePermissions = options.rolePermissions ?? {};
  if (
    !configuredRolePermissions ||
    typeof configuredRolePermissions !== "object" ||
    Array.isArray(configuredRolePermissions)
  ) {
    throw new TypeError("createAuth options.rolePermissions must be a role-to-permissions object.");
  }
  const rolePermissions = new Map();
  for (const [role, permissions] of Object.entries(configuredRolePermissions)) {
    if (
      !Array.isArray(permissions) ||
      permissions.some((permission) => typeof permission !== "string")
    ) {
      throw new TypeError(
        `createAuth options.rolePermissions.${role} must be an array of permission strings.`,
      );
    }
    rolePermissions.set(role, new Set(permissions));
  }
  for (const method of ["getSession", "signIn", "signOut"]) {
    if (typeof adapter[method] !== "function") {
      throw new TypeError(`createAuth expects adapter.${method} to be a function.`);
    }
  }

  const [status, setStatus] = signal("idle");
  const [user, setUser] = signal(null);
  const [session, setSession] = signal(undefined);
  const [error, setError] = signal(null);
  let operationId = 0;

  // The known identity stays valid while a refresh is loading, so guards do not flicker to false.
  // Sign-out is the exception: access is revoked as soon as it starts.
  let signingOut = false;
  /**
   * Whether checks may treat the user as signed in.
   *
   * A refresh keeps the identity. Sign-out revokes it as soon as it starts.
   */
  function hasIdentity() {
    return user() !== null && !signingOut && (status() === "authenticated" || status() === "loading");
  }

  /**
   * Whether the current identity has a role.
   *
   * @param {string} role
   * @returns {boolean}
   */
  function hasRole(role) {
    if (typeof role !== "string" || !hasIdentity()) return false;
    return getUserRoles(user()).has(role);
  }

  /**
   * Whether the current identity has a permission, directly or through a role.
   *
   * @param {string} permission
   * @returns {boolean}
   */
  function hasPermission(permission) {
    if (typeof permission !== "string" || !hasIdentity()) return false;
    const identityUser = user();
    if (getUserPermissions(identityUser).has(permission)) return true;
    for (const role of getUserRoles(identityUser)) {
      if (rolePermissions.get(role)?.has(permission)) return true;
    }
    return false;
  }

  /**
   * Store an identity, or clear it when `identity` is null.
   *
   * @param {{ user: object, session?: unknown } | null} identity
   */
  function setIdentity(identity) {
    if (identity === null) {
      setUser(null);
      setSession(undefined);
      setStatus("unauthenticated");
      return;
    }

    setUser(identity.user);
    setSession(identity.session);
    setStatus("authenticated");
  }

  /**
   * Run an adapter operation and track its status. Only the newest operation updates state.
   *
   * @param {() => Promise<unknown>} operation
   * @param {(result: unknown) => void} onSuccess Applies a successful result.
   * @returns {Promise<unknown>} The operation result.
   */
  async function run(operation, onSuccess) {
    const currentOperation = ++operationId;
    setStatus("loading");
    setError(null);

    try {
      const result = await operation();
      if (currentOperation === operationId) onSuccess(result);
      return result;
    } catch (cause) {
      if (currentOperation === operationId) {
        setError(cause instanceof Error ? cause : new Error(String(cause)));
        setStatus(user() === null ? "unauthenticated" : "authenticated");
      }
      throw cause;
    }
  }

  /**
   * Load the current session through the adapter.
   *
   * @returns {Promise<object | null>}
   */
  async function initialize() {
    return run(async () => {
      const identity = await adapter.getSession();
      return identity === null ? null : requireIdentity(identity, "getSession");
    }, setIdentity);
  }

  /**
   * Sign in through the adapter.
   *
   * @param {unknown} credentials Passed to `adapter.signIn` unchanged.
   * @returns {Promise<object>}
   */
  async function signIn(credentials) {
    return run(
      async () => requireIdentity(await adapter.signIn(credentials), "signIn"),
      setIdentity,
    );
  }

  /**
   * Sign out through the adapter and clear the identity on success.
   *
   * Role and permission checks stop as soon as sign-out starts.
   *
   * @returns {Promise<null>}
   */
  async function signOut() {
    signingOut = true;
    try {
      return await run(async () => {
        await adapter.signOut(session());
        return null;
      }, setIdentity);
    } finally {
      signingOut = false;
    }
  }

  /**
   * Refresh the session through `adapter.refreshSession`. The previous identity is kept while loading.
   *
   * @returns {Promise<object | null>}
   * @throws {Error} If the adapter does not provide `refreshSession`.
   */
  async function refresh() {
    if (typeof adapter.refreshSession !== "function") {
      throw new Error("This auth adapter does not provide refreshSession.");
    }
    return run(async () => {
      const identity = await adapter.refreshSession(session());
      return identity === null ? null : requireIdentity(identity, "refreshSession");
    }, setIdentity);
  }

  return {
    status,
    isAuthenticated: () => status() === "authenticated",
    hasRole,
    hasPermission,
    user,
    session,
    error,
    initialize,
    signIn,
    signOut,
    refresh,
  };
}
