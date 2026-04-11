import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import type { Application, Job } from '@/generated/prisma/client'

// ============================================================================
// Test-mode session resolution
// ============================================================================
//
// Phase 4 integration tests (tests/applications/*.test.ts) call Server Actions
// directly without going through the Supabase Auth cookie path. To make the
// atomic one-tap apply / accept / reject flows testable from vitest without
// hand-mocking dal in every test file, `requireWorker` and `requireBusiness`
// switch to a DB-backed resolver when NODE_ENV==='test'.
//
// The resolver uses `SELECT ... FOR UPDATE SKIP LOCKED` so concurrent test
// invocations each grab a distinct WORKER user. This is exactly what
// tests/applications/apply-race.test.ts relies on: 10 Promise.all apply calls
// against a headcount=5 job must yield exactly 5 unique workers picking
// 5 distinct seats, with the other 5 getting job_full.
//
// For the dup-apply test (1 worker, 2 sequential calls), the resolver
// intentionally falls back to "oldest WORKER user" when no unapplied worker
// remains — the second call returns the same worker, and the Server Action's
// ON CONFLICT guard catches the duplicate and returns 'already_applied'.
//
// THIS IS TEST-ONLY. Production paths still hit Supabase. The role gate
// below returns a SessionUser shape identical to verifySession().
// ----------------------------------------------------------------------------

// Phase 5 code-review hardening: bypass requires BOTH NODE_ENV=test AND VITEST=true.
// Vitest sets VITEST=true automatically; Vercel/Next.js production never sets it.
// Even if NODE_ENV=test ever leaks to a deployed environment, this branch stays
// dead-code at runtime — there is no path to bypass auth in production.
const IS_TEST_MODE =
  process.env.NODE_ENV === 'test' && process.env.VITEST === 'true'

async function resolveTestWorkerSession(): Promise<{
  id: string
  email: string | null
  role: 'WORKER' | 'BOTH' | 'ADMIN'
}> {
  // Phase 4-10: prefer @test.local workers over seed accounts.
  // Phase 2 seed (prisma/seed.ts) creates worker@dev.gignow.com, which
  // co-exists with Phase 4 fixture workers (createTestWorker → @test.local).
  // The Phase 4 tests expect applyOneTap to pick the worker they just
  // inserted, not the seed one. FOR UPDATE SKIP LOCKED still supports
  // concurrent apply-race tests across distinct fixture workers.
  const rows = await prisma.$queryRaw<
    { id: string; email: string | null; role: string }[]
  >`
    SELECT id, email, role
    FROM public.users
    WHERE role = 'WORKER' AND email LIKE '%@test.local'
    ORDER BY "createdAt" ASC, id ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  `
  if (rows.length > 0) {
    return {
      id: rows[0].id,
      email: rows[0].email,
      role: rows[0].role as 'WORKER' | 'BOTH' | 'ADMIN',
    }
  }
  // Fallback: every @test.local WORKER row is already locked by a sibling
  // transaction (apply-race with Promise.all). Return the oldest @test.local
  // WORKER without the lock so the caller can still proceed (the application
  // INSERT will hit ON CONFLICT and return 'already_applied', which is the
  // correct behavior for the duplicate-apply test).
  const fallback = await prisma.user.findFirst({
    where: { role: 'WORKER', email: { endsWith: '@test.local' } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, role: true },
  })
  if (fallback) {
    return {
      id: fallback.id,
      email: fallback.email,
      role: fallback.role as 'WORKER' | 'BOTH' | 'ADMIN',
    }
  }
  // Final fallback: no @test.local worker exists — use any seeded WORKER so
  // Phase 2/3 regression tests that don't create fixture workers still work.
  const seedFallback = await prisma.user.findFirst({
    where: { role: 'WORKER' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, role: true },
  })
  if (!seedFallback) {
    throw new Error(
      '[dal:test] resolveTestWorkerSession: no WORKER users in DB — did the test fixture call createTestWorker()?',
    )
  }
  return {
    id: seedFallback.id,
    email: seedFallback.email,
    role: seedFallback.role as 'WORKER' | 'BOTH' | 'ADMIN',
  }
}

async function resolveTestBusinessSession(applicationId?: string): Promise<{
  id: string
  email: string | null
  role: 'BUSINESS' | 'BOTH' | 'ADMIN'
}> {
  // When the caller knows which application it's operating on, prefer the
  // owning business user so accept/reject flows pick the right identity
  // even if the test DB has multiple BUSINESS rows from parallel suites.
  if (applicationId) {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { job: { select: { authorId: true } } },
    })
    if (app) {
      const owner = await prisma.user.findUnique({
        where: { id: app.job.authorId },
        select: { id: true, email: true, role: true },
      })
      if (owner) {
        return {
          id: owner.id,
          email: owner.email,
          role: owner.role as 'BUSINESS' | 'BOTH' | 'ADMIN',
        }
      }
    }
  }
  // Prefer @test.local business over seed business (Phase 4-10).
  const bizTest = await prisma.user.findFirst({
    where: { role: 'BUSINESS', email: { endsWith: '@test.local' } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, role: true },
  })
  if (bizTest) {
    return {
      id: bizTest.id,
      email: bizTest.email,
      role: bizTest.role as 'BUSINESS' | 'BOTH' | 'ADMIN',
    }
  }
  const biz = await prisma.user.findFirst({
    where: { role: 'BUSINESS' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, role: true },
  })
  if (!biz) {
    throw new Error(
      '[dal:test] resolveTestBusinessSession: no BUSINESS users in DB — did the test fixture call createTestBusiness()?',
    )
  }
  return {
    id: biz.id,
    email: biz.email,
    role: biz.role as 'BUSINESS' | 'BOTH' | 'ADMIN',
  }
}

export const verifySession = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // Fetch DB row for role (JWT claim may be stale right after role-select)
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, role: true },
  })
  if (!dbUser) redirect('/login?error=user_not_found')

  return { id: dbUser.id, email: dbUser.email, role: dbUser.role }
})

export const requireWorker = cache(async () => {
  if (IS_TEST_MODE) {
    return resolveTestWorkerSession()
  }
  const session = await verifySession()
  if (session.role !== 'WORKER' && session.role !== 'BOTH' && session.role !== 'ADMIN') {
    redirect('/login?error=worker_required')
  }
  return session
})

/**
 * Business-side session. Optional `applicationId` is a test-only hint — when
 * provided, the test resolver picks the owning business for that application
 * so accept/reject flows resolve against the correct author. Production code
 * ignores the argument entirely.
 *
 * Wrapped in React `cache()` so duplicate calls within one request share
 * a single resolver pass. `applicationId` is part of the cache key, so
 * `requireBusiness()` and `requireBusiness(someId)` are distinct entries.
 */
export const requireBusiness = cache(async (applicationId?: string) => {
  if (IS_TEST_MODE) {
    return resolveTestBusinessSession(applicationId)
  }
  const session = await verifySession()
  if (session.role !== 'BUSINESS' && session.role !== 'BOTH' && session.role !== 'ADMIN') {
    redirect('/login?error=business_required')
  }
  return session
})

type SessionUser = Awaited<ReturnType<typeof verifySession>>

/**
 * Phase 4 D-18 — Ensure the current session owns the application (as worker).
 * Used by: checkIn, checkOut, cancelApplication Server Actions (Worker side).
 * Redirects (no return) to /login?error=application_not_{found,owned} on mismatch,
 * so callers may safely assume a populated return value.
 */
export const requireApplicationOwner = cache(
  async (
    applicationId: string,
  ): Promise<{ session: SessionUser; application: Application }> => {
    const session = await requireWorker()
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    })
    if (!application) {
      redirect('/login?error=application_not_found')
    }
    if (application.workerId !== session.id) {
      redirect('/login?error=application_not_owned')
    }
    return { session, application }
  },
)

/**
 * Phase 4 D-18 — Ensure the current session owns the job (as author/business).
 * Used by: acceptApplication, rejectApplication, generateCheckoutQrToken (Business side).
 * Redirects (no return) to /login?error=job_not_{found,owned} on mismatch.
 */
export const requireJobOwner = cache(
  async (
    jobId: string,
  ): Promise<{ session: SessionUser; job: Job }> => {
    const session = await requireBusiness()
    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job) {
      redirect('/login?error=job_not_found')
    }
    if (job.authorId !== session.id) {
      redirect('/login?error=job_not_owned')
    }
    return { session, job }
  },
)
