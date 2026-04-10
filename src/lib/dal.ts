import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import type { Application, Job } from '@/generated/prisma/client'

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
  const session = await verifySession()
  if (session.role !== 'WORKER' && session.role !== 'BOTH' && session.role !== 'ADMIN') {
    redirect('/login?error=worker_required')
  }
  return session
})

export const requireBusiness = cache(async () => {
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
