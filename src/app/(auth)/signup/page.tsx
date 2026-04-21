"use client";

import { Suspense, useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  Lock,
  Mail,
  MapPin,
  Store,
  User,
} from "lucide-react";
import {
  signInWithGoogle,
  signInWithKakao,
  signInWithMagicLink,
  signUpWithPassword,
} from "./actions";
import { CeleryMark } from "@/components/brand/celery-mark";
import { cn } from "@/lib/utils";

type Role = "worker" | "business";

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
const PASSWORD_HELP =
  "비밀번호는 8자 이상이며 영문과 숫자를 모두 포함해야 합니다.";

const BUSINESS_CATEGORIES = [
  { value: "food", label: "외식·카페" },
  { value: "retail", label: "판매·유통" },
  { value: "logistics", label: "물류·배송" },
  { value: "office", label: "사무·행정" },
  { value: "event", label: "행사·이벤트" },
  { value: "cleaning", label: "청소·정리" },
  { value: "education", label: "교육·과외" },
  { value: "tech", label: "IT·디자인" },
] as const;

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="mt-1 text-[12.5px] font-semibold text-destructive">
      {messages[0]}
    </p>
  );
}

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

function RoleSelect({ onRoleSelect }: { onRoleSelect: (role: Role) => void }) {
  return (
    <div className="w-full">
      <AuthHeader title="회원가입" subtitle="어떤 방식으로 시작할까요?" />

      <div className="space-y-3">
        <button
          type="button"
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
              가능한 시간에 맞는 일자리를 찾습니다.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-text-subtle transition-colors group-hover:text-ink" />
        </button>

        <button
          type="button"
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
              사업장 인증 후 필요한 인력을 모집합니다.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-text-subtle transition-colors group-hover:text-ink" />
        </button>
      </div>

      <p className="mt-7 text-center text-[12.5px] font-medium text-muted-foreground">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="font-bold text-ink underline-offset-4 hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}

function SocialSignupButtons() {
  return (
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
  );
}

function TermsText() {
  return (
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
  );
}

function WorkerSignupForm({ onBack }: { onBack: () => void }) {
  const [state, formAction, pending] = useActionState(signUpWithPassword, null);

  return (
    <div className="w-full">
      <AuthHeader title="회원가입" subtitle="2분이면 시작할 수 있어요." size="sm" />

      <div className={FRAME}>
        <button
          type="button"
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-1 text-[12.5px] font-bold text-text-subtle underline-offset-4 hover:text-ink hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          가입 유형 다시 선택
        </button>

        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-brand/20 text-brand-deep">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-[16.5px] font-extrabold tracking-[-0.02em] text-ink">
              워커 계정 만들기
            </h2>
            <p className="mt-0.5 text-[12.5px] font-medium text-muted-foreground">
              이름, 이메일, 비밀번호만 입력하면 바로 시작합니다.
            </p>
          </div>
        </div>

        <SocialSignupButtons />

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

        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="role" value="WORKER" />

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
            <FieldError messages={state?.error?.email} />
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
                placeholder="실명을 입력해 주세요"
                className={cn(INPUT, "pl-10")}
              />
            </div>
            <FieldError messages={state?.error?.name} />
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
                placeholder="영문+숫자 8자 이상"
                aria-describedby="worker-password-help"
                className={cn(INPUT, "pl-10")}
              />
            </div>
            <p
              id="worker-password-help"
              className="mt-1.5 text-[11.5px] font-semibold text-muted-foreground"
            >
              {PASSWORD_HELP}
            </p>
            <FieldError messages={state?.error?.password} />
          </div>

          <FieldError messages={state?.error?.form} />

          <button type="submit" disabled={pending} className={BTN_BRAND}>
            {pending ? "처리 중..." : "가입하기"}
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

      <TermsText />
    </div>
  );
}

function BusinessSignupForm({ onBack }: { onBack: () => void }) {
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
          사업장 정보를 먼저 등록한 뒤 공고를 게시합니다.
        </p>
      </div>

      <div className={FRAME}>
        <button
          type="button"
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-1 text-[12.5px] font-bold text-text-subtle underline-offset-4 hover:text-ink hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          가입 유형 다시 선택
        </button>

        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="role" value="BUSINESS" />

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
                placeholder="담당자 이름"
                className={cn(INPUT, "pl-10")}
              />
            </div>
            <FieldError messages={state?.error?.name} />
          </div>

          <div>
            <label htmlFor="business-name" className={LABEL}>
              사업장 이름
            </label>
            <div className="relative">
              <Store className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
              <input
                id="business-name"
                name="businessName"
                autoComplete="organization"
                placeholder="예: 스타벅스 역삼점"
                className={cn(INPUT, "pl-10")}
              />
            </div>
            <FieldError messages={state?.error?.businessName} />
          </div>

          <div>
            <label htmlFor="business-category" className={LABEL}>
              업종
            </label>
            <select
              id="business-category"
              name="businessCategory"
              defaultValue=""
              className={cn(
                INPUT,
                "appearance-none pr-9 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%23818181%22><path d=%22M5.5 8.5L10 13l4.5-4.5%22 stroke=%22%23818181%22 stroke-width=%221.5%22 fill=%22none%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')] bg-no-repeat bg-[right_12px_center]",
              )}
            >
              <option value="" disabled>
                선택
              </option>
              {BUSINESS_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            <FieldError messages={state?.error?.businessCategory} />
          </div>

          <div>
            <label htmlFor="business-address" className={LABEL}>
              사업장 주소
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
              <input
                id="business-address"
                name="businessAddress"
                autoComplete="street-address"
                placeholder="예: 서울 강남구 테헤란로"
                className={cn(INPUT, "pl-10")}
              />
            </div>
            <FieldError messages={state?.error?.businessAddress} />
          </div>

          <div>
            <label htmlFor="business-reg-number" className={LABEL}>
              사업자등록번호
              <span className="ml-1 font-medium text-text-subtle">(선택)</span>
            </label>
            <input
              id="business-reg-number"
              name="businessRegNumber"
              inputMode="numeric"
              placeholder="123-45-67890"
              className={cn(INPUT, "tabnum")}
            />
            <p className="mt-1.5 text-[11.5px] font-semibold text-muted-foreground">
              등록증 업로드 후 OCR 정보가 일치하면 인증 완료로 표시됩니다.
            </p>
            <FieldError messages={state?.error?.businessRegNumber} />
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
            <FieldError messages={state?.error?.email} />
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
                placeholder="영문+숫자 8자 이상"
                aria-describedby="business-password-help"
                className={cn(INPUT, "pl-10")}
              />
            </div>
            <p
              id="business-password-help"
              className="mt-1.5 text-[11.5px] font-semibold text-muted-foreground"
            >
              {PASSWORD_HELP}
            </p>
            <FieldError messages={state?.error?.password} />
          </div>

          <FieldError messages={state?.error?.form} />

          <button type="submit" disabled={pending} className={BTN_INK}>
            {pending ? "처리 중..." : "가입하기"}
            {!pending && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-[12.5px] font-medium text-muted-foreground">
        워커로 가입하시나요?{" "}
        <button
          type="button"
          onClick={onBack}
          className="font-bold text-ink underline-offset-4 hover:underline"
        >
          일자리 찾기
        </button>
      </p>

      <TermsText />
    </div>
  );
}

function SignupFlow() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const initialRole: Role | null =
    roleParam === "worker" || roleParam === "business" ? roleParam : null;
  const [role, setRole] = useState<Role | null>(initialRole);

  if (!role) {
    return <RoleSelect onRoleSelect={setRole} />;
  }

  if (role === "business") {
    return <BusinessSignupForm onBack={() => setRole(null)} />;
  }

  return <WorkerSignupForm onBack={() => setRole(null)} />;
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupFlow />
    </Suspense>
  );
}
