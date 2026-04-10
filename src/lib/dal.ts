import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'

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
