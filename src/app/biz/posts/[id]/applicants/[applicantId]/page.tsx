import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  Mail,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      return { label: "대기 중", className: "bg-muted text-muted-foreground" };
    case "confirmed":
      return { label: "수락됨", className: "bg-teal/10 text-teal" };
    case "checked_in":
      return { label: "체크인", className: "bg-sky-500/10 text-sky-700" };
    case "in_progress":
      return { label: "근무 중", className: "bg-emerald-500/10 text-emerald-700" };
    case "completed":
      return { label: "완료", className: "bg-muted text-muted-foreground" };
    case "settled":
      return { label: "정산 완료", className: "bg-brand/10 text-brand-deep" };
    case "cancelled":
      return { label: "거절됨", className: "bg-destructive/10 text-destructive" };
    default:
      return { label: status, className: "bg-muted text-muted-foreground" };
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
  const workerAvatar = profile?.avatar ?? "👤";

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
      <Link
        href={`/biz/posts/${id}/applicants`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        지원자 목록으로
      </Link>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-2xl">
                  {workerAvatar}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl">{workerName}</CardTitle>
                    <Badge className={status.className}>{status.label}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {job.title}
                  </p>
                </div>
              </div>
              {profile?.badgeLevel && (
                <Badge variant="outline" className="shrink-0">
                  {profile.badgeLevel}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs text-muted-foreground">평점</p>
                <p className="mt-1 flex items-center gap-1 text-lg font-bold">
                  <Star className="h-4 w-4 fill-brand text-brand" />
                  {rating.toFixed(1)}
                </p>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs text-muted-foreground">완료 근무</p>
                <p className="mt-1 text-lg font-bold">{totalJobs}회</p>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs text-muted-foreground">완료율</p>
                <p className="mt-1 text-lg font-bold">
                  {completionRate.toFixed(0)}%
                </p>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs text-muted-foreground">나이</p>
                <p className="mt-1 text-lg font-bold">
                  {age === null ? "미등록" : `만 ${age}세`}
                </p>
                {birthDateLabel && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {birthDateLabel}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs text-muted-foreground">노쇼</p>
                <p className="mt-1 text-lg font-bold">{noShowCount}회</p>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-border p-4">
              <div className="flex items-start gap-2 text-sm">
                <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <span>{application.worker.email ?? "이메일 정보 없음"}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <UserRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <span>{workerNickname}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CalendarClock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <span>지원 시각: {formatDateTime(application.appliedAt)}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <BriefcaseBusiness className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <span>공고: {job.title}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <span>최근 체크인: {formatDateTime(application.checkInAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">최근 리뷰</CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                아직 표시할 리뷰가 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl border border-border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {review.application.job.business.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDateTime(review.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 text-sm font-bold">
                        <Star className="h-4 w-4 fill-brand text-brand" />
                        {Number(review.rating).toFixed(1)}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
