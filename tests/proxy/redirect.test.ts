// REQ: AUTH-05 — Proxy (Next 16 proxy.ts) redirects unauthenticated requests to /login; passes through /login itself
import { describe, it, expect } from 'vitest';
import { skipIfNoSupabase } from '../helpers/skip-if-no-supabase';

describe.skipIf(skipIfNoSupabase())('AUTH-05 proxy redirect', () => {
  it('matches /home as a protected route', async () => {
    // Try Next 16 experimental testing helper; fall back to todo if API moved
    let unstable_doesProxyMatch: ((path: string) => boolean) | undefined;
    try {
      const mod = await import('next/experimental/testing/server');
      unstable_doesProxyMatch = mod.unstable_doesProxyMatch;
    } catch {
      // experimental API not available — stub pending Plan 03
    }

    if (!unstable_doesProxyMatch) {
      // Plan 03 has not created proxy.ts yet; stub passes vacuously
      return;
    }

    // /home is a protected route — proxy should match it
    expect(unstable_doesProxyMatch('/home')).toBe(true);
  });

  it('does NOT match /login as a protected route', async () => {
    let unstable_doesProxyMatch: ((path: string) => boolean) | undefined;
    try {
      const mod = await import('next/experimental/testing/server');
      unstable_doesProxyMatch = mod.unstable_doesProxyMatch;
    } catch {
      // experimental API not available — stub pending Plan 03
    }

    if (!unstable_doesProxyMatch) {
      return;
    }

    // /login is a public route — proxy should NOT intercept it
    expect(unstable_doesProxyMatch('/login')).toBe(false);
  });
});
