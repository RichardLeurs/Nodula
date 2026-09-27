import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createAuth } from '../dist/framework/nodula-auth.js';

describe('Nodula auth add-on', () => {
  it('initializes a signed-out state through the supplied adapter', async () => {
    const auth = createAuth({
      async getSession() { return null; },
      async signIn() { throw new Error('not used'); },
      async signOut() {},
    });

    assert.equal(auth.status(), 'idle');
    assert.equal(auth.isAuthenticated(), false);
    assert.equal(await auth.initialize(), null);
    assert.equal(auth.status(), 'unauthenticated');
    assert.equal(auth.user(), null);
    assert.equal(auth.error(), null);
  });

  it('delegates sign-in, exposes reactive identity, and delegates sign-out', async () => {
    const calls = [];
    const identity = { user: { id: 'user-1', name: 'Ada' }, session: { id: 'session-1' } };
    const auth = createAuth({
      async getSession() { return identity; },
      async signIn(credentials) { calls.push(['signIn', credentials]); return identity; },
      async signOut(session) { calls.push(['signOut', session]); },
    });

    assert.equal(await auth.initialize(), identity);
    assert.equal(auth.isAuthenticated(), true);
    assert.equal(auth.user(), identity.user);
    assert.deepEqual(auth.session(), identity.session);

    await auth.signIn({ email: 'ada@example.test', password: 'example-only' });
    assert.deepEqual(calls[0], ['signIn', { email: 'ada@example.test', password: 'example-only' }]);

    await auth.signOut();
    assert.deepEqual(calls[1], ['signOut', identity.session]);
    assert.equal(auth.status(), 'unauthenticated');
    assert.equal(auth.isAuthenticated(), false);
    assert.equal(auth.user(), null);
    assert.equal(auth.session(), undefined);
  });

  it('supports optional adapter-driven session refresh', async () => {
    let refreshCalls = 0;
    const auth = createAuth({
      async getSession() { return { user: { id: 1 }, session: 'old' }; },
      async signIn() { return { user: { id: 1 }, session: 'old' }; },
      async signOut() {},
      async refreshSession(session) {
        refreshCalls += 1;
        assert.equal(session, 'old');
        return { user: { id: 1 }, session: 'new' };
      },
    });

    await auth.initialize();
    const refreshed = await auth.refresh();
    assert.equal(refreshCalls, 1);
    assert.equal(refreshed.session, 'new');
    assert.equal(auth.session(), 'new');
  });

  it('tracks adapter errors without discarding a previously authenticated identity', async () => {
    const identity = { user: { id: 1 }, session: 'session' };
    const auth = createAuth({
      async getSession() { return identity; },
      async signIn() { throw new Error('Credentials rejected'); },
      async signOut() {},
    });

    await auth.initialize();
    await assert.rejects(auth.signIn({}), /Credentials rejected/);
    assert.equal(auth.status(), 'authenticated');
    assert.equal(auth.user(), identity.user);
    assert.match(auth.error().message, /Credentials rejected/);
  });

  it('validates the adapter contract and rejects malformed identities', async () => {
    assert.throws(() => createAuth(), /adapter object/);
    assert.throws(() => createAuth({}), /adapter.getSession/);

    const auth = createAuth({
      async getSession() { return { session: 'missing-user' }; },
      async signIn() { return { user: { id: 1 } }; },
      async signOut() {},
    });
    await assert.rejects(auth.initialize(), /must return an identity/);
    assert.equal(auth.status(), 'unauthenticated');
  });

  it('does not let an older async result overwrite a newer auth operation', async () => {
    let resolveSignIn;
    const auth = createAuth({
      async getSession() { return null; },
      signIn() { return new Promise((resolve) => { resolveSignIn = resolve; }); },
      async signOut() {},
    });
    const pendingSignIn = auth.signIn({});
    await auth.signOut();
    resolveSignIn({ user: { id: 1 }, session: 'late' });
    await pendingSignIn;

    assert.equal(auth.status(), 'unauthenticated');
    assert.equal(auth.user(), null);
  });
});