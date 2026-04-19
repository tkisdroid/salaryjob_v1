"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight } from "lucide-react";
import {
  signInWithGoogle,
  signInWithKakao,
  signInWithMagicLink,
} from "@/app/(auth)/signup/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithPassword } from "./actions";
import { CeleryMark } from "@/components/brand/celery-mark";
import { cn } from "@/lib/utils";

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
    <div
      role="alert"
      className="mb-5 rounded-[14px] border border-destructive/25 bg-destructive/5 px-4 py-3 text-[13px] font-bold text-destructive"
    >
      {messages[error] ?? "로그인 오류가 발생했습니다."}
    </div>
  );
}

// ── 공통 토큰 (Premium 정합) ──────────────────────────────────────────────
const LABEL = "mb-1.5 block text-[12.5px] font-bold tracking-tight text-ink";
const INPUT_BASE =
  "h-12 w-full rounded-[14px] border border-border bg-surface text-[15px] text-ink placeholder:text-text-subtle transition-colors focus-visible:outline-none focus-visible:border-ink";
const BTN_PRIMARY =
  "h-12 w-full rounded-full bg-ink text-[15px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark disabled:opacity-60 disabled:cursor-not-allowed";
const BTN_OUTLINE =
  "h-12 w-full rounded-full border border-border bg-surface text-[15px] font-bold text-ink transition-colors hover:bg-surface-2";
const BTN_KAKAO =
  "h-12 w-full rounded-full border-0 bg-[#FEE500] text-[15px] font-bold text-[#1f1a17] hover:bg-[#F7D800]";

export function LoginForm({ nextPath }: { nextPath: string | null }) {
  const [state, formAction, pending] = useActionState(signInWithPassword, null);
  const signupHref = nextPath
    ? `/signup?next=${encodeURIComponent(nextPath)}`
    : "/signup";

  return (
    <div className="w-full">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="mb-7 flex flex-col items-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-[18px] border border-border bg-surface">
          <CeleryMark className="h-8 w-8 text-brand" />
        </span>
        <h1 className="mt-4 flex items-baseline gap-px text-[22px] font-extrabold tracking-[-0.035em] text-ink">
          샐러리잡
          <span className="ml-[3px] inline-block h-[5px] w-[5px] -translate-y-[1px] rounded-full bg-brand" />
        </h1>
        <p className="mt-1.5 text-[12.5px] font-semibold tracking-tight text-muted-foreground">
          내 주변 로컬 잡 플랫폼
        </p>
      </div>

      <div className="rounded-[28px] border border-border-soft bg-surface p-6 shadow-soft-md sm:p-8">
        <Suspense fallback={null}>
          <LoginErrorBanner />
        </Suspense>

        {/* ── Social (primary path for Korean users) ─────────────── */}
        <div className="space-y-2.5">
          <form action={signInWithKakao}>
            {nextPath && <input type="hidden" name="next" value={nextPath} />}
            <Button type="submit" className={BTN_KAKAO}>
              <span className="flex items-center justify-center gap-2">
                <KakaoGlyph />
                카카오로 계속하기
              </span>
            </Button>
          </form>

          <form action={signInWithGoogle}>
            {nextPath && <input type="hidden" name="next" value={nextPath} />}
            <Button type="submit" className={BTN_OUTLINE}>
              <span className="flex items-center justify-center gap-2">
                <GoogleGlyph />
                Google로 계속하기
              </span>
            </Button>
          </form>
        </div>

        {/* ── Divider ────────────────────────────────────────────── */}
        <div className="relative my-7">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border-soft" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-surface px-3 text-[11px] font-bold uppercase tracking-wider text-text-subtle">
              또는 이메일로
            </span>
          </div>
        </div>

        {/* ── Password login ─────────────────────────────────────── */}
        <form action={formAction} className="space-y-4">
          {nextPath && <input type="hidden" name="next" value={nextPath} />}

          <div>
            <Label htmlFor="email" className={LABEL}>
              이메일
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={cn(INPUT_BASE, "pl-10")}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password" className={LABEL}>
              비밀번호
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="비밀번호 입력"
                className={cn(INPUT_BASE, "pl-10")}
              />
            </div>
          </div>

          {state?.error?.form && (
            <p className="text-[13px] font-medium text-destructive">
              {state.error.form[0]}
            </p>
          )}
          {state?.error?.email && (
            <p className="text-[13px] font-medium text-destructive">
              {state.error.email[0]}
            </p>
          )}

          <Button type="submit" disabled={pending} className={BTN_PRIMARY}>
            <span className="flex items-center justify-center gap-1.5">
              {pending ? "로그인 중..." : "로그인"}
              {!pending && <ArrowRight className="h-4 w-4" />}
            </span>
          </Button>
        </form>

        {/* ── Magic link (compact alternative) ─────────────────── */}
        <form action={signInWithMagicLink} className="mt-5 space-y-2.5">
          {nextPath && <input type="hidden" name="next" value={nextPath} />}
          <p className="text-[11.5px] font-semibold tracking-tight text-muted-foreground">
            비밀번호 없이 이메일 링크로 로그인하고 싶다면
          </p>
          <div className="flex gap-2">
            <Input
              name="email"
              type="email"
              inputMode="email"
              placeholder="이메일 주소"
              className={cn(INPUT_BASE, "flex-1")}
              aria-label="매직 링크 이메일"
            />
            <Button
              type="submit"
              variant="ghost-premium"
              className="h-12 shrink-0 px-5 text-[14px]"
            >
              링크 받기
            </Button>
          </div>
        </form>
      </div>

      {/* ── Signup CTA ─────────────────────────────────────────── */}
      <div className="mt-6 text-center">
        <p className="text-[13px] font-medium text-muted-foreground">
          아직 계정이 없으신가요?{" "}
          <Link
            href={signupHref}
            className="font-extrabold text-brand-deep underline-offset-4 hover:underline"
          >
            회원가입
          </Link>
        </p>
      </div>

      {/* ── Terms ──────────────────────────────────────────────── */}
      <p className="mt-6 text-center text-[11.5px] font-medium leading-relaxed text-text-subtle">
        로그인하면{" "}
        <Link
          href="/terms"
          className="underline underline-offset-2 hover:text-ink"
        >
          이용약관
        </Link>
        과{" "}
        <Link
          href="/privacy"
          className="underline underline-offset-2 hover:text-ink"
        >
          개인정보처리방침
        </Link>
        에 동의하게 됩니다.
      </p>
    </div>
  );
}

// ── 브랜드 글리프 (카카오/구글 공식 로고 단순화) ──────────────────────────
function KakaoGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        fill="currentColor"
        d="M12 3C6.48 3 2 6.58 2 10.94c0 2.78 1.83 5.22 4.6 6.6l-1.1 4.1c-.1.38.31.69.65.48l4.85-3.2c.33.02.66.04 1 .04 5.52 0 10-3.58 10-7.94S17.52 3 12 3z"
      />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        fill="#4285F4"
        d="M21.35 11.1H12v2.92h5.35c-.23 1.38-1.62 4.04-5.35 4.04-3.22 0-5.85-2.66-5.85-5.94 0-3.28 2.63-5.94 5.85-5.94 1.83 0 3.06.78 3.77 1.45l2.57-2.48C16.64 3.5 14.56 2.6 12 2.6 6.87 2.6 2.72 6.75 2.72 11.88S6.87 21.16 12 21.16c6.94 0 9.53-4.86 9.53-7.41 0-.5-.05-.88-.18-1.65z"
      />
      <path
        fill="#34A853"
        d="M3.88 7.35l2.4 1.76c.65-1.26 2.02-2.13 3.72-2.13 1.05 0 1.97.36 2.7.95l2.45-2.4C13.6 4.25 12.56 3.8 12 3.8c-2.82 0-5.22 1.44-6.55 3.55l-1.57.0z"
        opacity="0"
      />
    </svg>
  );
}
