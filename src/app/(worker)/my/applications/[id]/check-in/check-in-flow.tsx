"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MockApplication } from "@/lib/types/job";
import { calculateEarnings, formatWorkDate } from "@/lib/job-utils";
import { formatMoney } from "@/lib/format";
import {
  ArrowLeft,
  QrCode,
  Clock,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Camera,
  Loader2,
  PartyPopper,
  Calendar,
  AlertTriangle,
  LogOut,
  Navigation,
} from "lucide-react";

type Mode = "check-in" | "check-out";
type Stage = "ready" | "scanning" | "confirmed";

export function CheckInFlow({ application }: { application: MockApplication }) {
  const [mode, setMode] = useState<Mode>("check-in");
  const [stage, setStage] = useState<Stage>("ready");
  const [now, setNow] = useState<Date>(new Date());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [checkedInAt, setCheckedInAt] = useState<Date | null>(null);

  const { job } = application;

  // Tick clock
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  // Track elapsed after check-in
  useEffect(() => {
    if (!checkedInAt) return;
    const iv = setInterval(() => {
      setElapsedMs(Date.now() - checkedInAt.getTime());
    }, 1000);
    return () => clearInterval(iv);
  }, [checkedInAt]);

  const formatClock = (d: Date) =>
    `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;

  const formatElapsed = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  };

  const handleScan = () => {
    setStage("scanning");
    setTimeout(() => {
      if (mode === "check-in") {
        setCheckedInAt(new Date());
      }
      setStage("confirmed");
    }, 1500);
  };

  const handleContinue = () => {
    if (mode === "check-in") {
      setMode("check-out");
      setStage("ready");
    }
  };

  // ---------------------------------------------------------------------
  // CHECK-OUT confirmed state: show settlement
  // ---------------------------------------------------------------------
  if (mode === "check-out" && stage === "confirmed") {
    const earnings = calculateEarnings(job);
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-24 h-24 rounded-full bg-brand/10 flex items-center justify-center mb-5">
            <PartyPopper className="w-12 h-12 text-brand" />
          </div>
          <h1 className="text-2xl font-bold mb-1">수고하셨습니다!</h1>
          <p className="text-sm text-muted-foreground mb-6">
            근무가 완료되었어요. 정산을 진행합니다.
          </p>

          <div className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white p-5 mb-4">
            <p className="text-xs opacity-90 mb-1">정산 금액</p>
            <p className="text-3xl font-bold">{formatMoney(earnings)}</p>
            <div className="mt-4 pt-4 border-t border-white/20 space-y-1 text-xs">
              <div className="flex justify-between opacity-90">
                <span>근무 시간</span>
                <span>{formatElapsed(elapsedMs) || `${job.workHours}시간`}</span>
              </div>
              <div className="flex justify-between opacity-90">
                <span>입금 예정</span>
                <span>1~3분 내 본인 계좌</span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-xl bg-muted/50 p-3 text-[11px] text-muted-foreground leading-relaxed">
            <Zap className="w-3 h-3 inline text-brand mr-1" />
            정산 완료 후 알림으로 영수증을 보내드려요.
          </div>
        </div>

        <div className="border-t border-border bg-background/95 backdrop-blur p-4">
          <div className="max-w-lg mx-auto space-y-2">
            <Link
              href={`/my/applications/${application.id}/review`}
              className="w-full h-12 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold flex items-center justify-center shadow-lg shadow-brand/20 transition-colors"
            >
              업체 리뷰 남기기
            </Link>
            <Link
              href="/my"
              className="w-full h-11 rounded-xl border border-border hover:bg-muted text-sm font-medium flex items-center justify-center transition-colors"
            >
              마이페이지로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // CHECK-IN confirmed state: show working screen
  // ---------------------------------------------------------------------
  if (mode === "check-in" && stage === "confirmed") {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
            <Link
              href="/my"
              className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <p className="text-sm font-bold flex-1">근무 중</p>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/10 text-green-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              LIVE
            </span>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
          {/* Working clock */}
          <div className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white p-6 text-center">
            <p className="text-xs opacity-90 mb-2">근무 중 경과 시간</p>
            <p className="text-5xl font-bold tabular-nums tracking-tight">
              {formatElapsed(elapsedMs)}
            </p>
            <p className="text-[11px] opacity-90 mt-2">
              {checkedInAt && `${formatClock(checkedInAt)}에 체크인`}
            </p>
          </div>

          {/* Job info */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-2xl shrink-0">
                {job.business.logo}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground truncate">
                  {job.business.name}
                </p>
                <p className="font-bold text-sm line-clamp-1">{job.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  근무 시간 {job.startTime}~{job.endTime}
                </p>
              </div>
            </div>
          </div>

          {/* Safety tips */}
          <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed text-blue-900 dark:text-blue-100">
                <p className="font-bold mb-1">근무 중 안내</p>
                <p className="text-blue-800/80 dark:text-blue-200/80">
                  안전하게 근무하시고, 긴급 상황 시 하단 문의 버튼을 이용해주세요.
                </p>
              </div>
            </div>
          </div>

          {/* Contact support */}
          <button className="w-full h-11 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors">
            긴급 문의 / 상황 보고
          </button>
        </div>

        {/* Sticky check-out CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border">
          <div className="max-w-lg mx-auto px-4 py-3">
            <button
              type="button"
              onClick={handleContinue}
              className="w-full h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold flex items-center justify-center gap-1.5 shadow-lg transition-colors"
            >
              <LogOut className="w-4 h-4" /> 근무 종료 (QR 체크아웃)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Scanning animation
  // ---------------------------------------------------------------------
  if (stage === "scanning") {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
        <div className="relative w-64 h-64 rounded-2xl border-2 border-brand/50 mb-6 overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/5 bg-[size:20px_20px]" />
          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand rounded-tl-2xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand rounded-tr-2xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand rounded-bl-2xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand rounded-br-2xl" />
          {/* Scan line */}
          <div className="absolute inset-x-0 top-0 h-1 bg-brand shadow-[0_0_12px_theme(colors.brand.DEFAULT)] animate-[scanline_1.5s_ease-in-out_infinite]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-brand animate-spin" />
          </div>
        </div>
        <p className="text-sm font-medium">QR 인식 중...</p>
        <p className="text-xs text-white/60 mt-1">
          매장 QR 코드를 프레임 안에 맞춰주세요
        </p>
        <style>{`
          @keyframes scanline {
            0% { transform: translateY(0); }
            50% { transform: translateY(250px); }
            100% { transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Default: Ready to scan
  // ---------------------------------------------------------------------
  const isCheckIn = mode === "check-in";
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/my"
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <p className="text-sm font-bold flex-1">
            {isCheckIn ? "QR 체크인" : "QR 체크아웃"}
          </p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Current time */}
        <div className="text-center py-4">
          <p className="text-[11px] text-muted-foreground mb-1">현재 시각</p>
          <p className="text-4xl font-bold tabular-nums tracking-tight">
            {formatClock(now)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatWorkDate(job.workDate)}
          </p>
        </div>

        {/* Job card */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-2xl shrink-0">
              {job.business.logo}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">
                {job.business.name}
              </p>
              <p className="font-bold text-sm line-clamp-1">{job.title}</p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  {job.startTime}~{job.endTime}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-start gap-2 text-xs">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{job.business.address}</p>
                {job.business.addressDetail && (
                  <p className="text-muted-foreground mt-0.5">
                    {job.business.addressDetail}
                  </p>
                )}
              </div>
              <button className="shrink-0 text-[11px] font-medium text-brand flex items-center gap-0.5">
                <Navigation className="w-3 h-3" /> 길찾기
              </button>
            </div>
          </div>
        </div>

        {/* QR Frame */}
        <div className="rounded-3xl bg-muted/50 p-8 text-center">
          <div className="relative w-40 h-40 mx-auto mb-4 rounded-2xl bg-background border-2 border-dashed border-border flex items-center justify-center">
            <QrCode className="w-16 h-16 text-muted-foreground/40" />
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-brand rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-brand rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-brand rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-brand rounded-br-2xl" />
          </div>
          <p className="text-sm font-bold mb-1">
            {isCheckIn ? "매장 QR 코드를 스캔하세요" : "체크아웃 QR을 스캔하세요"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isCheckIn
              ? "매장 카운터 또는 출입구의 QR 코드를 찾아주세요"
              : "매장 QR 코드로 근무를 마무리합니다"}
          </p>
        </div>

        {/* Important reminders */}
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/30 p-4">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
              꼭 확인해주세요
            </p>
          </div>
          <ul className="space-y-1.5 text-[11px] text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
              <span>매장에 도착한 뒤 담당자에게 먼저 인사해주세요.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                {isCheckIn
                  ? "체크인은 근무 시작 10분 전부터 가능합니다."
                  : "근무 종료 직전에 체크아웃해주세요."}
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
              <span>위치 정보가 자동으로 기록됩니다.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <button
            type="button"
            onClick={handleScan}
            className="w-full h-12 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-brand/20 transition-colors"
          >
            <Camera className="w-4 h-4" />
            {isCheckIn ? "QR 체크인 시작" : "QR 체크아웃 시작"}
          </button>
        </div>
      </div>
    </div>
  );
}
