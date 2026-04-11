'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import type { AuthFormState } from '../types'
import { supabaseAuthErrorToKorean } from '@/lib/errors/auth-errors'

const LoginSchema = z.object({
  email: z.email('올바른 이메일 주소를 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

export async function signInWithPassword(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  // Re-verify N/A: pre-session; signIn creates the session.
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error) {
    return { error: { form: [supabaseAuthErrorToKorean(error.message)] } }
  }

  // Determine redirect by role (read from DB, NOT from session claims)
  // Static import (not dynamic) — Turbopack 16.2 fails to resolve `@/generated/prisma/client`
  // through `await import('@/lib/db')` even though static imports work fine.
  const dbUser = await prisma.user.findUnique({
    where: { id: data.user!.id },
    select: { role: true },
  })

  if (!dbUser) redirect('/role-select')
  if (dbUser.role === 'BUSINESS' || dbUser.role === 'ADMIN') redirect('/biz')
  if (dbUser.role === 'WORKER' || dbUser.role === 'BOTH') redirect('/home')
  redirect('/role-select')
}

export async function logout() {
  // Re-verify N/A: idempotent cleanup — signOut is safe whether session exists or not.
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
