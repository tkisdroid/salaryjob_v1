import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Award,
  Briefcase,
  Calendar,
  ChevronLeft,
  Clock,
  MapPin,
  Star,
  ThumbsUp,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireBusiness } from "@/lib/dal";
import { getReviewsForUser } from "@/lib/db/queries";
import { categoryLabel } from "@/lib/job-utils";
import {
  DAY_KEYS,
  DAY_LABELS,
  formatHour,
  groupAvailabilitySlots,
} from "@/lib/availability-slots";
import { WorkerDetailActions } from "./worker-detail-actions";
import type { JobCategory } from "@/lib/types/job";

export const dynamic = "force-dynamic";

const BADGE_LABEL: Record<string, string> = {
  newbie: "새내기",
  bronze: "브론즈",
  silver: "실버",
  gold: "골드",
  platinum: "플래티넘",
  diamond: "다이아",
};

function badgeLevelColor(level: string) {
  switch (level) {
    case "gold":
    case "platinum":
    case "diamond":
      return "bg-brand text-ink";
    case "silver":
      return "bg-surface-2 text-ink";
    case "bronze":
      return "bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep";
    default:
      return "bg-surface-2 text-muted-foreground";
  }
}

function renderStars(rating: number) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={index}
      className={
        index < full
          ? "h-3.5 w-3.5 fill-[#fbbf24] text-[#fbbf24]"
          : "h-3.5 w-3.5 text-border"
      }
    />
  ));
}

function formatJoinDate(date: Date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default async function BizWorkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireBusiness();
  const { id } = await params;

  const [profile, favorite, reviews] = await Promise.all([
    prisma.workerProfile.findUnique({
      where: { userId: id },
      include: { user: { select: { email: true } } },
    }),
    prisma.favoriteWorker.findUnique({
      where: {
        businessUserId_workerId: {
          businessUserId: session.id,
          workerId: id,
        },
      },
      select: { id: true },
    }),
    getReviewsForUser(id, { limit: 8 }),
  ]);

  if (!profile) notFound();

  const skills = (profile.preferredCategories as JobCategory[]).map(categoryLabel);
  const availability = groupAvailabilitySlots(profile.availabilitySlots);
  const rating = Number(profile.rating);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/biz/workers"
          aria-label="목록으로"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-surface text-ink transition-colors hover:border-ink hover:bg-surface-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-[24px] font-extrabold tracking-[-0.035em] text-ink">
          인재 상세
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-1">
          <div className="rounded-[22px] border border-border-soft bg-surface p-6 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-[22px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-[28px] font-extrabold text-brand-deep">
              {profile.name[0]}
            </div>
            <h2 className="mt-3 text-[18px] font-extrabold tracking-[-0.02em] text-ink">
              {profile.name}
            </h2>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <div className="flex">{renderStars(rating)}</div>
              <span className="tabnum text-[13px] font-bold text-ink">
                {rating.toFixed(1)}
              </span>
              <span className="tabnum text-[11.5px] font-semibold text-text-subtle">
                ({profile.reviewCount})
              </span>
            </div>
            <span
              className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold tracking-tight ${badgeLevelColor(
                profile.badgeLevel,
              )}`}
            >
              <Award className="h-3 w-3" />
              {BADGE_LABEL[profile.badgeLevel] ?? "새내기"}
            </span>
            <p className="mt-3 text-[12.5px] font-medium leading-relaxed text-muted-foreground">
              {profile.bio ?? "자기소개가 아직 등록되지 않았습니다."}
            </p>

            <div className="my-4 border-t border-dashed border-border" />

            <div className="space-y-2 text-left text-[12.5px] font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                지역 미등록
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                가입 <span className="tabnum font-bold text-ink">{formatJoinDate(profile.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                <span className="tabnum font-bold text-ink">{profile.totalJobs}회</span>{" "}
                근무 완료 · 완료율 {profile.completionRate}%
              </div>
            </div>

            <WorkerDetailActions workerId={profile.userId} initialFavorite={Boolean(favorite)} />
          </div>

          <div className="rounded-[22px] border border-border-soft bg-surface p-5">
            <h3 className="text-[13px] font-extrabold tracking-tight text-ink">
              선호 직종
            </h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {skills.length === 0 ? (
                <span className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                  선호 직종 미등록
                </span>
              ) : (
                skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-full bg-[color-mix(in_oklch,var(--brand)_14%,var(--surface))] px-2.5 py-1 text-[11px] font-bold text-brand-deep"
                  >
                    {skill}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-border-soft bg-surface p-5">
            <h3 className="text-[13px] font-extrabold tracking-tight text-ink">
              경험 배지
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.length === 0 ? (
                <span className="text-[12px] font-semibold text-muted-foreground">
                  근무 선호 직종을 등록하면 배지가 표시됩니다.
                </span>
              ) : (
                skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[12px] font-extrabold tracking-tight text-white"
                  >
                    <Briefcase className="h-3.5 w-3.5 text-brand" />
                    {skill}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 md:col-span-2">
          <div className="rounded-[22px] border border-border-soft bg-surface p-5">
            <h3 className="flex items-center gap-2 text-[13px] font-extrabold tracking-tight text-ink">
              <Clock className="h-4 w-4 text-brand-deep" />
              가용 시간표
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {DAY_KEYS.map((day) => {
                const blocks = availability.get(day) ?? [];
                return (
                  <div
                    key={day}
                    className="rounded-[14px] border border-border bg-surface px-3 py-3"
                  >
                    <p className="mb-2 text-[11px] font-extrabold tracking-tight text-muted-foreground">
                      {DAY_LABELS[day]}요일
                    </p>
                    {blocks.length === 0 ? (
                      <p className="text-[11.5px] font-semibold text-text-subtle">
                        등록 없음
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {blocks.map((block) => (
                          <span
                            key={`${day}-${block.start}`}
                            className="rounded-[8px] bg-brand px-2 py-1 text-[10.5px] font-bold tracking-tight text-ink"
                          >
                            {formatHour(block.start)}~{formatHour(block.end)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[22px] border border-border-soft bg-surface p-5">
            <h3 className="flex items-center gap-2 text-[13px] font-extrabold tracking-tight text-ink">
              <ThumbsUp className="h-4 w-4 text-brand-deep" />
              고용주 리뷰{" "}
              <span className="tabnum text-text-subtle">({reviews.length})</span>
            </h3>
            {reviews.length === 0 ? (
              <div className="mt-4 rounded-[16px] border border-dashed border-border bg-surface-2 px-4 py-10 text-center">
                <p className="text-[12.5px] font-semibold text-muted-foreground">
                  아직 받은 리뷰가 없습니다.
                </p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-dashed divide-border">
                {reviews.map((review) => (
                  <div key={review.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-[13.5px] font-extrabold tracking-tight text-ink">
                          {review.application.job.business.name}
                        </p>
                        <p className="tabnum mt-0.5 text-[11px] font-semibold text-text-subtle">
                          {review.createdAt.toISOString().slice(0, 10)}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-1">
                        <Star className="h-3.5 w-3.5 fill-[#fbbf24] text-[#fbbf24]" />
                        <span className="tabnum text-[12.5px] font-extrabold text-ink">
                          {review.rating}
                        </span>
                      </div>
                    </div>
                    <p className="text-[13px] font-medium leading-relaxed text-muted-foreground">
                      {review.comment ?? "코멘트 없이 평점만 남겼습니다."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
