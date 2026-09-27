export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

/** Identity returned by the app-provided authentication adapter. Session values are opaque to Nodula. */
export interface AuthIdentity<User, Session = unknown> {
  user: User;
  session?: Session;
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
): AuthController<Credentials, User, Session>;