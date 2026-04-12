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
  CheckCircle2,
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
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-24 h-24 rounded-full bg-brand/10 flex items-center justify-center mb-5">
            <PartyPopper className="w-12 h-12 text-brand" />
          </div>
          <h1 className="text-2xl font-bold mb-1">수고하셨습니다!</h1>
          <p className="text-sm text-muted-foreground mb-6">
            근무가 완료되었어요. 정산을 진행합니다.
          </p>

          <div className="w-full max-w-sm rounded-2xl bg-brand text-white p-5 mb-4">
            <p className="text-xs opacity-90 mb-1">정산 금액</p>
            <p className="text-3xl font-bold">{formatMoney(earnings)}</p>
            {result && (
              <div className="mt-4 pt-4 border-t border-white/20 space-y-1 text-xs">
                <div className="flex justify-between opacity-90">
                  <span>실근무 시간</span>
                  <span>{result.actualHours}시간</span>
                </div>
                {result.nightPremium > 0 && (
                  <div className="flex justify-between opacity-90">
                    <span>야간 할증</span>
                    <span>+{formatMoney(result.nightPremium)}</span>
                  </div>
                )}
                <div className="flex justify-between opacity-90">
                  <span>입금 예정</span>
                  <span>1~3분 내 본인 계좌</span>
                </div>
              </div>
            )}
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
              href="/my/applications"
              className="w-full h-11 rounded-xl border border-border hover:bg-muted text-sm font-medium flex items-center justify-center transition-colors"
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
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
            <Link
              href="/my/applications"
              aria-label="뒤로"
              className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <p className="text-sm font-bold flex-1">근무 중</p>
            <span className="flex items-center gap-1 rounded-full bg-brand/10 px-2 py-1 text-[10px] font-bold text-brand-deep">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              LIVE
            </span>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-2xl bg-brand text-white p-6 text-center">
            <p className="text-xs opacity-90 mb-2">근무 중 경과 시간</p>
            <p className="text-5xl font-bold tabular-nums tracking-tight">
              {formatElapsed(elapsedMs)}
            </p>
            {checkedInAt && (
              <p className="text-[11px] opacity-90 mt-2">
                {formatClock(checkedInAt)}에 체크인
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-2xl shrink-0">
                {businessLogo}
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

          <div className="rounded-xl border border-teal/20 bg-teal/5 p-4">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
              <div className="text-xs leading-relaxed text-foreground">
                <p className="mb-1 font-bold">근무 중 안내</p>
                <p className="text-muted-foreground">
                  근무를 마치면 매장 담당자에게 체크아웃 QR을 요청해주세요.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border">
          <div className="max-w-lg mx-auto px-4 py-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setPhase("scanning");
              }}
              className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-brand font-bold text-white shadow-lg shadow-brand/20 transition-colors hover:bg-brand-dark"
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
      <div className="min-h-screen bg-black text-white flex flex-col">
        <header className="sticky top-0 z-40 bg-black/80 backdrop-blur border-b border-white/10">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
            <button
              type="button"
              aria-label="뒤로"
              onClick={() => setPhase("working")}
              className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <p className="text-sm font-bold flex-1">체크아웃 QR 스캔</p>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 space-y-4">
          <p className="text-sm text-white/80">
            매장 QR 코드를 카메라에 비춰주세요
          </p>
          <QrScanner
            onScan={handleScan}
            onError={(e) => {
              setError(e || "카메라를 열지 못했습니다");
            }}
          />
          {error && (
            <div className="flex max-w-sm items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/20 p-3 text-xs text-white">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setPhase("working")}
            className="text-xs text-white/60 hover:text-white underline"
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
        <p className="text-sm font-medium">정산 중...</p>
        <p className="text-xs text-muted-foreground mt-1">
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <Loader2 className="w-10 h-10 text-brand animate-spin mb-4" />
        <p className="text-sm font-medium">위치 확인 중...</p>
        <p className="text-xs text-muted-foreground mt-1">
          매장 반경 200m 이내여야 체크인이 가능합니다
        </p>
      </div>
    );
  }

  // --------------------------------------------------------------------
  // READY — pre-check-in (confirmed status)
  // --------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/my/applications"
            aria-label="뒤로"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <p className="text-sm font-bold flex-1">체크인</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        <div className="text-center py-4">
          <p className="text-[11px] text-muted-foreground mb-1">현재 시각</p>
          <p className="text-4xl font-bold tabular-nums tracking-tight">
            {formatClock(now)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatWorkDate(job.workDate)}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-2xl shrink-0">
              {businessLogo}
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
              <span className="shrink-0 text-[11px] font-medium text-muted-foreground flex items-center gap-0.5">
                <Navigation className="w-3 h-3" /> 반경 200m
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-brand/30 bg-brand-light p-4">
          <div className="flex items-start gap-2 mb-2">
            <Zap className="w-4 h-4 text-brand-deep shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-brand-deep">
              체크인 안내
            </p>
          </div>
          <ul className="space-y-1.5 text-[11px] text-foreground/80 leading-relaxed">
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                체크인은 근무 시작 10분 전 ~ 30분 후에만 가능합니다.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                매장 반경 200m 이내에서 위치 권한을 허용해주세요.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                체크아웃 시 매장 담당자의 QR을 카메라로 스캔합니다.
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <button
            type="button"
            onClick={handleCheckIn}
            className="w-full h-12 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-brand/20 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            체크인 시작
          </button>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            버튼을 누르면 위치 정보를 전송합니다
          </p>
        </div>
      </div>
    </div>
  );
}
