import Link from "next/link";
import {
  Briefcase,
  CalendarDays,
  ChevronLeft,
  Clock,
  GraduationCap,
  Monitor,
  PartyPopper,
  ShoppingBag,
  Sparkles,
  Truck,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireWorker } from "@/lib/dal";
import { formatMoney } from "@/lib/format";
import { categoryLabel, formatWorkDate } from "@/lib/job-utils";
import {
  formatMatchTime,
  getWorkerJobMatches,
  type WorkerJobMatch,
} from "@/lib/services/worker-job-matching";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function CategoryIcon({
  category,
  className,
}: {
  category: string;
  className: string;
}) {
  switch (category) {
    case "음식점·카페":
      return <UtensilsCrossed className={className} />;
    case "판매·유통":
      return <ShoppingBag className={className} />;
    case "물류·배송":
      return <Truck className={className} />;
    case "사무·행정":
      return <Briefcase className={className} />;
    case "행사·이벤트":
      return <PartyPopper className={className} />;
    case "교육·과외":
      return <GraduationCap className={className} />;
    case "IT·디자인":
      return <Monitor className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

function dayLabel(isoDate: string) {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
}

function ScheduleBlock({ match }: { match: WorkerJobMatch }) {
  const label = categoryLabel(match.job.category);

  return (
    <Link
      href={`/posts/${match.job.id}`}
      className="flex items-start gap-3 rounded-[18px] border border-border-soft bg-surface p-[14px] transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-soft-sm"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep">
        <CategoryIcon category={label} className="h-[18px] w-[18px]" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold tracking-tight text-muted-foreground">
          {label} · {match.job.business.name}
        </p>
        <h2 className="mt-0.5 line-clamp-1 text-[14px] font-extrabold tracking-[-0.02em] text-ink">
          {match.job.title}
        </h2>
        <div className="tabnum mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <b className="font-extrabold text-ink">{formatMatchTime(match)}</b>
          </span>
          <span className="inline-flex items-center gap-1">
            <Wallet className="h-3 w-3" />
            <b className="font-extrabold text-ink">
              {formatMoney(match.estimatedPay)}
            </b>
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[10.5px] font-medium leading-snug text-text-subtle">
          {match.reasons.join(" · ")}
        </p>
      </div>

      <span
        className={cn(
          "tabnum shrink-0 rounded-full px-[9px] py-1 text-[10.5px] font-extrabold tracking-[-0.01em]",
          match.score >= 90 ? "bg-ink text-brand" : "bg-brand text-ink",
        )}
      >
        {match.score}%
      </span>
    </Link>
  );
}

export default async function SchedulePage() {
  const session = await requireWorker();
  const profile = await prisma.workerProfile.findUnique({
    where: { userId: session.id },
    select: { availabilitySlots: true },
  });

  const hasAvailability = (profile?.availabilitySlots.length ?? 0) > 0;
  const recommendations = hasAvailability
    ? await getWorkerJobMatches(session.id, { limit: 12 })
    : [];

  const weeklyTotal = recommendations.reduce(
    (sum, match) => sum + match.estimatedPay,
    0,
  );
  const totalHours = recommendations.reduce(
    (sum, match) => sum + match.job.workHours,
    0,
  );
  const today = dayLabel(new Date().toISOString().slice(0, 10));
  const grouped = recommendations.reduce<Record<string, WorkerJobMatch[]>>(
    (acc, match) => {
      const day = dayLabel(match.job.workDate);
      acc[day] = [...(acc[day] ?? []), match];
      return acc;
    },
    {},
  );

  return (
    <div className="mx-auto max-w-lg px-4 pt-3 pb-24">
      <header className="flex items-center gap-2 pb-1">
        <Link
          href="/my"
          aria-label="뒤로"
          className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-surface-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex items-center gap-1.5 text-[19px] font-extrabold tracking-[-0.03em] text-ink">
          <Sparkles className="h-4 w-4 text-brand-deep" />
          AI 추천 스케줄
        </h1>
      </header>
      <p className="mt-1 px-0.5 pb-4 text-[12px] font-medium tracking-tight text-muted-foreground">
        등록한 가용시간, 선호 직종, 공고 조건을 함께 분석합니다.
      </p>

      {!hasAvailability && (
        <div className="rounded-[28px] border-2 border-dashed border-border bg-surface py-12 text-center">
          <CalendarDays className="mx-auto mb-4 h-12 w-12 text-text-subtle" />
          <p className="text-[15px] font-extrabold tracking-tight text-ink">
            가용시간을 먼저 등록해주세요
          </p>
          <p className="mb-4 mt-1 text-[12.5px] font-medium text-muted-foreground">
            시간대를 등록해야 AI가 근무 가능한 공고만 추천할 수 있습니다.
          </p>
          <Link
            href="/my/availability"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-ink px-5 text-[13px] font-extrabold tracking-tight text-white transition-all hover:bg-black hover:shadow-soft-dark"
          >
            <Clock className="h-4 w-4" />
            가용시간 등록하기
          </Link>
        </div>
      )}

      {hasAvailability && recommendations.length === 0 && (
        <div className="rounded-[28px] border-2 border-dashed border-border bg-surface py-12 text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 text-text-subtle" />
          <p className="text-[15px] font-extrabold tracking-tight text-ink">
            추천할 공고가 없습니다
          </p>
          <p className="mb-4 mt-1 text-[12.5px] font-medium text-muted-foreground">
            시간을 더 넓게 등록하거나 탐색에서 다른 공고를 확인해보세요.
          </p>
          <Link
            href="/explore"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-ink px-5 text-[13px] font-extrabold tracking-tight text-white transition-all hover:bg-black hover:shadow-soft-dark"
          >
            탐색으로 이동
          </Link>
        </div>
      )}

      {recommendations.length > 0 && (
        <>
          <div className="rounded-[20px] bg-ink p-[18px] text-white">
            <p className="text-[11.5px] font-bold tracking-[-0.01em] text-[color-mix(in_oklch,#fff_75%,transparent)]">
              이번 주 추천 예상 수입
            </p>
            <p className="tabnum mt-2 text-[34px] font-extrabold tracking-[-0.035em] text-brand">
              {formatMoney(weeklyTotal)}
            </p>
            <p className="mt-0.5 text-[10.5px] font-semibold text-[color-mix(in_oklch,#fff_55%,transparent)]">
              {recommendations.length}개 추천 공고 · 총 {totalHours.toFixed(1)}시간
            </p>
          </div>

          <div className="mt-2">
            {["월", "화", "수", "목", "금", "토", "일"].map((day) => {
              const matches = grouped[day] ?? [];
              if (matches.length === 0) return null;

              return (
                <section key={day}>
                  <div className="my-3 flex items-center gap-3">
                    <span className="h-px flex-1 bg-border-soft" />
                    <span
                      className={cn(
                        "text-[11.5px] font-extrabold tracking-tight",
                        today === day ? "text-brand-deep" : "text-text-subtle",
                      )}
                    >
                      {day}
                      {today === day ? " · 오늘" : ""}
                    </span>
                    <span className="h-px flex-1 bg-border-soft" />
                  </div>
                  <div className="space-y-2">
                    {matches.map((match) => (
                      <ScheduleBlock key={match.job.id} match={match} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="mt-[18px] flex flex-col gap-2.5 pb-1">
            <Link
              href="/my/availability"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-[14px] bg-ink px-4 py-[14px] text-[13.5px] font-extrabold tracking-[-0.02em] text-white transition-all hover:bg-black hover:shadow-soft-dark"
            >
              <CalendarDays className="h-4 w-4" />
              가용시간 수정하기
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center justify-center gap-1.5 p-2 text-[12.5px] font-bold text-muted-foreground transition-colors hover:text-ink"
            >
              {formatWorkDate(recommendations[0].job.workDate)} 추천 공고 더 보기
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
