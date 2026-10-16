/* Provide adapter-backed reactive authentication state and access checks. */
import { signal } from "nodula-framework";

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

  function hasRole(role) {
    if (typeof role !== "string" || user() === null || status() !== "authenticated") return false;
    return getUserRoles(user()).has(role);
  }

  function hasPermission(permission) {
    if (typeof permission !== "string" || user() === null || status() !== "authenticated")
      return false;
    const identityUser = user();
    if (getUserPermissions(identityUser).has(permission)) return true;
    for (const role of getUserRoles(identityUser)) {
      if (rolePermissions.get(role)?.has(permission)) return true;
    }
    return false;
  }

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

  async function initialize() {
    return run(async () => {
      const identity = await adapter.getSession();
      return identity === null ? null : requireIdentity(identity, "getSession");
    }, setIdentity);
  }

  async function signIn(credentials) {
    return run(
      async () => requireIdentity(await adapter.signIn(credentials), "signIn"),
      setIdentity,
    );
  }

  async function signOut() {
    return run(async () => {
      await adapter.signOut(session());
      return null;
    }, setIdentity);
  }

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
