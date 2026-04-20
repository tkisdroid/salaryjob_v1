"use client";

import { Suspense, useState, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

// Premium design tokens (Main Page Premium §primitives)
const LABEL = "mb-1.5 block text-[12.5px] font-bold tracking-tight text-ink";
const INPUT =
  "h-12 w-full rounded-[14px] border border-border bg-surface px-4 text-[14.5px] font-medium tracking-[-0.01em] text-ink placeholder:text-text-subtle transition-colors focus:outline-none focus:border-ink";
const BTN_BRAND =
  "inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-[14px] font-extrabold tracking-tight text-ink transition-all hover:bg-brand-dark hover:shadow-soft-green disabled:opacity-50";
const BTN_INK =
  "inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-ink text-[14px] font-extrabold tracking-tight text-white transition-all hover:bg-black hover:shadow-soft-dark disabled:opacity-50";
const BTN_OUTLINE =
  "inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full border border-border bg-surface text-[14px] font-extrabold tracking-tight text-ink transition-colors hover:border-ink hover:bg-surface-2";
const BTN_KAKAO =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#FEE500] text-[14px] font-extrabold tracking-tight text-[#1f1a17] transition-colors hover:bg-[#F7D800]";
const FRAME =
  "rounded-[22px] border border-border-soft bg-surface p-6 shadow-soft sm:p-8";

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
    <div
      className="mb-6 flex items-center justify-center gap-2"
      aria-label={`단계 ${current}/${total}`}
    >
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "active" : "idle";
        return (
          <div key={n} className="flex items-center">
            <div
              className={cn(
                "tabnum grid h-8 w-8 place-items-center rounded-full text-[12.5px] font-extrabold transition-colors",
                state === "done" && "bg-brand/20 text-brand-deep",
                state === "active" && "bg-ink text-white shadow-soft-dark",
                state === "idle" && "bg-surface-2 text-text-subtle",
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
      <CeleryMark className={logoSize} />
      <h1
        className={cn(
          "mt-4 font-extrabold tracking-[-0.03em] text-ink",
          titleSize,
        )}
      >
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1.5 text-[12.5px] font-semibold text-muted-foreground">
          {subtitle}
        </p>
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
          className="group flex w-full items-center gap-4 rounded-[22px] border border-border-soft bg-surface p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-ink hover:shadow-soft-dark"
        >
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep transition-colors group-hover:bg-brand group-hover:text-ink">
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15.5px] font-extrabold tracking-[-0.02em] text-ink">
              일하고 싶어요
            </p>
            <p className="mt-0.5 text-[12.5px] font-medium leading-relaxed text-muted-foreground">
              빈 시간에 맞는 일자리를 찾고 싶어요
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-text-subtle transition-colors group-hover:text-ink" />
        </button>

        <button
          onClick={() => onRoleSelect("business")}
          className="group flex w-full items-center gap-4 rounded-[22px] border border-border-soft bg-surface p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-ink hover:shadow-soft-dark"
        >
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-surface-2 text-ink transition-colors group-hover:bg-ink group-hover:text-white">
            <Store className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15.5px] font-extrabold tracking-[-0.02em] text-ink">
              사람을 구해요
            </p>
            <p className="mt-0.5 text-[12.5px] font-medium leading-relaxed text-muted-foreground">
              필요할 때 딱 맞는 인력을 구하고 싶어요
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-text-subtle transition-colors group-hover:text-ink" />
        </button>
      </div>

      <div className="mt-7 text-center">
        <p className="text-[12.5px] font-medium text-muted-foreground">
          이미 계정이 있으세요?{" "}
          <Link
            href="/login"
            className="font-bold text-ink underline-offset-4 hover:underline"
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Worker — Step 1: 기본 정보
// ══════════════════════════════════════════════════════════════════════════
function WorkerStep1() {
  const [state, formAction, pending] = useActionState(signUpWithPassword, null);

  return (
    <div className="w-full">
      <AuthHeader title="회원가입" subtitle="2분이면 끝나요" size="sm" />

      <div className={FRAME}>
        <StepDots current={1} total={3} />

        <h2 className="text-[16.5px] font-extrabold tracking-[-0.02em] text-ink">
          기본 정보
        </h2>
        <p className="mt-1 text-[12.5px] font-medium text-muted-foreground">
          가장 빠른 방법은 카카오로 1초 가입이에요.
        </p>

        <div className="mt-5 space-y-2.5">
          <form action={signInWithKakao}>
            <button type="submit" className={BTN_KAKAO}>
              <KakaoGlyph />
              카카오로 계속하기
            </button>
          </form>
          <form action={signInWithGoogle}>
            <button type="submit" className={BTN_OUTLINE}>
              <GoogleGlyph />
              Google로 계속하기
            </button>
          </form>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-dashed border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-surface px-3 text-[11.5px] font-bold uppercase tracking-wider text-text-subtle">
              또는 이메일로
            </span>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className={LABEL}>
              이메일
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={cn(INPUT, "pl-10")}
              />
            </div>
          </div>

          <div>
            <label htmlFor="name" className={LABEL}>
              이름
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
              <input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="실명을 입력해주세요"
                className={cn(INPUT, "pl-10")}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className={LABEL}>
              비밀번호
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="8자 이상"
                className={cn(INPUT, "pl-10")}
              />
            </div>
          </div>

          {state?.error?.form && (
            <p className="text-[12.5px] font-semibold text-destructive">
              {state.error.form[0]}
            </p>
          )}
          {state?.error?.email && (
            <p className="text-[12.5px] font-semibold text-destructive">
              {state.error.email[0]}
            </p>
          )}
          {state?.error?.password && (
            <p className="text-[12.5px] font-semibold text-destructive">
              {state.error.password[0]}
            </p>
          )}

          <button type="submit" disabled={pending} className={BTN_BRAND}>
            {pending ? "처리 중..." : "다음"}
            {!pending && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <form action={signInWithMagicLink} className="mt-5 space-y-2.5">
          <p className="text-[11.5px] font-medium text-muted-foreground">
            비밀번호 없이 이메일 링크로 가입하고 싶다면
          </p>
          <div className="flex gap-2">
            <input
              name="email"
              type="email"
              inputMode="email"
              placeholder="이메일 주소"
              className={cn(INPUT, "flex-1")}
              aria-label="매직 링크 이메일"
            />
            <button
              type="submit"
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-full border border-border bg-surface px-5 text-[13px] font-extrabold tracking-tight text-ink transition-colors hover:border-ink hover:bg-surface-2"
            >
              링크 받기
            </button>
          </div>
        </form>
      </div>

      <p className="mt-6 text-center text-[11.5px] font-medium leading-relaxed text-muted-foreground">
        가입하면{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
          이용약관
        </Link>
        과{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
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
            <h2 className="text-[16.5px] font-extrabold tracking-[-0.02em] text-ink">
              활동 정보
            </h2>
            <p className="mt-1 text-[12.5px] font-medium text-muted-foreground">
              지금 건너뛰고 나중에 채워도 괜찮아요.
            </p>
          </div>
          <button
            type="button"
            onClick={onNext}
            className="shrink-0 text-[12.5px] font-bold text-text-subtle underline-offset-4 hover:text-ink hover:underline"
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
              <label htmlFor="birth" className={LABEL}>
                생년월일
              </label>
              <input id="birth" type="date" className={cn(INPUT, "tabnum")} />
            </div>
            <div>
              <label htmlFor="gender" className={LABEL}>
                성별
              </label>
              <select
                id="gender"
                className={cn(
                  INPUT,
                  "appearance-none pr-9 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%23818181%22><path d=%22M5.5 8.5L10 13l4.5-4.5%22 stroke=%22%23818181%22 stroke-width=%221.5%22 fill=%22none%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')] bg-no-repeat bg-[right_12px_center]",
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
            <label htmlFor="region" className={LABEL}>
              활동 지역
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
              <input
                id="region"
                placeholder="예: 강남구, 서초구"
                className={cn(INPUT, "pl-10")}
              />
            </div>
          </div>

          <div>
            <label className={LABEL}>
              관심 직종{" "}
              <span className="font-medium text-text-subtle">(선택)</span>
            </label>
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
                      "inline-flex h-9 items-center rounded-full border px-3.5 text-[12.5px] font-bold tracking-tight transition-colors",
                      on
                        ? "border-ink bg-ink text-white"
                        : "border-border bg-surface text-muted-foreground hover:border-ink hover:text-ink",
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onBack}
              className={cn(BTN_OUTLINE, "flex-1")}
            >
              <ArrowLeft className="h-4 w-4" />
              이전
            </button>
            <button type="submit" className={cn(BTN_BRAND, "flex-[1.5]")}>
              다음
              <ArrowRight className="h-4 w-4" />
            </button>
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
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand text-ink shadow-soft-green">
          <Check className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <h2 className="mt-6 text-[22px] font-extrabold tracking-[-0.03em] text-ink">
          가입 완료!
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-[14px] font-medium leading-[1.7] text-muted-foreground">
          샐러리잡에 오신 걸 환영해요.
          <br />내 주변 일자리를 바로 확인해 볼까요?
        </p>

        <div className="mt-8 space-y-2.5">
          <Link href="/" className={BTN_BRAND}>
            내 주변 일자리 보러가기
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/my/availability" className={BTN_OUTLINE}>
            가용시간 등록하기
          </Link>
          <Link
            href="/my/profile"
            className="inline-flex h-10 w-full items-center justify-center rounded-full text-[12.5px] font-bold text-text-subtle transition-colors hover:text-ink"
          >
            프로필 더 채우기
          </Link>
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
        <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-ink text-white shadow-soft-dark">
          <Store className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-[22px] font-extrabold tracking-[-0.03em] text-ink">
          업체 회원가입
        </h1>
        <p className="mt-1.5 text-[12.5px] font-semibold text-muted-foreground">
          사업자 인증 후 구인 공고를 등록할 수 있어요
        </p>
      </div>

      <div className={FRAME}>
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="biz-name" className={LABEL}>
              담당자 이름
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
              <input
                id="biz-name"
                name="name"
                autoComplete="name"
                placeholder="이름"
                className={cn(INPUT, "pl-10")}
              />
            </div>
          </div>

          <div>
            <label htmlFor="biz-email" className={LABEL}>
              이메일
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
              <input
                id="biz-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="email@company.com"
                className={cn(INPUT, "pl-10")}
              />
            </div>
          </div>

          <div>
            <label htmlFor="biz-pw" className={LABEL}>
              비밀번호
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
              <input
                id="biz-pw"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="8자 이상"
                className={cn(INPUT, "pl-10")}
              />
            </div>
          </div>

          {state?.error?.form && (
            <p className="text-[12.5px] font-semibold text-destructive">
              {state.error.form[0]}
            </p>
          )}

          <button type="submit" disabled={pending} className={BTN_INK}>
            {pending ? "처리 중..." : "가입하기"}
            {!pending && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      </div>

      <div className="mt-6 text-center">
        <p className="text-[12.5px] font-medium text-muted-foreground">
          Worker로 가입하시나요?{" "}
          <Link
            href="/signup?role=worker"
            className="font-bold text-ink underline-offset-4 hover:underline"
          >
            일자리 찾기
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-[11.5px] font-medium leading-relaxed text-muted-foreground">
        가입하면{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
          이용약관
        </Link>
        과{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
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
