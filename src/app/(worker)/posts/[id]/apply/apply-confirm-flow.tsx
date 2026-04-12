"use client";

import { useState } from "react";
import Link from "next/link";
import type { Job } from "@/lib/types/job";
import { calculateEarnings, formatWorkDate } from "@/lib/job-utils";
import { formatMoney } from "@/lib/format";
import { applyOneTap } from "./actions";
import { applicationErrorToKorean } from "@/lib/errors/application-errors";
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
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-24 h-24 rounded-full bg-brand/10 flex items-center justify-center mb-5 relative">
            <PartyPopper className="w-12 h-12 text-brand" />
            <div className="absolute inset-0 rounded-full border-2 border-brand animate-ping opacity-25" />
          </div>
          <h1 className="text-2xl font-bold mb-2">지원 확정!</h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            면접 없이 바로 확정됐어요.
            <br />
            근무 당일 시간에 맞춰 방문해주세요.
          </p>

          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-2xl">
                {job.business.logo}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground">
                  {job.business.name}
                </p>
                <p className="font-bold text-sm line-clamp-1">{job.title}</p>
              </div>
            </div>
            <div className="pt-3 border-t border-border space-y-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>
                  {formatWorkDate(job.workDate)} · {job.startTime}~{job.endTime}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{job.business.address}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-muted-foreground">예상 수입</span>
                <span className="font-bold text-brand text-sm">
                  {formatMoney(earnings)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-background/95 backdrop-blur p-4 space-y-2">
          <div className="max-w-lg mx-auto space-y-2">
            <Link
              href="/my/applications"
              className="w-full h-12 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold flex items-center justify-center shadow-lg shadow-brand/20 transition-colors"
            >
              내 지원 목록 보기
            </Link>
            <Link
              href="/home"
              className="w-full h-11 rounded-xl border border-border hover:bg-muted font-medium text-sm flex items-center justify-center transition-colors"
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
        <p className="text-sm font-medium">매칭 중...</p>
        <p className="text-xs text-muted-foreground mt-1">잠시만 기다려주세요</p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-xl font-bold mb-2">지원하지 못했어요</h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-xs">
            {errorMessage ?? "알 수 없는 오류가 발생했습니다"}
          </p>
        </div>

        <div className="border-t border-border bg-background/95 backdrop-blur p-4">
          <div className="max-w-lg mx-auto space-y-2">
            <button
              type="button"
              onClick={handleRetry}
              className="w-full h-12 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold flex items-center justify-center shadow-lg shadow-brand/20 transition-colors"
            >
              다시 시도
            </button>
            <Link
              href="/home"
              className="w-full h-11 rounded-xl border border-border hover:bg-muted text-sm font-medium flex items-center justify-center transition-colors"
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
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href={`/posts/${job.id}`}
            aria-label="뒤로"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="text-sm font-bold flex-1">지원 확정</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Intro */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 bg-brand/10 text-brand text-xs font-bold px-3 py-1.5 rounded-full mb-2">
            <Sparkles className="w-3 h-3" /> 면접 없음 · 원탭 확정
          </div>
          <h1 className="text-xl font-bold">지원을 확정할까요?</h1>
          <p className="text-xs text-muted-foreground mt-1">
            버튼을 누르는 즉시 근무가 확정됩니다
          </p>
        </div>

        {/* Job Card */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl bg-brand/10 flex items-center justify-center text-2xl shrink-0">
              {job.business.logo}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-[11px] text-muted-foreground truncate">
                  {job.business.name}
                </p>
                {job.business.verified && (
                  <ShieldCheck className="w-3 h-3 text-brand shrink-0" />
                )}
              </div>
              <h2 className="font-bold text-sm line-clamp-2">{job.title}</h2>
            </div>
          </div>

          <div className="space-y-2.5 text-sm border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>{formatWorkDate(job.workDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>
                {job.startTime} ~ {job.endTime} ({job.workHours}시간)
              </span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="flex-1 min-w-0">{job.business.address}</span>
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="rounded-2xl bg-brand text-white p-5">
          <p className="text-xs opacity-90 mb-1">예상 수입 (교통비 포함)</p>
          <p className="text-3xl font-bold">{formatMoney(earnings)}</p>
          <p className="text-[11px] opacity-90 mt-2">
            ※ 근무 완료 후 본인 명의 계좌로 즉시 입금
          </p>
        </div>

        {/* Important notices */}
        <div className="rounded-2xl border border-brand/30 bg-brand-light p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <AlertTriangle className="w-4 h-4 text-brand-deep" />
            <h3 className="text-sm font-bold text-brand-deep">
              꼭 확인해주세요
            </h3>
          </div>
          <ul className="space-y-2 text-xs leading-relaxed text-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-deep shrink-0 mt-0.5" />
              <span>
                <strong>노쇼(무단 불참) 시</strong> 평점이 크게 하락하고 이후
                매칭이 제한됩니다.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-deep shrink-0 mt-0.5" />
              <span>
                근무 <strong>10분 전까지 도착</strong>하여 QR로 체크인해주세요.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-deep shrink-0 mt-0.5" />
              <span>
                취소는 <strong>근무 24시간 전까지</strong>만 무료로 가능합니다.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-deep shrink-0 mt-0.5" />
              <span>
                정확한 주소·담당자 연락처는 확정 직후 알림으로 전달됩니다.
              </span>
            </li>
          </ul>
        </div>

        {/* Agreement */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none px-1">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-border accent-brand"
          />
          <span className="text-xs leading-relaxed text-muted-foreground">
            위 안내사항을 모두 확인했으며, 성실하게 근무할 것을 약속합니다.
          </span>
        </label>
      </div>

      {/* Sticky Confirm CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <button
            type="button"
            disabled={!agreed}
            onClick={handleConfirm}
            className="w-full h-13 py-3.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-brand/20 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4 fill-white" />
            {agreed ? `${formatMoney(earnings)} 원탭 지원` : "약관 동의 후 진행"}
          </button>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            버튼을 누르면 즉시 근무가 확정됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
