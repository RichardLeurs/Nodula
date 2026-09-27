import { createAuth } from 'nodula-framework/auth';

/* Demo-only adapter: this deliberately demonstrates client state, not real authentication. */
export const demoAuth = createAuth({
  async getSession() {
    return null;
  },
  async signIn(credentials) {
    if (credentials?.demoAdmin !== true) throw new Error('Use the demo administrator sign-in button.');
    return {
      user: { id: 'demo-admin', name: 'Demo Administrator', role: 'admin' },
      session: { kind: 'in-memory-demo-session' },
    };
  },
  async signOut() {},
});

let initialization;

export function initializeDemoAuth() {
  initialization ??= demoAuth.initialize();
  return initialization;
}

export async function protectDemoAdminRoute({ to }) {
  await initializeDemoAuth();
  if (to === '/admin' && (!demoAuth.isAuthenticated() || demoAuth.user()?.role !== 'admin')) return '/login';
  if (to === '/login' && demoAuth.isAuthenticated()) return '/admin';
  return true;
}

export async function signOutDemoAdmin() {
  await demoAuth.signOut();
  return '/login';
}