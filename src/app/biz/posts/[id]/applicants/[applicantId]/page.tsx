import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  BriefcaseBusiness,
  CalendarClock,
  ChevronLeft,
  Mail,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { requireJobOwner } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { getReviewsForUser } from "@/lib/db/queries";
import { formatBirthDate, getInternationalAge } from "@/lib/worker-age";

function formatDateTime(value: string | Date | null) {
  if (!value) return "기록 없음";

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return { label: "대기 중", className: "bg-surface-2 text-muted-foreground" };
    case "confirmed":
      return { label: "확정됨", className: "bg-brand text-ink" };
    case "checked_in":
      return { label: "체크인", className: "bg-lime-chip text-lime-chip-fg" };
    case "in_progress":
      return { label: "근무 중", className: "bg-lime-chip text-lime-chip-fg" };
    case "completed":
      return { label: "완료", className: "bg-ink text-white" };
    case "settled":
      return { label: "정산 완료", className: "bg-ink text-white" };
    case "cancelled":
      return { label: "취소됨", className: "bg-destructive/10 text-destructive" };
    default:
      return { label: status, className: "bg-surface-2 text-muted-foreground" };
  }
}

export default async function BizApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string; applicantId: string }>;
}) {
  const { id, applicantId } = await params;
  const { job } = await requireJobOwner(id);
  const application = await prisma.application.findUnique({
    where: { id: applicantId },
    select: {
      id: true,
      jobId: true,
      workerId: true,
      status: true,
      appliedAt: true,
      checkInAt: true,
      worker: {
        select: {
          email: true,
          workerProfile: {
            select: {
              name: true,
              nickname: true,
              avatar: true,
              badgeLevel: true,
              rating: true,
              completionRate: true,
              totalJobs: true,
              noShowCount: true,
              birthDate: true,
            },
          },
        },
      },
    },
  });

  if (!application || application.jobId !== id) {
    notFound();
  }

  const reviews = await getReviewsForUser(application.workerId, { limit: 5 });
  const profile = application.worker.workerProfile;
  const status = getStatusBadge(application.status);
  const rating = Number(profile?.rating ?? 0);
  const completionRate = Number(profile?.completionRate ?? 0);
  const totalJobs = profile?.totalJobs ?? 0;
  const noShowCount = profile?.noShowCount ?? 0;
  const age = getInternationalAge(profile?.birthDate);
  const birthDateLabel = formatBirthDate(profile?.birthDate);
  const workerName = profile?.name ?? application.worker.email ?? "익명";
  const workerNickname = profile?.nickname ?? "닉네임 미등록";
  const workerInitial = workerName.trim().charAt(0) || "구";

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
      <Link
        href={`/biz/posts/${id}/applicants`}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink transition-colors hover:border-ink hover:bg-surface-2"
      >
        <ChevronLeft className="h-4 w-4" />
        지원자 목록으로
      </Link>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[22px] border border-border-soft bg-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-14 w-14 rounded-[18px]" size="lg">
                {profile?.avatar ? (
                  <AvatarImage src={profile.avatar} alt={`${workerName} 프로필`} />
                ) : null}
                <AvatarFallback className="rounded-[18px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-[18px] font-extrabold text-ink">
                  {workerInitial}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[20px] font-extrabold tracking-[-0.025em] text-ink">
                    {workerName}
                  </h1>
                  <span
                    className={`inline-flex items-center rounded-[6px] px-2 py-1 text-[10px] font-extrabold tracking-tight ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>
                <p className="mt-1 text-[13px] font-semibold text-muted-foreground">
                  {job.title}
                </p>
              </div>
            </div>
            {profile?.badgeLevel && (
              <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-ink">
                {profile.badgeLevel}
              </span>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MetricCard label="평점">
              <span className="tabnum mt-1 flex items-center gap-1 text-[18px] font-extrabold tracking-tight text-ink">
                <Star className="h-4 w-4 fill-[#fbbf24] text-[#fbbf24]" />
                {rating.toFixed(1)}
              </span>
            </MetricCard>
            <MetricCard label="완료 근무">
              <span className="tabnum mt-1 text-[18px] font-extrabold tracking-tight text-ink">
                {totalJobs}건
              </span>
            </MetricCard>
            <MetricCard label="완료율">
              <span className="tabnum mt-1 text-[18px] font-extrabold tracking-tight text-brand-deep">
                {completionRate.toFixed(0)}%
              </span>
            </MetricCard>
            <MetricCard label="나이">
              <span className="tabnum mt-1 text-[18px] font-extrabold tracking-tight text-ink">
                {age === null ? "미등록" : `만 ${age}세`}
              </span>
              {birthDateLabel && (
                <span className="tabnum mt-1 text-[11px] font-semibold text-text-subtle">
                  {birthDateLabel}
                </span>
              )}
            </MetricCard>
            <MetricCard label="노쇼" className="sm:col-span-2">
              <span
                className={`tabnum mt-1 text-[18px] font-extrabold tracking-tight ${
                  noShowCount === 0 ? "text-text-subtle" : "text-destructive"
                }`}
              >
                {noShowCount}건
              </span>
            </MetricCard>
          </div>

          <div className="mt-5 space-y-3 rounded-[18px] border border-dashed border-border bg-surface-2/50 p-4">
            {[
              { Icon: Mail, value: application.worker.email ?? "이메일 정보 없음" },
              { Icon: UserRound, value: workerNickname },
              {
                Icon: CalendarClock,
                value: `지원 시각: ${formatDateTime(application.appliedAt)}`,
              },
              { Icon: BriefcaseBusiness, value: `공고: ${job.title}` },
              {
                Icon: ShieldCheck,
                value: `최근 체크인: ${formatDateTime(application.checkInAt)}`,
              },
            ].map(({ Icon, value }, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-[12.5px] font-medium text-ink"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-subtle" />
                <span>{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[22px] border border-border-soft bg-surface p-5">
          <h2 className="text-[14px] font-extrabold tracking-tight text-ink">
            최근 리뷰
          </h2>
          <div className="mt-4">
            {reviews.length === 0 ? (
              <div className="rounded-[18px] border-2 border-dashed border-border bg-surface p-6 text-center text-[12.5px] font-semibold text-muted-foreground">
                아직 표시할 리뷰가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-[18px] border border-border-soft bg-surface p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-extrabold tracking-tight text-ink">
                          {review.application.job.business.name}
                        </p>
                        <p className="tabnum mt-0.5 text-[11px] font-semibold text-text-subtle">
                          {formatDateTime(review.createdAt)}
                        </p>
                      </div>
                      <div className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-1">
                        <Star className="h-3.5 w-3.5 fill-[#fbbf24] text-[#fbbf24]" />
                        <span className="tabnum text-[12.5px] font-extrabold text-ink">
                          {Number(review.rating).toFixed(1)}
                        </span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="mt-3 text-[12.5px] font-medium leading-relaxed text-muted-foreground">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-[18px] border border-border-soft bg-surface p-4 ${
        className ?? ""
      }`}
    >
      <p className="text-[11px] font-bold tracking-tight text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}
