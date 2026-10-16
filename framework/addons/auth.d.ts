export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

/** Identity returned by the app-provided authentication adapter. Session values are opaque to Nodula. */
export interface AuthIdentity<User, Session = unknown> {
  user: User;
  session?: Session;
}

/** Optional permissions granted to users who have each named role. */
export type AuthRolePermissions = Readonly<Record<string, readonly string[]>>;

export interface AuthOptions {
  /** Map roles to permissions; direct user permissions are also recognized. */
  rolePermissions?: AuthRolePermissions;
}

/** App-owned functions that connect Nodula Auth state to the app's auth service. */
export interface AuthAdapter<Credentials, User, Session = unknown> {
  /** Restore/check the current server-managed session; return null when signed out. */
  getSession(): Promise<AuthIdentity<User, Session> | null>;
  /** Send credentials to the app's auth service and return its authenticated identity. */
  signIn(credentials: Credentials): Promise<AuthIdentity<User, Session>>;
  /** Revoke/end the app's current server-managed session. */
  signOut(session: Session | undefined): Promise<void>;
  /** Optionally renew/check the current session; return null when it is no longer valid. */
  refreshSession?(session: Session | undefined): Promise<AuthIdentity<User, Session> | null>;
}

export interface AuthController<Credentials, User, Session = unknown> {
  readonly status: () => AuthStatus;
  readonly isAuthenticated: () => boolean;
  /** Check string `user.role` or string entries in `user.roles`. */
  readonly hasRole: (role: string) => boolean;
  /** Check string entries in `user.permissions` or permissions granted by configured roles. */
  readonly hasPermission: (permission: string) => boolean;
  readonly user: () => User | null;
  readonly session: () => Session | undefined;
  readonly error: () => Error | null;
  initialize(): Promise<AuthIdentity<User, Session> | null>;
  signIn(credentials: Credentials): Promise<AuthIdentity<User, Session>>;
  signOut(): Promise<null>;
  refresh(): Promise<AuthIdentity<User, Session> | null>;
}

/** Manage reactive client-side auth state using an app-supplied adapter; Nodula does not authenticate users or provide a server. */
export function createAuth<Credentials, User, Session = unknown>(
  adapter: AuthAdapter<Credentials, User, Session>,
  options?: AuthOptions,
): AuthController<Credentials, User, Session>;
