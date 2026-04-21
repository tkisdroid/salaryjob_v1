"use client";

import { useState } from "react";
import Link from "next/link";
import type { Job } from "@/lib/types/job";
import { calculateEarnings, formatWorkDate } from "@/lib/job-utils";
import { formatMoney } from "@/lib/format";
import { applyOneTap } from "./actions";
import { applicationErrorToKorean } from "@/lib/errors/application-errors";
import { BackButton } from "@/components/shared/back-button";
import {
  ArrowLeft,
  Zap,
  Clock,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  PartyPopper,
  Loader2,
} from "lucide-react";

type Step = "review" | "confirming" | "confirmed" | "error";

export function ApplyConfirmFlow({ job }: { job: Job }) {
  const [step, setStep] = useState<Step>("review");
  const [agreed, setAgreed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const earnings = calculateEarnings(job);

  // Phase 4 Plan 04-08 — real applyOneTap Server Action wiring.
  // Replaces the Phase 1 setTimeout mock. applyOneTap returns a
  // discriminated union; we map error codes to Korean via the shared
  // taxonomy so T-04-21 (info disclosure) stays mitigated.
  const handleConfirm = async () => {
    setStep("confirming");
    setErrorMessage(null);
    const result = await applyOneTap({ jobId: job.id });
    if (result.success) {
      setStep("confirmed");
    } else {
      setErrorMessage(applicationErrorToKorean(result.error));
      setStep("error");
    }
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setStep("review");
  };

  if (step === "confirmed") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="relative mb-5 grid h-24 w-24 place-items-center rounded-full bg-brand text-ink shadow-soft-green">
            <PartyPopper className="h-12 w-12" />
            <div className="absolute inset-0 animate-ping rounded-full border-2 border-brand opacity-25" />
          </div>
          <h1 className="mb-2 text-[24px] font-extrabold tracking-[-0.03em] text-ink">
            지원 완료!
          </h1>
          <p className="mb-8 text-[13px] font-semibold leading-relaxed text-muted-foreground">
            지원이 접수되었어요.
            <br />
            사업자 확인 후 자동 확정됩니다.
          </p>

          <div className="mb-6 w-full max-w-sm rounded-[22px] border border-border-soft bg-surface p-4 shadow-soft-md">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-2xl">
                {job.business.logo}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-semibold text-muted-foreground">
                  {job.business.name}
                </p>
                <p className="line-clamp-1 text-[14px] font-extrabold tracking-[-0.02em] text-ink">
                  {job.title}
                </p>
              </div>
            </div>
            <div className="tabnum space-y-2 border-t border-border-soft pt-3 text-[12px] font-medium">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatWorkDate(job.workDate)} · {job.startTime}~{job.endTime}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{job.business.address}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border-soft pt-2">
                <span className="font-semibold text-muted-foreground">
                  예상 수입
                </span>
                <span className="text-[13.5px] font-extrabold text-brand-deep">
                  {formatMoney(earnings)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-border-soft bg-surface/95 p-4 backdrop-blur-[12px]">
          <div className="mx-auto max-w-lg space-y-2">
            <Link
              href="/my/applications"
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-brand text-[14px] font-extrabold tracking-tight text-ink transition-all hover:bg-brand-dark hover:shadow-soft-green"
            >
              내 지원 목록 보기
            </Link>
            <Link
              href="/home"
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border bg-surface text-[13px] font-bold text-ink transition-colors hover:border-ink hover:bg-surface-2"
            >
              다른 일자리 더 보기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (step === "confirming") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-ink" />
        <p className="text-[14px] font-extrabold tracking-tight text-ink">
          매칭 중...
        </p>
        <p className="mt-1 text-[12px] font-medium text-muted-foreground">
          잠시만 기다려주세요
        </p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-5 grid h-20 w-20 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <h1 className="mb-2 text-[20px] font-extrabold tracking-[-0.02em] text-ink">
            지원하지 못했어요
          </h1>
          <p className="mb-8 max-w-xs text-[13px] font-semibold leading-relaxed text-muted-foreground">
            {errorMessage ?? "알 수 없는 오류가 발생했습니다"}
          </p>
        </div>

        <div className="border-t border-border-soft bg-surface/95 p-4 backdrop-blur-[12px]">
          <div className="mx-auto max-w-lg space-y-2">
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-ink text-[14px] font-extrabold tracking-tight text-white transition-all hover:bg-black hover:shadow-soft-dark"
            >
              다시 시도
            </button>
            <Link
              href="/home"
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border bg-surface text-[13px] font-bold text-ink transition-colors hover:border-ink hover:bg-surface-2"
            >
              홈으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border-soft bg-surface/95 backdrop-blur-[12px]">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <BackButton
            fallbackHref={`/posts/${job.id}`}
            ariaLabel="뒤로"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-ink transition-colors hover:border-ink hover:bg-surface-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </BackButton>
          <p className="flex-1 text-[16px] font-extrabold tracking-[-0.02em] text-ink">
            지원하기
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 py-5">
        {/* Intro */}
        <div className="text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] px-3 py-1.5 text-[11.5px] font-extrabold tracking-tight text-brand-deep">
            <Sparkles className="h-3 w-3" /> 면접 없음 · 원탭 지원
          </div>
          <h1 className="text-[20px] font-extrabold tracking-[-0.025em] text-ink">
            지원할까요?
          </h1>
          <p className="mt-1 text-[12.5px] font-semibold text-muted-foreground">
            버튼을 누르면 지원이 접수됩니다
          </p>
        </div>

        {/* Job Card */}
        <div className="rounded-[22px] border border-border-soft bg-surface p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[14px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-2xl">
              {job.business.logo}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="truncate text-[11.5px] font-semibold text-muted-foreground">
                  {job.business.name}
                </p>
                {job.business.verified && (
                  <ShieldCheck className="h-3 w-3 shrink-0 text-brand-deep" />
                )}
              </div>
              <h2 className="line-clamp-2 text-[14.5px] font-extrabold tracking-[-0.02em] text-ink">
                {job.title}
              </h2>
            </div>
          </div>

          <div className="tabnum space-y-2.5 border-t border-border-soft pt-3 text-[13px] font-medium text-ink">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-text-subtle" />
              <span>{formatWorkDate(job.workDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-text-subtle" />
              <span>
                {job.startTime} ~ {job.endTime} ({job.workHours}시간)
              </span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-text-subtle" />
              <span className="min-w-0 flex-1">{job.business.address}</span>
            </div>
          </div>
        </div>

        {/* Earnings — ink hero (neobank) */}
        <div className="rounded-[22px] bg-ink p-5 text-white shadow-soft-dark">
          <p className="text-[11.5px] font-bold uppercase tracking-wider text-white/70">
            예상 수입 (교통비 포함)
          </p>
          <p className="tabnum mt-1 text-[32px] font-extrabold tracking-[-0.03em] text-brand">
            {formatMoney(earnings)}
          </p>
          <p className="mt-2 text-[11px] font-medium text-white/70">
            ※ 근무 완료 후 본인 명의 계좌로 즉시 입금
          </p>
        </div>

        {/* Important notices */}
        <div className="rounded-[18px] border border-dashed border-border bg-surface-2/60 p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-brand-deep" />
            <h3 className="text-[13px] font-extrabold tracking-tight text-ink">
              꼭 확인해주세요
            </h3>
          </div>
          <ul className="space-y-2 text-[12px] font-medium leading-relaxed text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-deep" />
              <span>
                <strong className="font-extrabold text-ink">
                  노쇼(무단 불참) 시
                </strong>{" "}
                평점이 크게 하락하고 이후 매칭이 제한됩니다.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-deep" />
              <span>
                근무{" "}
                <strong className="font-extrabold text-ink">
                  10분 전까지 도착
                </strong>
                하여 QR로 체크인해주세요.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-deep" />
              <span>
                취소는{" "}
                <strong className="font-extrabold text-ink">
                  근무 24시간 전까지
                </strong>
                만 무료로 가능합니다.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-deep" />
              <span>
                정확한 주소·담당자 연락처는 확정 직후 알림으로 전달됩니다.
              </span>
            </li>
          </ul>
        </div>

        {/* Agreement */}
        <label className="flex cursor-pointer select-none items-start gap-2.5 px-1">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border accent-ink"
          />
          <span className="text-[12px] font-medium leading-relaxed text-muted-foreground">
            위 안내사항을 모두 확인했으며, 성실하게 근무할 것을 약속합니다.
          </span>
        </label>
      </div>

      {/* Sticky Confirm CTA — brand green (긍정/전진 exception) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-soft bg-surface/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-[12px]">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            disabled={!agreed}
            onClick={handleConfirm}
            className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-[14px] font-extrabold tracking-tight text-ink transition-all hover:bg-brand-dark hover:shadow-soft-green active:scale-[0.98] disabled:bg-surface-2 disabled:text-text-subtle disabled:shadow-none disabled:cursor-not-allowed"
          >
            <Zap className="h-4 w-4 fill-ink" />
            {agreed ? `${formatMoney(earnings)} 지원하기` : "약관 동의 후 진행"}
          </button>
          <p className="tabnum mt-2 text-center text-[10.5px] font-medium text-text-subtle">
            지원 후 사업자 확인을 거쳐 자동 확정됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
