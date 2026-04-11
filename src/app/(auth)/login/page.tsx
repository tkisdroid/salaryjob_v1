import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPostAuthRedirectPath, resolveNextPath } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

interface Props {
  searchParams: Promise<{ error?: string | string[]; next?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const rawError = Array.isArray(params.error) ? params.error[0] : params.error;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const nextPath = resolveNextPath(rawNext);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !rawError) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    redirect(getPostAuthRedirectPath(dbUser?.role, nextPath));
  }

  return (
    <Suspense fallback={null}>
      <LoginForm nextPath={nextPath} />
    </Suspense>
  );
}
