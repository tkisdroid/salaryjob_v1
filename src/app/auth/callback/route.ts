import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getPostAuthRedirectPath } from '@/lib/auth/routing'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const dbUser = data.user
        ? await prisma.user.findUnique({
            where: { id: data.user.id },
            select: { role: true },
          })
        : null
      const destination = getPostAuthRedirectPath(dbUser?.role, next)
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error?error=oauth_exchange_failed`)
}
