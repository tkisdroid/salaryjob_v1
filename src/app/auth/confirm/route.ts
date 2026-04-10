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

  const supabase = await createClient()

  // Path 1 — PKCE / OTP token-hash flow (custom email template uses {{ .TokenHash }})
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      redirect(next)
    }
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`)
  }

  // Path 2 — Supabase default email-link flow (template uses {{ .ConfirmationURL }})
  // Supabase's /auth/v1/verify already verified the OTP and set the session
  // cookies before redirecting here. We just need to confirm the session exists
  // and forward to `next`. This is the path most fresh projects take because
  // the default email template ships with `{{ .ConfirmationURL }}`.
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect(next)
  }

  redirect(`/auth/error?error=${encodeURIComponent('No token hash or type, and no active session — likely the email template needs to use {{ .TokenHash }} or the user needs to log in manually.')}`)
}
