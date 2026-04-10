import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

const ALLOWED_NEXT_PATHS = new Set([
  '/',
  '/home',
  '/my',
  '/my/profile',
  '/biz',
  '/biz/posts',
  '/role-select',
]);

function resolveNext(raw: string | null): string {
  if (!raw) return '/';
  if (!raw.startsWith('/')) return '/';
  if (ALLOWED_NEXT_PATHS.has(raw)) return raw;
  return '/';
}

export async function GET(request: NextRequest) {
  // Re-verify N/A: the exchangeCodeForSession call IS the auth event.
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = resolveNext(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  return NextResponse.redirect(`${origin}/auth/error?error=oauth_exchange_failed`)
}
