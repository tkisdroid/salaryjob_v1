import { createClient } from '@/lib/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

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
  // Only allow same-origin, exact-match paths
  if (!raw.startsWith('/')) return '/';
  if (ALLOWED_NEXT_PATHS.has(raw)) return raw;
  return '/';
}

export async function GET(request: NextRequest) {
  // Re-verify N/A: the verifyOtp call IS the auth event.
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = resolveNext(searchParams.get('next'))

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      redirect(next)
    } else {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`)
    }
  }

  redirect(`/auth/error?error=No+token+hash+or+type`)
}
