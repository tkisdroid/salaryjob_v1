'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const SignupSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

export async function signUpWithPassword(formData: FormData) {
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

export async function signInWithMagicLink(formData: FormData) {
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
  if (error) return { error: { form: [error.message] } }
  return { success: true }
}

export async function signInWithGoogle() {
  // Re-verify N/A: pre-session; OAuth redirect creates the session on callback.
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/role-select`,
    },
  })
  if (error) return { error: { form: [error.message] } }
  if (data.url) redirect(data.url)
}
