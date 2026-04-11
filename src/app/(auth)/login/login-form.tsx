"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { signInWithGoogle, signInWithKakao, signInWithMagicLink } from "@/app/(auth)/signup/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { signInWithPassword } from "./actions";

function LoginErrorBanner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  if (!error) return null;

  const messages: Record<string, string> = {
    worker_required: "Worker 권한이 필요합니다.",
    business_required: "Business 권한이 필요합니다.",
    user_not_found: "사용자를 찾을 수 없습니다. 다시 로그인해 주세요.",
  };

  return (
    <p className="mb-4 text-center text-sm text-destructive">
      {messages[error] ?? "로그인 오류가 발생했습니다."}
    </p>
  );
}

export function LoginForm({ nextPath }: { nextPath: string | null }) {
  const [state, formAction, pending] = useActionState(signInWithPassword, null);
  const signupHref = nextPath
    ? `/signup?next=${encodeURIComponent(nextPath)}`
    : "/signup";

  return (
    <Card className="p-6 shadow-sm">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand">
          <span className="text-lg font-bold text-white">G</span>
        </div>
        <h1 className="text-2xl font-bold">로그인</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          GigNow에 다시 돌아오신 것을 환영해요
        </p>
      </div>

      <Suspense fallback={null}>
        <LoginErrorBanner />
      </Suspense>

      <form action={formAction} className="space-y-4">
        {nextPath && <input type="hidden" name="next" value={nextPath} />}

        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="email@example.com"
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input id="password" name="password" type="password" placeholder="비밀번호 입력" />
        </div>

        {state?.error?.form && (
          <p className="text-sm text-destructive">{state.error.form[0]}</p>
        )}
        {state?.error?.email && (
          <p className="text-sm text-destructive">{state.error.email[0]}</p>
        )}

        <Button type="submit" disabled={pending} className="w-full bg-brand text-white hover:bg-brand-dark">
          {pending ? "로그인 중..." : "로그인"}
        </Button>
      </form>

      <Separator className="my-6" />

      <div className="space-y-2">
        <form action={signInWithGoogle}>
          {nextPath && <input type="hidden" name="next" value={nextPath} />}
          <Button type="submit" variant="outline" className="w-full">
            Google로 로그인
          </Button>
        </form>
        <form action={signInWithKakao}>
          {nextPath && <input type="hidden" name="next" value={nextPath} />}
          <Button
            type="submit"
            variant="outline"
            className="w-full border-[#FEE500] bg-[#FEE500] text-[#191919] hover:bg-[#FDD835]"
          >
            카카오로 로그인
          </Button>
        </form>
        <form action={signInWithMagicLink}>
          {nextPath && <input type="hidden" name="next" value={nextPath} />}
          <Input name="email" type="email" placeholder="이메일 주소" className="mb-2" />
          <Button type="submit" variant="ghost" className="w-full">
            Magic Link로 로그인
          </Button>
        </form>
      </div>

      <div className="mt-4 space-y-3 text-center">
        <p className="text-sm text-muted-foreground">아직 계정이 없으신가요?</p>
        <Button variant="outline" className="w-full" asChild>
          <Link href={signupHref}>회원가입</Link>
        </Button>
      </div>
    </Card>
  );
}
