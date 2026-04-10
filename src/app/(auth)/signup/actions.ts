'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import type { AuthFormState } from '../types'

const SignupSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

export async function signUpWithPassword(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  // Re-verify N/A: pre-session action; the sign-up call itself creates the session.
  const parsed = SignupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/role-select`,
    },
  })
  if (error) return { error: { form: [error.message] } }

  redirect('/auth/check-email')
}

// Direct form action — must return Promise<void>. Errors redirect to /auth/error.
export async function signInWithMagicLink(formData: FormData): Promise<void> {
  // Re-verify N/A: pre-session; magic link redirect creates the session on return.
  const email = formData.get('email') as string
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/role-select`,
      shouldCreateUser: true,
    },
  })
  if (error) {
    redirect(`/auth/error?reason=${encodeURIComponent(error.message)}`)
  }
  redirect('/auth/check-email')
}

// Direct form action — must return Promise<void>. Errors redirect to /auth/error.
export async function signInWithGoogle(): Promise<void> {
  // Re-verify N/A: pre-session; OAuth redirect creates the session on callback.
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/role-select`,
    },
  })
  if (error) {
    redirect(`/auth/error?reason=${encodeURIComponent(error.message)}`)
  }
  if (data.url) redirect(data.url)
  // Should never reach here — Supabase always returns either a URL or an error.
  redirect('/auth/error?reason=oauth_no_url')
}

// Phase 2 Wave 5 — Kakao built-in Supabase provider (RESEARCH.md §Key Finding #1)
// Kakao is a built-in provider, NOT a custom OIDC. Just toggle on Supabase Dashboard.
// Prerequisite: Supabase Dashboard → Authentication → Providers → Kakao → enable.
export async function signInWithKakao(): Promise<void> {
  // Re-verify N/A: pre-session; OAuth redirect creates the session on callback.
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/role-select`,
    },
  })
  if (error) {
    redirect(`/auth/error?reason=${encodeURIComponent(error.message)}`)
  }
  if (data.url) redirect(data.url)
  redirect('/auth/error?reason=oauth_no_url')
}
