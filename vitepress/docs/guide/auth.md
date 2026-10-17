# Authentication, Roles, and Permissions

The optional `nodula-framework/auth` add-on keeps authentication state reactive while delegating credential checks and session operations to an adapter supplied by your application. It adds no server, identity provider, credential storage, or authorization enforcement; applications that do not need this state controller can omit the separate package entry.

## Install and import

```js
import { createAuth } from 'nodula-framework/auth';
```

No plugin or stylesheet is required. Provide an adapter that connects to your existing authentication service.

## Quick start

```js
import { createAuth } from 'nodula-framework/auth';

const auth = createAuth({
  async getSession() {
    return await sessionService.getCurrentIdentity(); // identity or null
  },
  async signIn(credentials) {
    return await sessionService.signIn(credentials); // identity with user
  },
  async signOut(session) {
    await sessionService.signOut(session);
  },
  async refreshSession(session) {
    return await sessionService.refresh(session); // identity or null
  },
}, {
  rolePermissions: {
    editor: ['articles:read', 'articles:write'],
    admin: ['articles:read', 'articles:write', 'users:manage'],
  },
});

await auth.initialize();
if (auth.isAuthenticated()) console.log(`Signed in as ${auth.user().name}`);
```

The `sessionService` above represents application-owned service methods; Nodula does not provide it. Replace it with calls to your authentication backend or identity provider. Adapter methods are asynchronous and return identities shaped like `{ user, session? }`, or `null` from `getSession()` / `refreshSession()` when no valid session exists. The session value is opaque to Nodula.

## Adapter and identity

Required adapter methods:

| Method | Contract |
|---|---|
| `getSession()` | Resolve current identity or `null` during initialization. |
| `signIn(credentials)` | Resolve an identity containing a non-null `user` after successful sign-in. |
| `signOut(session)` | End the application-managed session; receives current session or `undefined`. |

Optional method:

| Method | Contract |
|---|---|
| `refreshSession(session)` | Resolve a refreshed identity or `null` if the session is no longer valid. Called through `auth.refresh()`. |

The adapter returns an identity containing a `user` and optionally a `session`. Roles and direct permissions are fields on the user object:

```js
{
  user: {
    id: 'user-123',
    role: 'admin',
    roles: ['editor', 'reviewer'],
    permissions: ['billing:read'],
  },
  session: { /* opaque, app-owned session data */ },
}
```

`role` is a convenient single-role field; `roles` supports multiple roles. Both may be used. `permissions` grants direct user-specific permissions. The optional `rolePermissions` map grants permissions to each configured role; direct and role-derived permissions are combined.

## API reference

### `createAuth<Credentials, User, Session = unknown>(adapter, options?)`

Creates an auth controller. `User` and `Session` are application-defined types; session values are passed to adapter methods but are not interpreted by Nodula.

| Option | Type | Default | Description |
|---|---|---|---|
| `rolePermissions` | `Readonly<Record<string, readonly string[]>>` | `{}` | Permission names granted to each role. |

Returned `AuthController` API:

| Member | Type / return | Behavior |
|---|---|---|
| `status()` | `'idle' \| 'loading' \| 'authenticated' \| 'unauthenticated'` | Reactive lifecycle state. |
| `isAuthenticated()` | `boolean` | True only while status is `authenticated`. |
| `user()` | `User \| null` | Current authenticated user, or `null`. |
| `session()` | `Session \| undefined` | Opaque current session value, if supplied. |
| `error()` | `Error \| null` | Most recent failed operation error; cleared when a new operation starts. |
| `initialize()` | `Promise<AuthIdentity \| null>` | Calls `adapter.getSession()` and restores signed-in or signed-out state. |
| `signIn(credentials)` | `Promise<AuthIdentity>` | Delegates credentials to adapter and stores returned identity. |
| `signOut()` | `Promise<null>` | Calls `adapter.signOut(currentSession)` and clears identity on success. `hasRole` and `hasPermission` return `false` as soon as sign-out starts, not only after it finishes. |
| `refresh()` | `Promise<AuthIdentity \| null>` | Calls optional `adapter.refreshSession(currentSession)`. Rejects if adapter does not implement it. |
| `hasRole(role)` | `boolean` | Checks `user.role` and string entries in `user.roles`; false while unauthenticated or for non-string input. |
| `hasPermission(permission)` | `boolean` | Checks string entries in `user.permissions` and configured permissions for user's roles; false while unauthenticated or for non-string input. |

The package also exports TypeScript types `AuthStatus`, `AuthIdentity<User, Session>`, `AuthRolePermissions`, `AuthOptions`, `AuthAdapter<Credentials, User, Session>`, and `AuthController<Credentials, User, Session>`.

## State, errors, and lifecycle

- A new controller starts with `status() === 'idle'`, `user() === null`, `session() === undefined`, and `error() === null`.
- Each `initialize()`, `signIn()`, `signOut()`, and supported `refresh()` operation sets status to `loading` and clears the previous error. Successful identity results update user, session, and status. A `null` result from initialization or refresh sets `unauthenticated` and clears identity.
- Adapter failures are rethrown to the caller and exposed through `error()`. If an operation fails while a user is already present, the controller retains that identity and returns to `authenticated`; otherwise it returns to `unauthenticated`.
- Overlapping operations are allowed. Only the latest-started operation updates controller state; earlier promises still settle for their callers but cannot overwrite newer state.
- `hasRole()` and `hasPermission()` derive their result from reactive controller state, so they can be read from `effect()` callbacks or reactive template expressions.
- There is no controller-level `dispose()` method. Scope controller creation to the application boundary where its identity state belongs.

Invalid adapter/options configuration throws `TypeError` during creation. The adapter must provide `getSession`, `signIn`, and `signOut` functions; `rolePermissions` must map role names to arrays of permission strings. A non-null identity must be an object with its own non-null `user` property, or the operation rejects with `TypeError`.

## Check access in the UI

The controller exposes reactive `hasRole(role)` and `hasPermission(permission)` checks:

```js
if (auth.hasRole('admin')) {
  // Show administrator-only UI.
}

if (auth.hasPermission('articles:write')) {
  // Show the article editing action.
}
```

The checks return `false` until the user is authenticated and whenever the user is signed out. Because they read the reactive user and status signals, they can also be used in effects or template expressions.

Catch operation failures when the UI needs to display an error. Both the rejected promise and `auth.error()` expose the adapter failure:

```js
try {
  await auth.signIn({ email, password });
} catch (error) {
  showSignInError(auth.error()?.message ?? String(error));
}
```

## Errors, limitations, and security

The add-on is a client-side state controller, not an authentication system. It does not hash or validate passwords, persist credentials, issue or protect tokens, create sessions, or refresh them automatically. Implement those responsibilities in the adapter and your trusted authentication service. Avoid placing long-lived secrets in browser-accessible state. All role and permission helpers, hidden controls, and client-side route guards are presentation aids only. The server must independently authenticate each request and authorize every protected operation; never trust a client-supplied role, permission, or session value.

## Related resources

- The demo uses a deliberately in-memory, non-production adapter in `demo_app/src/demo-auth.js`; it demonstrates UI state only, not secure authentication.
- See [Security](/guide/security) for application security guidance and [Routing](/guide/routing) for route guards.
- Auth behavior tests: `framework/vitest/auth.test.js`.
