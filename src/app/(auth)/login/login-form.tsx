"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { signInWithGoogle, signInWithKakao, signInWithMagicLink } from "@/app/(auth)/signup/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithPassword } from "./actions";
import { CeleryMark } from "@/components/brand/celery-mark";

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
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-8">
        <CeleryMark className="h-16 w-16 mb-4 text-brand" />
        <h1 className="text-2xl font-extrabold">샐러리잡</h1>
        <p className="text-sm text-muted-foreground mt-1">
          내 주변 로컬 잡 플랫폼
        </p>
      </div>

      <Suspense fallback={null}>
        <LoginErrorBanner />
      </Suspense>

      <form action={formAction} className="space-y-3">
        {nextPath && <input type="hidden" name="next" value={nextPath} />}

        <div>
          <Label htmlFor="email" className="text-xs font-medium text-muted-foreground mb-1.5 block">
            이메일
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="이메일을 입력하세요"
              className="w-full rounded-xl border border-input bg-card px-4 py-3 pl-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="password" className="text-xs font-medium text-muted-foreground mb-1.5 block">
            비밀번호
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="비밀번호 입력"
            className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {state?.error?.form && (
          <p className="text-sm text-destructive">{state.error.form[0]}</p>
        )}
        {state?.error?.email && (
          <p className="text-sm text-destructive">{state.error.email[0]}</p>
        )}

        <Button
          type="submit"
          disabled={pending}
          className="w-full h-12 rounded-xl bg-brand text-primary-foreground font-semibold hover:bg-brand-dark text-sm"
        >
          {pending ? "로그인 중..." : "로그인"}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-[10px]">
          <span className="bg-background px-3 text-muted-foreground">또는</span>
        </div>
      </div>

      <div className="space-y-3">
        <form action={signInWithGoogle}>
          {nextPath && <input type="hidden" name="next" value={nextPath} />}
          <Button
            type="submit"
            variant="outline"
            className="w-full h-12 rounded-xl border-border text-sm font-medium"
          >
            Google로 계속하기
          </Button>
        </form>
        <form action={signInWithKakao}>
          {nextPath && <input type="hidden" name="next" value={nextPath} />}
          <Button
            type="submit"
            variant="outline"
            className="w-full h-12 rounded-xl border-[#FEE500] bg-[#FEE500] text-foreground hover:bg-[#FDD835] text-sm font-medium"
          >
            카카오로 계속하기
          </Button>
        </form>
        <form action={signInWithMagicLink}>
          {nextPath && <input type="hidden" name="next" value={nextPath} />}
          <Input
            name="email"
            type="email"
            placeholder="이메일 주소"
            className="mb-2 rounded-xl"
          />
          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-brand text-primary-foreground font-semibold hover:bg-brand-dark text-sm"
          >
            매직 링크로 로그인
          </Button>
        </form>
      </div>

      <div className="mt-6 space-y-3 text-center">
        <p className="text-sm text-muted-foreground">아직 계정이 없으신가요?</p>
        <Button variant="outline" className="w-full h-12 rounded-xl" asChild>
          <Link href={signupHref}>회원가입</Link>
        </Button>
      </div>

      <p className="mt-8 text-center text-[10px] text-muted-foreground">
        로그인하면{" "}
        <Link href="/terms" className="underline">
          이용약관
        </Link>
        과{" "}
        <Link href="/privacy" className="underline">
          개인정보처리방침
        </Link>
        에 동의하게 됩니다.
      </p>
    </div>
  );
}
