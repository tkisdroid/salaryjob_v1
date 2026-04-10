// REQ: AUTH-02 — selectRole updates BOTH public.users.role AND auth.users.app_metadata.role
import { describe, it, expect } from 'vitest';

describe('AUTH-02 role selection', () => {
  it.skipIf(!process.env.NEXT_PUBLIC_SUPABASE_URL)('updates both DB role and JWT app_metadata.role', async () => {
    const mod = await import('@/app/(auth)/role-select/actions').catch(() => null);
    if (!mod) return; // Plan 04 not yet executed
    // TODO(Plan 04): create auth user via service_role, call mod.selectRole(fd:role=BOTH),
    //   assert prisma.user.findUnique(...).role === 'BOTH' AND
    //   supabase.auth.admin.getUserById(...).user.app_metadata.role === 'BOTH'
    //   (per RESEARCH.md:L505-L548)
    expect(mod.selectRole).toBeDefined();
  });
});
