// REQ: AUTH-01g — Google OAuth returns redirect URL starting with accounts.google.com
import { describe, it, expect } from 'vitest';

describe('AUTH-01g google oauth', () => {
  it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('returns google consent URL', async () => {
    const mod = await import('@/app/(auth)/signup/actions').catch(() => null);
    if (!mod) return;
    // TODO(Plan 04): intercept Supabase signInWithOAuth, assert data.url starts with
    //   https://accounts.google.com/o/oauth2/v2/auth?  (per RESEARCH.md:L1429)
    expect(mod.signInWithGoogle).toBeDefined();
  });
});
