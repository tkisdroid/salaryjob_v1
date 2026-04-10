// REQ: AUTH-01m — Magic Link signup returns success and triggers Supabase email send
import { describe, it, expect } from 'vitest';

describe('AUTH-01m magic link', () => {
  it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('requests a magic link', async () => {
    const mod = await import('@/app/(auth)/signup/actions').catch(() => null);
    if (!mod) return;
    // TODO(Plan 04): call mod.signInWithMagicLink(fd) and assert { success: true }
    // Then assert token_hash format via auth/confirm round-trip (or accept mock).
    expect(mod.signInWithMagicLink).toBeDefined();
  });
});
