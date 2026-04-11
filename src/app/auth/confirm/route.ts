import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getPostAuthRedirectPath } from '@/lib/auth/routing'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  const supabase = await createClient()

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const dbUser = data.user
        ? await prisma.user.findUnique({
            where: { id: data.user.id },
            select: { role: true },
          })
        : null
      redirect(getPostAuthRedirectPath(dbUser?.role, next))
    }
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`)
  }

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })
    if (!error) {
      const dbUser = data.user
        ? await prisma.user.findUnique({
            where: { id: data.user.id },
            select: { role: true },
          })
        : null
      redirect(getPostAuthRedirectPath(dbUser?.role, next))
    }
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })
    redirect(getPostAuthRedirectPath(dbUser?.role, next))
  }

  redirect(
    `/auth/error?error=${encodeURIComponent('Missing auth code, token hash, or active session. Check the Supabase email template and URL configuration.')}`,
  )
}
