import { signal } from 'nodula-framework';

function requireIdentity(identity, methodName) {
  if (!identity || typeof identity !== 'object' || !Object.hasOwn(identity, 'user') || identity.user == null) {
    throw new TypeError(`Auth adapter ${methodName} must return an identity with a user, or null.`);
  }
  return identity;
}

/** Create reactive client-side auth state backed by authentication methods supplied by the app. */
export function createAuth(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError('createAuth expects an adapter object.');
  }
  for (const method of ['getSession', 'signIn', 'signOut']) {
    if (typeof adapter[method] !== 'function') {
      throw new TypeError(`createAuth expects adapter.${method} to be a function.`);
    }
  }

  const [status, setStatus] = signal('idle');
  const [user, setUser] = signal(null);
  const [session, setSession] = signal(undefined);
  const [error, setError] = signal(null);
  let operationId = 0;

  function setIdentity(identity) {
    if (identity === null) {
      setUser(null);
      setSession(undefined);
      setStatus('unauthenticated');
      return;
    }

    setUser(identity.user);
    setSession(identity.session);
    setStatus('authenticated');
  }

  async function run(operation, onSuccess) {
    const currentOperation = ++operationId;
    setStatus('loading');
    setError(null);

    try {
      const result = await operation();
      if (currentOperation === operationId) onSuccess(result);
      return result;
    } catch (cause) {
      if (currentOperation === operationId) {
        setError(cause instanceof Error ? cause : new Error(String(cause)));
        setStatus(user() === null ? 'unauthenticated' : 'authenticated');
      }
      throw cause;
    }
  }

  async function initialize() {
    return run(async () => {
      const identity = await adapter.getSession();
      return identity === null ? null : requireIdentity(identity, 'getSession');
    }, setIdentity);
  }

  async function signIn(credentials) {
    return run(async () => requireIdentity(await adapter.signIn(credentials), 'signIn'), setIdentity);
  }

  async function signOut() {
    return run(async () => {
      await adapter.signOut(session());
      return null;
    }, setIdentity);
  }

  async function refresh() {
    if (typeof adapter.refreshSession !== 'function') {
      throw new Error('This auth adapter does not provide refreshSession.');
    }
    return run(async () => {
      const identity = await adapter.refreshSession(session());
      return identity === null ? null : requireIdentity(identity, 'refreshSession');
    }, setIdentity);
  }

  return {
    status,
    isAuthenticated: () => status() === 'authenticated',
    user,
    session,
    error,
    initialize,
    signIn,
    signOut,
    refresh,
  };
}