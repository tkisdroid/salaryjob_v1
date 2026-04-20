"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getPostAuthRedirectPath } from "@/lib/auth/routing";
import { prisma } from "@/lib/db";
import { supabaseAuthErrorToKorean } from "@/lib/errors/auth-errors";
import { createClient } from "@/lib/supabase/server";
import type { AuthFormState } from "../types";

const LoginSchema = z.object({
  email: z.email("올바른 이메일 주소를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export async function signInWithPassword(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  // Re-verify N/A: pre-session; signIn creates the session.
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { error: { form: [supabaseAuthErrorToKorean(error.message)] } };
  }

  // Determine redirect by role (read from DB, not from session claims).
  const dbUser = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: { role: true },
  });

  redirect(getPostAuthRedirectPath(dbUser?.role, formData.get("next")));
}

export async function logout() {
  // Re-verify N/A: idempotent cleanup; signOut is safe whether session exists or not.
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
