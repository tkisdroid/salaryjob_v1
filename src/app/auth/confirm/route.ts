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
  // Re-verify N/A: the verifyOtp/exchangeCodeForSession call IS the auth event.
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = resolveNext(searchParams.get('next'))

  const supabase = await createClient()

  // Path 1 — PKCE code exchange (Supabase default signup with @supabase/ssr 0.10+)
  // The default email template ships with `{{ .ConfirmationURL }}`, which hits
  // Supabase's /auth/v1/verify endpoint first. That endpoint verifies the PKCE
  // token and redirects here with a `code` query parameter for us to exchange.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      redirect(next)
    }
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`)
  }

  // Path 2 — Legacy OTP token-hash flow (custom email template with {{ .TokenHash }})
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      redirect(next)
    }
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`)
  }

  // Path 3 — Session already established upstream (rare; e.g., cookie-only flow)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    redirect(next)
  }

  redirect(`/auth/error?error=${encodeURIComponent('Missing auth code, token hash, or active session — check the Supabase email template and URL configuration.')}`)
}
