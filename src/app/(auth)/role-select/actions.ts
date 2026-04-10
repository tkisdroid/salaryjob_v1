'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/dal'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const RoleSchema = z.enum(['WORKER', 'BUSINESS', 'BOTH'])

// Direct form action — must return Promise<void>. Errors redirect to /auth/error.
export async function selectRole(formData: FormData): Promise<void> {
  // Re-verify REQUIRED: this is a post-session mutation that writes to DB AND
  // calls the admin API. Per Next 16 data-security.md, Server Actions that mutate
  // state MUST re-verify. The other auth actions (signUp/signIn*/logout) are N/A
  // because they are pre-session or idempotent cleanup.
  const session = await verifySession()

  const parsed = RoleSchema.safeParse(formData.get('role'))
  if (!parsed.success) {
    redirect('/auth/error?reason=invalid_role')
  }

  // Update Prisma row (public.users)
  await prisma.user.update({
    where: { id: session.id },
    data: { role: parsed.data },
  })

  // Also update app_metadata so JWT claim sees role in proxy.ts optimistic check
  // NOTE: only service_role key can update app_metadata.
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const { error: adminError } = await admin.auth.admin.updateUserById(session.id, {
    app_metadata: { role: parsed.data },
  })
  if (adminError) {
    // DB updated but JWT claim did not — proxy will catch on next refresh
    console.error('role admin update failed', adminError)
  }

  redirect(
    parsed.data === 'BUSINESS' ? '/biz'
    : parsed.data === 'WORKER' || parsed.data === 'BOTH' ? '/home'
    : '/'
  )
}
