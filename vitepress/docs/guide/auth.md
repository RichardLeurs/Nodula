# Authentication, Roles, and Permissions

The optional `nodula-framework/auth` add-on keeps authentication state reactive and delegates authentication work to an adapter supplied by your application. The adapter remains responsible for checking credentials, loading the current session, and ending or refreshing that session.

## Create an auth controller

```
import { createAuth } from 'nodula-framework/auth';

export const auth = createAuth(authAdapter, {
  rolePermissions: {
    editor: ['articles:read', 'articles:write'],
    admin: ['articles:read', 'articles:write', 'users:manage'],
  },
});
```

The adapter returns an identity containing a `user` and optionally a `session`. Roles and direct permissions are fields on the user object:

```
{
  user: {
    id: 'user-123',
    role: 'admin',
    roles: ['editor', 'reviewer'],
    permissions: ['billing:read'],
  },
  session: { /* opaque app-owned session data */ },
}
```

`role` is a convenient single-role field; `roles` supports multiple roles. Both may be used. `permissions` grants direct user-specific permissions. The optional `rolePermissions` map grants permissions to each configured role; direct and role-derived permissions are combined.

## Check access in the UI

The controller exposes reactive `hasRole(role)` and `hasPermission(permission)` checks:

```
if (auth.hasRole('admin')) {
  // Show administrator-only UI.
}

if (auth.hasPermission('articles:write')) {
  // Show the article editing action.
}
```

The checks return `false` until the user is authenticated and whenever the user is signed out. Because they read the reactive user and status signals, they can also be used in effects or template expressions.

## Security boundary

These helpers are for client-side presentation and navigation only. A user can modify browser state or call an API directly. The server must independently validate the session and authorize every protected request; never treat `hasRole`, `hasPermission`, hidden controls, or route guards as a security boundary. See [Security](./security).
