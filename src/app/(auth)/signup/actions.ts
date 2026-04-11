'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import type { AuthFormState } from '../types'
import { supabaseAuthErrorToKorean } from '@/lib/errors/auth-errors'

const SignupSchema = z.object({
  email: z.email('올바른 이메일 주소를 입력해주세요'),
  password: z
    .string()
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
    .max(72, '비밀번호는 72자 이하여야 합니다'),
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
  if (error) {
    const kr = supabaseAuthErrorToKorean(error.message)
    // Route password-strength failures back to the password field, everything
    // else to the form-level error slot.
    if (kr.includes('비밀번호')) {
      return { error: { password: [kr] } }
    }
    if (kr.includes('이메일')) {
      return { error: { email: [kr] } }
    }
    return { error: { form: [kr] } }
  }

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
    redirect(
      `/auth/error?reason=${encodeURIComponent(supabaseAuthErrorToKorean(error.message))}`,
    )
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
    redirect(
      `/auth/error?reason=${encodeURIComponent(supabaseAuthErrorToKorean(error.message))}`,
    )
  }
  if (data.url) redirect(data.url)
  // Should never reach here — Supabase always returns either a URL or an error.
  redirect(
    `/auth/error?reason=${encodeURIComponent('소셜 로그인에 실패했습니다. 다시 시도해주세요')}`,
  )
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
    redirect(
      `/auth/error?reason=${encodeURIComponent(supabaseAuthErrorToKorean(error.message))}`,
    )
  }
  if (data.url) redirect(data.url)
  redirect(
    `/auth/error?reason=${encodeURIComponent('소셜 로그인에 실패했습니다. 다시 시도해주세요')}`,
  )
}
