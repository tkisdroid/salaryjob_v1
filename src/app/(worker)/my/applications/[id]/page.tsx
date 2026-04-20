import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
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
    <div className="mx-auto max-w-lg px-4 pt-5 pb-24">
      {/* Header */}
      <header className="mb-4 flex items-center gap-2">
        <Link
          href="/my/applications"
          className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-surface-2"
          aria-label="이전"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-[22px] font-extrabold tracking-[-0.035em] text-ink">
          근무 상세
        </h1>
      </header>

      {/* Flash notifications */}
      {message === "already_reviewed" && (
        <div className="mb-4 rounded-[14px] border border-[color-mix(in_oklch,var(--brand)_30%,var(--border))] bg-[color-mix(in_oklch,var(--brand)_8%,var(--surface))] px-3 py-2 text-[12px] font-bold text-brand-deep">
          이미 리뷰를 작성한 근무입니다.
        </div>
      )}
      {error === "not_settled" && (
        <div className="mb-4 rounded-[14px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] font-bold text-destructive">
          정산이 완료된 후에만 리뷰를 작성할 수 있습니다.
        </div>
      )}

      {/* Job + business card */}
      <article className="rounded-[22px] border border-border-soft bg-surface p-[18px]">
        <div className="flex items-start gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[14px] border border-border-soft bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-3xl">
            {biz.logo}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-semibold text-muted-foreground">
                  {biz.name}
                </p>
                <h2 className="line-clamp-2 text-[15.5px] font-extrabold tracking-[-0.02em] text-ink">
                  {job.title}
                </h2>
              </div>
              <span
                className={`shrink-0 rounded-[6px] px-2 py-1 text-[10px] font-extrabold tracking-tight ${
                  isCancelled
                    ? "bg-surface-2 text-muted-foreground"
                    : isFinished
                      ? "bg-ink text-white"
                      : "bg-brand text-ink"
                }`}
              >
                {statusLabel[status] ?? status}
              </span>
            </div>
          </div>
        </div>

        {/* Shift metadata */}
        <dl className="mt-4 space-y-2 border-t border-dashed border-border pt-3 text-[12.5px]">
          {[
            { Icon: Calendar, label: "근무 일자", value: formatWorkDate(job.workDate) },
            { Icon: Clock, label: "근무 시간", value: `${job.startTime} ~ ${job.endTime}`, tabnum: true },
            { Icon: MapPin, label: "근무지", value: biz.address },
            { Icon: CreditCard, label: "시급", value: formatMoney(job.hourlyPay), tabnum: true },
          ].map(({ Icon, label, value, tabnum }) => (
            <div key={label} className="flex items-start gap-2">
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-subtle" />
              <dt className="w-20 shrink-0 font-medium text-muted-foreground">
                {label}
              </dt>
              <dd
                className={`min-w-0 flex-1 font-bold text-ink ${tabnum ? "tabnum" : ""}`}
              >
                {value}
              </dd>
            </div>
          ))}
          {job.transportFee > 0 && (
            <div className="flex items-start gap-2">
              <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-subtle" />
              <dt className="w-20 shrink-0 font-medium text-muted-foreground">
                교통비
              </dt>
              <dd className="tabnum min-w-0 flex-1 font-bold text-ink">
                {formatMoney(job.transportFee)}
              </dd>
            </div>
          )}
        </dl>
      </article>

      {/* Check-in / check-out timeline (only after the worker has checked in) */}
      {(application.checkInAt || application.checkOutAt) && (
        <article className="mt-3 rounded-[22px] border border-border-soft bg-surface p-[18px]">
          <h3 className="mb-3 text-[13px] font-extrabold tracking-tight text-ink">
            체크인 / 체크아웃
          </h3>
          <div className="space-y-2 text-[12.5px]">
            {application.checkInAt && (
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">체크인</span>
                <span className="tabnum font-bold text-ink">
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
                <span className="font-medium text-muted-foreground">
                  체크아웃
                </span>
                <span className="tabnum font-bold text-ink">
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
                <span className="font-medium text-muted-foreground">
                  실근무 시간
                </span>
                <span className="tabnum font-bold text-brand-deep">
                  {application.actualHours.toFixed(1)}시간
                </span>
              </div>
            )}
          </div>
        </article>
      )}

      {/* Earnings card — only for finished shifts */}
      {isFinished && application.earnings !== null && (
        <article className="mt-3 rounded-[22px] border border-border bg-[color-mix(in_oklch,var(--brand)_6%,var(--surface))] p-[18px]">
          <div className="mb-2 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-brand-deep" />
            <h3 className="text-[13px] font-extrabold tracking-tight text-ink">
              정산 금액
            </h3>
          </div>
          <p className="tabnum text-[28px] font-extrabold tracking-[-0.03em] text-brand-deep">
            {formatMoney(application.earnings)}
          </p>
          <p className="mt-1 text-[11.5px] font-semibold text-muted-foreground">
            {application.settlementStatus === "settled"
              ? "즉시 정산 완료"
              : "정산 처리 중"}
          </p>
        </article>
      )}

      {/* Actions */}
      <div className="mt-5 flex flex-col gap-2">
        {canCheckIn && (
          <Link
            href={`/my/applications/${application.id}/check-in`}
            className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-brand text-[14px] font-extrabold text-ink shadow-soft-brand transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:text-white"
          >
            <QrCode className="h-4 w-4" />
            QR 체크인
          </Link>
        )}
        {canReview && (
          <Link
            href={`/my/applications/${application.id}/review`}
            className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-ink text-[14px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-black hover:shadow-soft-dark"
          >
            <Star className="h-4 w-4 fill-[#fbbf24] text-[#fbbf24]" />
            리뷰 작성
          </Link>
        )}
        <Link
          href={`/posts/${job.id}`}
          className="flex h-11 items-center justify-center rounded-full border border-border bg-surface text-[13px] font-bold text-ink transition-colors hover:border-ink hover:bg-surface-2"
        >
          공고 상세 보기
        </Link>
      </div>
    </div>
  );
}
