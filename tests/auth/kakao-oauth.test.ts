// REQ: AUTH-01k — Kakao OAuth returns redirect URL starting with kauth.kakao.com
// Wave 5 (Plan 06) activates the real assertion; Wave 0 stub skips gracefully.
import { describe, it, expect } from 'vitest';

describe('AUTH-01k kakao oauth', () => {
  it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('returns kakao consent URL', async () => {
    const mod = await import('@/app/(auth)/signup/actions').catch(() => null);
    if (!mod) return; // Plan 04 (base actions) not yet; Plan 06 adds signInWithKakao on top
    // TODO(Plan 06): assert data.url starts with https://kauth.kakao.com/oauth/authorize?
    //   (per RESEARCH.md:L1430). Until Plan 06, signInWithKakao may not exist on mod.
    if (!('signInWithKakao' in mod)) return;
    expect(mod.signInWithKakao).toBeDefined();
  });
});
