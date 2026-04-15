"use client";

import { Suspense, useState, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Lock,
  Mail,
  MapPin,
  Check,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  Store,
} from "lucide-react";
import {
  signUpWithPassword,
  signInWithMagicLink,
  signInWithGoogle,
  signInWithKakao,
} from "./actions";
import { CeleryMark } from "@/components/brand/celery-mark";
import { cn } from "@/lib/utils";

type Role = "worker" | "business";

interface StepProps {
  onNext: () => void;
  onBack?: () => void;
}

// ── 공통 토큰 (로그인 페이지와 정합) ──────────────────────────────────────
const LABEL = "mb-1.5 block text-[13px] font-semibold text-foreground";
const INPUT_BASE =
  "h-12 w-full rounded-xl border border-input bg-background text-[15px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:border-brand/40";
const BTN_PRIMARY =
  "h-12 w-full rounded-full bg-brand text-[15px] font-semibold text-primary-foreground shadow-[0_6px_20px_hsl(var(--brand)/0.2)] hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed";
const BTN_PRIMARY_TEAL =
  "h-12 w-full rounded-full bg-[var(--teal-deep)] text-[15px] font-semibold text-primary-foreground shadow-[0_6px_20px_oklch(0.45_0.08_186/0.25)] hover:bg-teal disabled:opacity-60 disabled:cursor-not-allowed";
const BTN_OUTLINE =
  "h-12 w-full rounded-full border border-border bg-card text-[15px] font-semibold text-foreground hover:bg-muted";
const BTN_KAKAO =
  "h-12 w-full rounded-full border-0 bg-[#FEE500] text-[15px] font-semibold text-[#1f1a17] hover:bg-[#F7D800]";
const FRAME =
  "rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8";

// ── Brand glyphs ──────────────────────────────────────────────────────────
function KakaoGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="shrink-0">
      <path
        fill="currentColor"
        d="M12 3C6.48 3 2 6.58 2 10.94c0 2.78 1.83 5.22 4.6 6.6l-1.1 4.1c-.1.38.31.69.65.48l4.85-3.2c.33.02.66.04 1 .04 5.52 0 10-3.58 10-7.94S17.52 3 12 3z"
      />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="shrink-0">
      <path
        fill="#4285F4"
        d="M21.35 11.1H12v2.92h5.35c-.23 1.38-1.62 4.04-5.35 4.04-3.22 0-5.85-2.66-5.85-5.94 0-3.28 2.63-5.94 5.85-5.94 1.83 0 3.06.78 3.77 1.45l2.57-2.48C16.64 3.5 14.56 2.6 12 2.6 6.87 2.6 2.72 6.75 2.72 11.88S6.87 21.16 12 21.16c6.94 0 9.53-4.86 9.53-7.41 0-.5-.05-.88-.18-1.65z"
      />
    </svg>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-2" aria-label={`단계 ${current}/${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "active" : "idle";
        return (
          <div key={n} className="flex items-center">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold font-mono tabular-nums transition-colors",
                state === "done" && "bg-brand/15 text-brand",
                state === "active" && "bg-brand text-primary-foreground shadow-[0_4px_14px_hsl(var(--brand)/0.3)]",
                state === "idle" && "bg-muted text-muted-foreground",
              )}
              aria-current={state === "active" ? "step" : undefined}
            >
              {state === "done" ? <Check className="h-4 w-4" /> : n}
            </div>
            {n < total && (
              <div
                className={cn(
                  "mx-1.5 h-0.5 w-7 rounded-full transition-colors",
                  state === "done" ? "bg-brand" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Shared header (logo + title + subtitle) ──────────────────────────────
function AuthHeader({
  title,
  subtitle,
  size = "md",
}: {
  title: string;
  subtitle?: string;
  size?: "md" | "sm";
}) {
  const logoSize = size === "md" ? "h-14 w-14" : "h-12 w-12";
  const titleSize = size === "md" ? "text-[22px]" : "text-[20px]";
  return (
    <div className="mb-7 flex flex-col items-center text-center">
      <CeleryMark className={cn(logoSize, "text-brand")} />
      <h1 className={cn("mt-4 font-extrabold tracking-[-0.025em] text-foreground", titleSize)}>
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1.5 text-[13px] text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Role Select
// ══════════════════════════════════════════════════════════════════════════
function RoleSelect({ onRoleSelect }: { onRoleSelect: (role: Role) => void }) {
  return (
    <div className="w-full">
      <AuthHeader title="회원가입" subtitle="샐러리잡을 어떻게 사용하실 건가요?" />

      <div className="space-y-3">
        <button
          onClick={() => onRoleSelect("worker")}
          className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_14px_32px_rgba(15,23,42,0.06)]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand transition-[background-color,color] duration-200 group-hover:bg-brand group-hover:text-primary-foreground">
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-bold tracking-[-0.015em]">일하고 싶어요</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
              빈 시간에 맞는 일자리를 찾고 싶어요
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-brand" />
        </button>

        <button
          onClick={() => onRoleSelect("business")}
          className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-teal/50 hover:shadow-[0_14px_32px_rgba(15,23,42,0.06)]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-light text-[var(--teal-deep)] transition-[background-color,color] duration-200 group-hover:bg-teal group-hover:text-primary-foreground">
            <Store className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-bold tracking-[-0.015em]">사람을 구해요</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
              필요할 때 딱 맞는 인력을 구하고 싶어요
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-hover:text-[var(--teal-deep)]" />
        </button>
      </div>

      <div className="mt-7 text-center">
        <p className="text-[13px] text-muted-foreground">
          이미 계정이 있으세요?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand-deep underline-offset-4 hover:underline"
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Worker — Step 1: 기본 정보 (소셜 먼저, 이메일 아래)
// ══════════════════════════════════════════════════════════════════════════
function WorkerStep1() {
  const [state, formAction, pending] = useActionState(signUpWithPassword, null);

  return (
    <div className="w-full">
      <AuthHeader title="회원가입" subtitle="2분이면 끝나요" size="sm" />

      <div className={FRAME}>
        <StepDots current={1} total={3} />

        <h2 className="text-[17px] font-bold tracking-[-0.015em]">기본 정보</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          가장 빠른 방법은 카카오로 1초 가입이에요.
        </p>

        {/* Social primary path */}
        <div className="mt-5 space-y-2.5">
          <form action={signInWithKakao}>
            <Button type="submit" className={BTN_KAKAO}>
              <span className="flex items-center justify-center gap-2">
                <KakaoGlyph />
                카카오로 계속하기
              </span>
            </Button>
          </form>
          <form action={signInWithGoogle}>
            <Button type="submit" className={BTN_OUTLINE}>
              <span className="flex items-center justify-center gap-2">
                <GoogleGlyph />
                Google로 계속하기
              </span>
            </Button>
          </form>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-3 text-[12px] font-medium text-muted-foreground">
              또는 이메일로
            </span>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
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
            <Label htmlFor="name" className={LABEL}>
              이름
            </Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="실명을 입력해주세요"
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
                autoComplete="new-password"
                placeholder="8자 이상"
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
          {state?.error?.password && (
            <p className="text-[13px] font-medium text-destructive">
              {state.error.password[0]}
            </p>
          )}

          <Button type="submit" disabled={pending} className={BTN_PRIMARY}>
            <span className="flex items-center justify-center gap-1.5">
              {pending ? "처리 중..." : "다음"}
              {!pending && <ArrowRight className="h-4 w-4" />}
            </span>
          </Button>
        </form>

        <form action={signInWithMagicLink} className="mt-5 space-y-2.5">
          <p className="text-[12px] text-muted-foreground">
            비밀번호 없이 이메일 링크로 가입하고 싶다면
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
              variant="outline"
              className="h-12 shrink-0 rounded-full border-brand/30 bg-card px-5 text-[14px] font-semibold text-brand-deep hover:bg-brand-light"
            >
              링크 받기
            </Button>
          </div>
        </form>
      </div>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-muted-foreground">
        가입하면{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
          이용약관
        </Link>
        과{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          개인정보처리방침
        </Link>
        에 동의하게 됩니다.
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Worker — Step 2: 활동 정보 (optional)
// ══════════════════════════════════════════════════════════════════════════
const CATEGORIES = [
  "음식점·카페",
  "판매·유통",
  "물류·배송",
  "사무·행정",
  "행사·이벤트",
  "청소·정리",
  "교육·과외",
  "IT·디자인",
];

function WorkerStep2({ onNext, onBack }: StepProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (cat: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="w-full">
      <AuthHeader title="회원가입" subtitle="더 잘 맞는 일을 찾아드려요" size="sm" />

      <div className={FRAME}>
        <StepDots current={2} total={3} />

        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-bold tracking-[-0.015em]">활동 정보</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              지금 건너뛰고 나중에 채워도 괜찮아요.
            </p>
          </div>
          <button
            type="button"
            onClick={onNext}
            className="shrink-0 text-[13px] font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            건너뛰기
          </button>
        </div>

        <form
          className="mt-6 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            onNext();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="birth" className={LABEL}>
                생년월일
              </Label>
              <Input id="birth" type="date" className={INPUT_BASE} />
            </div>
            <div>
              <Label htmlFor="gender" className={LABEL}>
                성별
              </Label>
              <select
                id="gender"
                className={cn(
                  INPUT_BASE,
                  "appearance-none px-3 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%23818181%22><path d=%22M5.5 8.5L10 13l4.5-4.5%22 stroke=%22%23818181%22 stroke-width=%221.5%22 fill=%22none%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')] bg-no-repeat bg-[right_12px_center] pr-9",
                )}
                defaultValue=""
              >
                <option value="">선택</option>
                <option value="male">남성</option>
                <option value="female">여성</option>
                <option value="other">기타</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="region" className={LABEL}>
              활동 지역
            </Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="region"
                placeholder="예: 강남구, 서초구"
                className={cn(INPUT_BASE, "pl-10")}
              />
            </div>
          </div>

          <div>
            <Label className={LABEL}>
              관심 직종{" "}
              <span className="font-normal text-muted-foreground">(선택)</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const on = selected.has(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggle(cat)}
                    aria-pressed={on}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                      on
                        ? "border-brand bg-brand/10 text-brand-deep"
                        : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:bg-brand/5",
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className={cn(BTN_OUTLINE, "flex-1")}
            >
              <span className="flex items-center justify-center gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                이전
              </span>
            </Button>
            <Button type="submit" className={cn(BTN_PRIMARY, "flex-[1.5]")}>
              <span className="flex items-center justify-center gap-1.5">
                다음
                <ArrowRight className="h-4 w-4" />
              </span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Worker — Step 3: 가입 완료
// ══════════════════════════════════════════════════════════════════════════
function WorkerStep3() {
  return (
    <div className="w-full">
      <div className={cn(FRAME, "text-center")}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Check className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <h2 className="mt-6 text-[22px] font-extrabold tracking-[-0.025em]">
          가입 완료!
        </h2>
        <p className={cn("mx-auto mt-3 max-w-sm text-[15px] leading-[1.7] text-muted-foreground")}>
          샐러리잡에 오신 걸 환영해요.
          <br />내 주변 일자리를 바로 확인해 볼까요?
        </p>

        <div className="mt-8 space-y-2.5">
          <Button className={BTN_PRIMARY} asChild>
            <Link href="/">
              <span className="flex items-center justify-center gap-1.5">
                내 주변 일자리 보러가기
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </Button>
          <Button variant="outline" className={BTN_OUTLINE} asChild>
            <Link href="/my/availability">가용시간 등록하기</Link>
          </Button>
          <Button
            variant="ghost"
            className="h-10 w-full rounded-full text-[13px] text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/my/profile">프로필 더 채우기</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Business signup
// ══════════════════════════════════════════════════════════════════════════
function BusinessSignupForm() {
  const [state, formAction, pending] = useActionState(signUpWithPassword, null);

  return (
    <div className="w-full">
      <div className="mb-7 flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-light text-[var(--teal-deep)]">
          <Store className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-[22px] font-extrabold tracking-[-0.025em] text-foreground">
          업체 회원가입
        </h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          사업자 인증 후 구인 공고를 등록할 수 있어요
        </p>
      </div>

      <div className={FRAME}>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="biz-name" className={LABEL}>
              담당자 이름
            </Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="biz-name"
                name="name"
                autoComplete="name"
                placeholder="이름"
                className={cn(INPUT_BASE, "pl-10")}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="biz-email" className={LABEL}>
              이메일
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="biz-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="email@company.com"
                className={cn(INPUT_BASE, "pl-10")}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="biz-pw" className={LABEL}>
              비밀번호
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="biz-pw"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="8자 이상"
                className={cn(INPUT_BASE, "pl-10")}
              />
            </div>
          </div>

          {state?.error?.form && (
            <p className="text-[13px] font-medium text-destructive">
              {state.error.form[0]}
            </p>
          )}

          <Button type="submit" disabled={pending} className={BTN_PRIMARY_TEAL}>
            <span className="flex items-center justify-center gap-1.5">
              {pending ? "처리 중..." : "가입하기"}
              {!pending && <ArrowRight className="h-4 w-4" />}
            </span>
          </Button>
        </form>
      </div>

      <div className="mt-6 text-center">
        <p className="text-[13px] text-muted-foreground">
          Worker로 가입하시나요?{" "}
          <Link
            href="/signup?role=worker"
            className="font-semibold text-brand-deep underline-offset-4 hover:underline"
          >
            일자리 찾기
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-muted-foreground">
        가입하면{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
          이용약관
        </Link>
        과{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          개인정보처리방침
        </Link>
        에 동의하게 됩니다.
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Flow router
// ══════════════════════════════════════════════════════════════════════════
function SignupFlow() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const initialRole: Role | null =
    roleParam === "worker" || roleParam === "business" ? roleParam : null;

  const [role, setRole] = useState<Role | null>(initialRole);
  const [step, setStep] = useState(initialRole ? 1 : 0);

  if (!role) {
    return (
      <RoleSelect
        onRoleSelect={(r) => {
          setRole(r);
          setStep(1);
        }}
      />
    );
  }

  if (role === "worker") {
    switch (step) {
      case 1:
        return <WorkerStep1 />;
      case 2:
        return <WorkerStep2 onNext={() => setStep(3)} onBack={() => setStep(1)} />;
      case 3:
        return <WorkerStep3 />;
    }
  }

  if (role === "business") {
    return <BusinessSignupForm />;
  }

  return null;
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupFlow />
    </Suspense>
  );
}
