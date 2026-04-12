import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  CreditCard,
  MapPin,
  QrCode,
  Star,
  Wallet,
} from "lucide-react";
import { requireApplicationOwner } from "@/lib/dal";
import { getApplicationById } from "@/lib/db/queries";
import { formatWorkDate } from "@/lib/job-utils";
import { formatMoney } from "@/lib/format";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}

/**
 * /my/applications/[id] — worker-side application detail page.
 *
 * Before this existed, the /my confirmed-shift banner linked here and
 * returned a 404 because only the [id]/check-in and [id]/review nested
 * routes had page.tsx files.
 *
 * Renders:
 *   - job + business header (name, address, logo)
 *   - shift date/time + status badge
 *   - check-in/out timestamps + actual hours + earnings (if finished)
 *   - primary actions contextual to status:
 *       confirmed / in_progress → QR check-in link
 *       settled (no review yet) → "리뷰 작성" CTA
 *       any      → "공고 상세" view
 *   - optional success/error flash from query params
 */
export default async function ApplicationDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { message, error } = await searchParams;

  // Ownership + worker session. Redirects to /login on failure; throws
  // notFound if the worker does not own this application.
  await requireApplicationOwner(id);

  const application = await getApplicationById(id);
  if (!application) {
    notFound();
  }

  const job = application.job;
  const biz = job.business;
  const status = application.status;

  const statusLabel: Record<typeof status, string> = {
    pending: "대기 중",
    confirmed: "확정",
    in_progress: "근무 중",
    checked_in: "근무 중",
    completed: "근무 완료",
    settled: "정산 완료",
    cancelled: "취소됨",
  };

  const canCheckIn = status === "confirmed" || status === "in_progress";
  const isFinished = status === "settled" || status === "completed";
  const canReview = isFinished && !application.reviewGiven;
  const isCancelled = status === "cancelled";

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <header className="flex items-center gap-2">
        <Link
          href="/my/applications"
          className="p-1 -ml-1 hover:bg-muted rounded-md"
          aria-label="이전"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold tracking-tight">근무 상세</h1>
      </header>

      {/* Flash notifications */}
      {message === "already_reviewed" && (
        <div className="rounded-2xl border border-brand/30 bg-brand-light px-3 py-2 text-xs text-brand-deep">
          이미 리뷰를 작성한 근무입니다.
        </div>
      )}
      {error === "not_settled" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          정산이 완료된 후에만 리뷰를 작성할 수 있습니다.
        </div>
      )}

      {/* Job + business card */}
      <article className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-3xl">
            {biz.logo}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] text-muted-foreground">
                  {biz.name}
                </p>
                <h2 className="line-clamp-2 text-base font-bold">
                  {job.title}
                </h2>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isCancelled
                    ? "bg-muted text-muted-foreground"
                    : isFinished
                      ? "bg-brand-light text-brand-deep"
                      : "bg-brand/10 text-brand-deep"
                }`}
              >
                {statusLabel[status] ?? status}
              </span>
            </div>
          </div>
        </div>

        {/* Shift metadata */}
        <dl className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
          <div className="flex items-start gap-2">
            <Calendar className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
            <dt className="text-muted-foreground w-20 shrink-0">근무 일자</dt>
            <dd className="font-medium">
              {formatWorkDate(job.workDate)}
            </dd>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
            <dt className="text-muted-foreground w-20 shrink-0">근무 시간</dt>
            <dd className="font-medium">
              {job.startTime} ~ {job.endTime}
            </dd>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
            <dt className="text-muted-foreground w-20 shrink-0">근무지</dt>
            <dd className="font-medium min-w-0 flex-1">{biz.address}</dd>
          </div>
          <div className="flex items-start gap-2">
            <CreditCard className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
            <dt className="text-muted-foreground w-20 shrink-0">시급</dt>
            <dd className="font-medium">{formatMoney(job.hourlyPay)}</dd>
          </div>
          {job.transportFee > 0 && (
            <div className="flex items-start gap-2">
              <Building2 className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <dt className="text-muted-foreground w-20 shrink-0">교통비</dt>
              <dd className="font-medium">{formatMoney(job.transportFee)}</dd>
            </div>
          )}
        </dl>
      </article>

      {/* Check-in / check-out timeline (only after the worker has checked in) */}
      {(application.checkInAt || application.checkOutAt) && (
        <article className="rounded-2xl border border-border bg-card p-4 space-y-2 text-xs">
          <h3 className="text-sm font-bold mb-2">체크인 / 체크아웃</h3>
          {application.checkInAt && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">체크인</span>
              <span className="font-medium tabular-nums">
                {new Date(application.checkInAt).toLocaleString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "2-digit",
                  day: "2-digit",
                })}
              </span>
            </div>
          )}
          {application.checkOutAt && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">체크아웃</span>
              <span className="font-medium tabular-nums">
                {new Date(application.checkOutAt).toLocaleString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "2-digit",
                  day: "2-digit",
                })}
              </span>
            </div>
          )}
          {application.actualHours !== null && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">실근무 시간</span>
              <span className="font-medium tabular-nums">
                {application.actualHours.toFixed(1)}시간
              </span>
            </div>
          )}
        </article>
      )}

      {/* Earnings card — only for finished shifts */}
      {isFinished && application.earnings !== null && (
        <article className="rounded-2xl border border-brand/30 bg-brand/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-bold text-brand">정산 금액</h3>
          </div>
          <p className="text-2xl font-bold tabular-nums text-brand">
            {formatMoney(application.earnings)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {application.settlementStatus === "settled"
              ? "즉시 정산 완료"
              : "정산 처리 중"}
          </p>
        </article>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2">
        {canCheckIn && (
          <Link
            href={`/my/applications/${application.id}/check-in`}
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-brand text-white font-bold text-sm shadow-lg shadow-brand/20 transition-colors hover:bg-brand-dark"
          >
            <QrCode className="w-4 h-4" />
            QR 체크인
          </Link>
        )}
        {canReview && (
          <Link
            href={`/my/applications/${application.id}/review`}
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-brand text-white font-bold text-sm shadow-lg shadow-brand/20 transition-colors hover:bg-brand-dark"
          >
            <Star className="w-4 h-4" />
            리뷰 작성
          </Link>
        )}
        <Link
          href={`/posts/${job.id}`}
          className="flex h-11 items-center justify-center rounded-xl border border-border text-xs font-medium transition-colors hover:bg-muted"
        >
          공고 상세 보기
        </Link>
      </div>
    </div>
  );
}
