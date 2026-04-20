"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  MapPin,
  ShieldCheck,
  Navigation,
  PartyPopper,
  Loader2,
  LogOut,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { checkIn, checkOut } from "./actions";
import { applicationErrorToKorean } from "@/lib/errors/application-errors";
import { formatMoney } from "@/lib/format";
import { formatWorkDate } from "@/lib/job-utils";

// Lazy-load the camera scanner — html5-qrcode touches `window` at import
// time, so the chunk must be client-only. `ssr: false` is load-bearing.
const QrScanner = dynamic(
  () => import("@/components/worker/qr-scanner").then((m) => m.QrScanner),
  { ssr: false },
);

/**
 * Phase 4 Plan 04-08 — Worker check-in / check-out UI.
 *
 * Replaces the Phase 1 scanning-animation mock with a 5-phase state machine
 * backed by real Server Actions:
 *
 *   ready      — confirmed status, user has not tapped 체크인 yet
 *   locating   — navigator.geolocation is resolving coords
 *   working    — in_progress status, elapsed timer running
 *   scanning   — camera open, QrScanner mounted, waiting for decodedText
 *   submitting — checkOut Server Action is in flight
 *   done       — completed, shows final earnings summary
 *
 * The server enforces the same gates (ownership, state, time window,
 * geofence, QR JWT) regardless of UI phase — the UI machine is pure UX.
 */

type Phase =
  | "ready"
  | "locating"
  | "working"
  | "scanning"
  | "submitting"
  | "done";

// Shape we accept from the parent page — loose because the server component
// serializes via JSON.parse(JSON.stringify(app)) so Decimals become numbers
// and Dates become strings. Everything downstream is for display only.
export type CheckInApplication = {
  id: string;
  status:
    | "pending"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "cancelled";
  checkInAt: string | null;
  job: {
    id: string;
    title: string;
    workDate: string;
    startTime: string;
    endTime: string;
    workHours?: number | null;
    business: {
      id: string;
      name: string;
      logo?: string | null;
      address: string;
      addressDetail?: string | null;
    };
  };
};

type Props = { application: CheckInApplication };

export function CheckInFlow({ application }: Props) {
  const router = useRouter();
  const initialPhase: Phase =
    application.status === "in_progress"
      ? "working"
      : application.status === "completed"
        ? "done"
        : "ready";
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    actualHours: number;
    earnings: number;
    nightPremium: number;
  } | null>(null);

  // Live clock + elapsed timer for the working phase.
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const checkedInAt = application.checkInAt
    ? new Date(application.checkInAt)
    : null;
  const elapsedMs = checkedInAt
    ? Math.max(0, now.getTime() - checkedInAt.getTime())
    : 0;

  const { job } = application;
  const businessLogo = job.business.logo ?? "🏢";

  async function handleCheckIn() {
    setError(null);
    setPhase("locating");
    try {
      const coords = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          if (!("geolocation" in navigator)) {
            reject(new Error("geolocation_not_supported"));
            return;
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10_000,
            maximumAge: 0,
          });
        },
      );
      const res = await checkIn(application.id, {
        lat: coords.coords.latitude,
        lng: coords.coords.longitude,
      });
      if (res.success) {
        setPhase("working");
        router.refresh();
      } else {
        setError(applicationErrorToKorean(res.error));
        setPhase("ready");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "geolocation_not_supported") {
        setError("이 브라우저는 위치 정보를 지원하지 않습니다");
      } else if (/denied|permission/i.test(msg)) {
        setError("위치 권한을 허용한 뒤 다시 시도해주세요");
      } else {
        setError("위치를 확인하지 못했습니다. 다시 시도해주세요");
      }
      setPhase("ready");
    }
  }

  async function handleScan(decodedText: string) {
    // guard against double-fire from the camera scanner when the user
    // holds the phone over the QR for a few frames.
    if (phase !== "scanning") return;
    setPhase("submitting");
    setError(null);
    const res = await checkOut(application.id, decodedText);
    if (res.success) {
      setResult({
        actualHours: res.actualHours,
        earnings: res.earnings,
        nightPremium: res.nightPremium,
      });
      setPhase("done");
      router.refresh();
    } else {
      setError(applicationErrorToKorean(res.error));
      setPhase("working");
    }
  }

  const formatClock = (d: Date) =>
    `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;

  const formatElapsed = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  };

  // --------------------------------------------------------------------
  // DONE — settlement summary
  // --------------------------------------------------------------------
  if (phase === "done") {
    const earnings = result?.earnings ?? 0;
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-5 grid h-24 w-24 place-items-center rounded-full bg-brand text-ink shadow-soft-green">
            <PartyPopper className="h-12 w-12" />
          </div>
          <h1 className="mb-1 text-[24px] font-extrabold tracking-[-0.03em] text-ink">
            수고하셨습니다!
          </h1>
          <p className="mb-6 text-[13px] font-semibold text-muted-foreground">
            근무가 완료되었어요. 정산을 진행합니다.
          </p>

          <div className="mb-4 w-full max-w-sm rounded-[22px] bg-ink p-5 text-white shadow-soft-dark">
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-white/70">
              정산 금액
            </p>
            <p className="tabnum mt-1 text-[32px] font-extrabold tracking-[-0.03em]">
              {formatMoney(earnings)}
            </p>
            {result && (
              <div className="tabnum mt-4 space-y-1 border-t border-white/15 pt-4 text-[12px] font-medium">
                <div className="flex justify-between text-white/80">
                  <span>실근무 시간</span>
                  <span>{result.actualHours}시간</span>
                </div>
                {result.nightPremium > 0 && (
                  <div className="flex justify-between text-white/80">
                    <span>야간 할증</span>
                    <span>+{formatMoney(result.nightPremium)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white/80">
                  <span>입금 예정</span>
                  <span>1~3분 내 본인 계좌</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border-soft bg-surface/95 p-4 backdrop-blur-[12px]">
          <div className="mx-auto max-w-lg space-y-2">
            <Link
              href={`/my/applications/${application.id}/review`}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-brand text-[14px] font-extrabold tracking-tight text-ink transition-all hover:bg-brand-dark hover:shadow-soft-green"
            >
              업체 리뷰 남기기
            </Link>
            <Link
              href="/my/applications"
              className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border bg-surface text-[13px] font-bold text-ink transition-colors hover:border-ink hover:bg-surface-2"
            >
              지원 목록으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------
  // WORKING — in progress, elapsed timer running
  // --------------------------------------------------------------------
  if (phase === "working") {
    return (
      <div className="min-h-screen bg-background pb-28">
        <header className="sticky top-0 z-40 border-b border-border-soft bg-surface/95 backdrop-blur-[12px]">
          <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
            <Link
              href="/my/applications"
              aria-label="뒤로"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-ink transition-colors hover:border-ink hover:bg-surface-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <p className="flex-1 text-[16px] font-extrabold tracking-[-0.02em] text-ink">
              근무 중
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] px-2 py-1 text-[10px] font-extrabold tracking-tight text-brand-deep">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              LIVE
            </span>
          </div>
        </header>

        <div className="mx-auto max-w-lg space-y-4 px-4 py-5">
          {error && (
            <div className="flex items-start gap-2 rounded-[14px] border border-destructive/30 bg-destructive/5 p-3 text-[12.5px] font-semibold text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-[22px] bg-ink p-6 text-center text-white shadow-soft-dark">
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-white/70">
              근무 중 경과 시간
            </p>
            <p className="tabnum mt-2 text-[52px] font-extrabold leading-none tracking-[-0.04em]">
              {formatElapsed(elapsedMs)}
            </p>
            {checkedInAt && (
              <p className="tabnum mt-3 text-[11.5px] font-semibold text-white/70">
                {formatClock(checkedInAt)}에 체크인
              </p>
            )}
          </div>

          <div className="rounded-[18px] border border-border-soft bg-surface p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-2xl">
                {businessLogo}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-semibold text-muted-foreground">
                  {job.business.name}
                </p>
                <p className="line-clamp-1 text-[14px] font-extrabold tracking-[-0.02em] text-ink">
                  {job.title}
                </p>
                <p className="tabnum mt-0.5 text-[11.5px] font-semibold text-muted-foreground">
                  근무 시간 {job.startTime}~{job.endTime}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[14px] border border-dashed border-border bg-surface-2/60 p-4">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-deep" />
              <div className="text-[12px] leading-relaxed">
                <p className="mb-1 text-[12.5px] font-extrabold tracking-tight text-ink">
                  근무 중 안내
                </p>
                <p className="font-medium text-muted-foreground">
                  근무를 마치면 매장 담당자에게 체크아웃 QR을 요청해주세요.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-soft bg-surface/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-[12px]">
          <div className="mx-auto max-w-lg">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setPhase("scanning");
              }}
              className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-ink text-[14px] font-extrabold tracking-tight text-white transition-all hover:bg-black hover:shadow-soft-dark"
            >
              <LogOut className="h-4 w-4" /> 근무 종료 (QR 체크아웃)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------
  // SCANNING — camera open, QR decoded → checkOut
  // --------------------------------------------------------------------
  if (phase === "scanning") {
    return (
      <div className="flex min-h-screen flex-col bg-black text-white">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-[12px]">
          <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
            <button
              type="button"
              aria-label="뒤로"
              onClick={() => setPhase("working")}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:border-white/30 hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <p className="flex-1 text-[14px] font-extrabold tracking-tight">
              체크아웃 QR 스캔
            </p>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center space-y-4 px-6 py-8">
          <p className="text-[13px] font-semibold text-white/70">
            매장 QR 코드를 카메라에 비춰주세요
          </p>
          <QrScanner
            onScan={handleScan}
            onError={(e) => {
              setError(e || "카메라를 열지 못했습니다");
            }}
          />
          {error && (
            <div className="flex max-w-sm items-start gap-2 rounded-[14px] border border-destructive/40 bg-destructive/20 p-3 text-[12.5px] font-semibold text-white">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setPhase("working")}
            className="text-[12px] font-bold text-white/60 underline-offset-4 hover:text-white hover:underline"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------
  // SUBMITTING — checkOut in flight
  // --------------------------------------------------------------------
  if (phase === "submitting") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-ink" />
        <p className="text-[14px] font-extrabold tracking-tight text-ink">
          정산 중...
        </p>
        <p className="mt-1 text-[12px] font-medium text-muted-foreground">
          잠시만 기다려주세요
        </p>
      </div>
    );
  }

  // --------------------------------------------------------------------
  // LOCATING — geolocation resolving
  // --------------------------------------------------------------------
  if (phase === "locating") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-ink" />
        <p className="text-[14px] font-extrabold tracking-tight text-ink">
          위치 확인 중...
        </p>
        <p className="tabnum mt-1 text-[12px] font-medium text-muted-foreground">
          매장 반경 200m 이내여야 체크인이 가능합니다
        </p>
      </div>
    );
  }

  // --------------------------------------------------------------------
  // READY — pre-check-in (confirmed status)
  // --------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Premium header with chevron back */}
      <header className="sticky top-0 z-40 border-b border-border-soft bg-[color-mix(in_oklch,var(--bg)_92%,transparent)] [backdrop-filter:saturate(1.4)_blur(12px)]">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-4">
          <Link
            href="/my/applications"
            aria-label="뒤로"
            className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-surface-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="flex-1 text-[18px] font-extrabold tracking-[-0.02em] text-ink">
            체크인
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-3 pb-6">
        {/* ci-clock — large live clock, seconds in brand-deep */}
        <div className="py-6 text-center">
          <p className="text-[12px] font-bold tracking-tight text-muted-foreground">
            현재 시각
          </p>
          <p className="tabnum mt-2 text-[56px] font-extrabold leading-none tracking-[-0.04em] text-ink">
            {now.getHours().toString().padStart(2, "0")}:
            {now.getMinutes().toString().padStart(2, "0")}
            <span className="text-[40px] text-brand-deep">
              :{now.getSeconds().toString().padStart(2, "0")}
            </span>
          </p>
          <p className="mt-2 text-[13px] font-semibold text-muted-foreground">
            {formatWorkDate(job.workDate)}
          </p>
        </div>

        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-[14px] border border-destructive/30 bg-destructive/5 p-3 text-[12.5px] font-bold text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ci-shop — dashed divider between top/bottom per design spec */}
        <div className="rounded-[18px] border border-border-soft bg-surface p-4">
          <div className="flex items-start gap-3 border-b border-dashed border-border pb-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] border border-border-soft bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-2xl">
              {businessLogo}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-muted-foreground">
                {job.business.name}
              </p>
              <h3 className="text-[15px] font-extrabold tracking-[-0.02em] text-ink">
                {job.title}
              </h3>
              <div className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="tabnum">
                  {job.startTime} — {job.endTime}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[12.5px]">
            <span className="inline-flex items-center gap-1.5 font-bold text-ink">
              <MapPin className="h-3.5 w-3.5" />
              {job.business.address}
            </span>
            <span className="inline-flex items-center gap-1.5 font-bold text-brand-deep">
              <Navigation className="h-3.5 w-3.5" />
              반경 200m
            </span>
          </div>
        </div>

        {/* ci-guide — brand-tint background with ink-filled check-circle bullets.
            Two-color bullet (ink body + brand-green tick) can't be expressed via
            a single-color lucide icon, so the SVG is inline with design tokens. */}
        <div
          className="mt-3 rounded-[18px] border p-4"
          style={{
            background: "color-mix(in oklch, var(--brand) 10%, var(--surface))",
            borderColor:
              "color-mix(in oklch, var(--brand) 22%, var(--border))",
          }}
        >
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold tracking-tight text-brand-deep">
            <Zap className="h-[16px] w-[16px]" />
            체크인 안내
          </div>
          <ul className="mt-2.5 space-y-1">
            {[
              <>
                체크인은 근무 시작{" "}
                <b className="font-extrabold text-ink">10분 전 ~ 30분 후</b>에만
                가능합니다.
              </>,
              <>
                매장 반경 <b className="font-extrabold text-ink">200m</b> 이내에서
                위치 권한을 허용해주세요.
              </>,
              <>
                체크아웃 시 매장 담당자의{" "}
                <b className="font-extrabold text-ink">QR을 카메라로 스캔</b>
                합니다.
              </>,
            ].map((content, i) => (
              <li
                key={i}
                className="flex items-start gap-2 py-[6px] text-[12.5px] font-medium leading-[1.55] text-ink"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  className="mt-[2px] h-4 w-4 shrink-0"
                >
                  <circle cx="8" cy="8" r="8" fill="#113628" />
                  <path
                    d="M4.5 8.2l2.3 2.3L11.7 5.5"
                    stroke="#b9f227"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
                <span>{content}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Brand-green sticky CTA — design's explicit exception to ink-primary rule.
          체크인 시작 is the one "긍정/전진" moment that keeps the brand accent. */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-soft bg-[color-mix(in_oklch,var(--surface)_96%,transparent)] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] [backdrop-filter:saturate(1.6)_blur(16px)]">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={handleCheckIn}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 text-[15px] font-extrabold text-ink shadow-soft-brand transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:text-white active:scale-[0.98]"
          >
            <MapPin className="h-5 w-5" />
            체크인 시작
          </button>
          <p className="mt-2 text-center text-[11px] font-semibold text-muted-foreground">
            버튼을 누르면 위치 정보를 전송합니다
          </p>
        </div>
      </div>
    </div>
  );
}
