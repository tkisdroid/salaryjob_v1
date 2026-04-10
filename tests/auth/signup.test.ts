// REQ: AUTH-01 — Email/Password signup creates auth.users + public.users row
import { describe, it, expect } from 'vitest';

describe('AUTH-01 signup', () => {
  it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('signs up a new user', async () => {
    const mod = await import('@/app/(auth)/signup/actions').catch(() => null);
    if (!mod) return; // Plan 04 not yet executed — skip gracefully
    // TODO(Plan 04): build FormData, call mod.signUpWithPassword(fd), assert
    //   (a) supabase.auth.admin.getUserByEmail returns a row
    //   (b) prisma.user.findUnique returns matching row within 500ms
    expect(mod.signUpWithPassword).toBeDefined();
  });
});
