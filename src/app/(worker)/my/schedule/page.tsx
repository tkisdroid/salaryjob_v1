"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  ChevronLeft,
  RefreshCw,
  Clock,
  Wallet,
  CalendarDays,
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  Briefcase,
  PartyPopper,
  GraduationCap,
  Monitor,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import {
  generateWeeklySchedule,
  type ScheduleRecommendation,
} from "@/lib/services/auto-scheduling";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "음식점·카페": UtensilsCrossed,
  "판매·유통": ShoppingBag,
  "물류·배송": Truck,
  "사무·행정": Briefcase,
  "행사·이벤트": PartyPopper,
  "청소·정리": Sparkles,
  "교육·과외": GraduationCap,
  "IT·디자인": Monitor,
};

// Mock input data for schedule generation
const MOCK_WORKER_PREFERENCES = {
  preferredCategories: ["food", "event"],
  preferredRegions: ["강남", "역삼", "서초"],
  minHourlyRate: 11000,
};

const MOCK_AVAILABLE_SLOTS = [
  { day: "월", startHour: 9, endHour: 13 },
  { day: "화", startHour: 14, endHour: 18 },
  { day: "수", startHour: 9, endHour: 13 },
  { day: "목", startHour: 18, endHour: 22 },
  { day: "금", startHour: 14, endHour: 20 },
  { day: "토", startHour: 10, endHour: 16 },
  { day: "일", startHour: 10, endHour: 14 },
];

const MOCK_MATCH_HISTORY = [
  { category: "food", avgRating: 4.7, count: 8 },
  { category: "event", avgRating: 4.5, count: 3 },
  { category: "logistics", avgRating: 4.2, count: 2 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCategoryIcon(categoryLabel: string): LucideIcon {
  return CATEGORY_ICONS[categoryLabel] ?? Sparkles;
}

function renderCategoryIcon(categoryLabel: string, className: string) {
  const Icon = getCategoryIcon(categoryLabel);
  return <Icon className={className} />;
}

// ---------------------------------------------------------------------------
// Schedule Block Component
// ---------------------------------------------------------------------------

function ScheduleBlock({
  recommendation,
}: {
  readonly recommendation: ScheduleRecommendation;
}) {
  const isPeak = recommendation.matchScore >= 100;
  return (
    <div className="flex items-start gap-3 rounded-[18px] border border-border-soft bg-surface p-[14px] transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-soft-sm">
      {/* Category icon tile — 36x36 per .ai-slot .ico spec */}
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep">
        {renderCategoryIcon(recommendation.category, "h-[18px] w-[18px]")}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold tracking-tight text-muted-foreground">
          {recommendation.category}
        </p>
        <div className="tabnum mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] font-semibold text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <b className="font-extrabold text-ink">{recommendation.timeSlot}</b>
          </span>
          <span className="inline-flex items-center gap-1">
            <Wallet className="h-3 w-3" />
            <b className="font-extrabold text-ink">
              {formatMoney(recommendation.estimatedPay)}
            </b>
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[10.5px] font-medium leading-snug text-text-subtle">
          {recommendation.reason}
        </p>
      </div>

      {/* Match % pill — peak (100%+) uses inverse ink+brand for "오늘 반드시 잡아야 할" slots.
          Padding 4px 9px matches .ai-slot .pct design spec. */}
      <span
        className={cn(
          "tabnum shrink-0 rounded-full px-[9px] py-1 text-[10.5px] font-extrabold tracking-[-0.01em]",
          isPeak ? "bg-ink text-brand" : "bg-brand text-ink",
        )}
      >
        {recommendation.matchScore}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day Column Component
// ---------------------------------------------------------------------------

function DayColumn({
  day,
  recommendations,
  isToday,
}: {
  readonly day: string;
  readonly recommendations: readonly ScheduleRecommendation[];
  readonly isToday: boolean;
}) {
  // Skip empty days entirely in the premium layout — design only shows days
  // that have a recommendation so the hairline-separated weekday labels read
  // as a clean outline rather than a sparse grid of "추천 없음" placeholders.
  if (recommendations.length === 0) return null;

  return (
    <div>
      {/* ai-day-head — centered mini label with hairlines on both sides */}
      <div className="my-3 flex items-center gap-3">
        <span className="h-px flex-1 bg-border-soft" />
        <span
          className={cn(
            "text-[11.5px] font-extrabold tracking-tight",
            isToday ? "text-brand-deep" : "text-text-subtle",
          )}
        >
          {day}
          {isToday ? " · 오늘" : ""}
        </span>
        <span className="h-px flex-1 bg-border-soft" />
      </div>

      <div className="space-y-2">
        {recommendations.map((rec) => (
          <ScheduleBlock
            key={`${rec.day}-${rec.timeSlot}`}
            recommendation={rec}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function SchedulePage() {
  const [recommendations, setRecommendations] = useState<ScheduleRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAvailability, setHasAvailability] = useState(true);

  const loadSchedule = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await generateWeeklySchedule({
        workerPreferences: MOCK_WORKER_PREFERENCES,
        availableSlots: MOCK_AVAILABLE_SLOTS,
        matchHistory: MOCK_MATCH_HISTORY,
      });
      setRecommendations(results);
      setHasAvailability(MOCK_AVAILABLE_SLOTS.length > 0);
    } catch (error) {
      console.error("Failed to generate schedule:", error);
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // Group recommendations by day
  const recommendationsByDay = DAYS.reduce<Record<string, ScheduleRecommendation[]>>(
    (acc, day) => ({
      ...acc,
      [day]: recommendations.filter((r) => r.day === day),
    }),
    {}
  );

  // Total estimated earnings for the week
  const weeklyTotal = recommendations.reduce(
    (sum, r) => sum + r.estimatedPay,
    0
  );

  // Determine "today" for highlighting (Korean day of week)
  const todayIndex = (new Date().getDay() + 6) % 7; // 0=Mon, 6=Sun
  const todayLabel = DAYS[todayIndex];

  const totalHours = recommendations.reduce((sum, r) => {
    const match = r.timeSlot.match(/(\d+):\d+\s*[—~\-]\s*(\d+):\d+/);
    if (!match) return sum;
    const [, start, end] = match;
    return sum + (parseInt(end, 10) - parseInt(start, 10));
  }, 0);

  return (
    <div className="mx-auto max-w-lg px-4 pt-3 pb-24">
      {/* ai-title-row */}
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
        이번 주 최적의 일정을 제안해드릴게요
      </p>

      {/* Empty state: no availability */}
      {!hasAvailability && !isLoading && (
        <div className="rounded-[28px] border-2 border-dashed border-border bg-surface py-12 text-center">
          <CalendarDays className="mx-auto mb-4 h-12 w-12 text-text-subtle" />
          <p className="text-[15px] font-extrabold tracking-tight text-ink">
            가용시간을 먼저 등록해주세요
          </p>
          <p className="mb-4 mt-1 text-[12.5px] font-medium text-muted-foreground">
            가용시간을 먼저 등록하면 AI가 최적의 스케줄을 추천해드려요
          </p>
          <Button size="default" asChild>
            <Link href="/my/availability">
              <Clock className="h-4 w-4" />
              가용시간 등록하기
            </Link>
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="rounded-[22px] border border-border-soft bg-surface py-12 text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-brand-deep" />
          <p className="text-[13px] font-bold text-muted-foreground">
            AI가 최적의 스케줄을 분석하고 있어요…
          </p>
        </div>
      )}

      {/* Schedule results */}
      {!isLoading && hasAvailability && recommendations.length > 0 && (
        <>
          {/* ai-hero — ink bg + brand-green amount ("이 수치가 당신의 기회").
              radius 20px, pad 18px, amt 34px per design spec. */}
          <div className="rounded-[20px] bg-ink p-[18px] text-white">
            <p className="text-[11.5px] font-bold tracking-[-0.01em] text-[color-mix(in_oklch,#fff_75%,transparent)]">
              이번 주 예상 수입
            </p>
            <p className="tabnum mt-2 text-[34px] font-extrabold tracking-[-0.035em] text-brand">
              {formatMoney(weeklyTotal)}
            </p>
            <p className="mt-0.5 text-[10.5px] font-semibold text-[color-mix(in_oklch,#fff_55%,transparent)]">
              {recommendations.length}개 추천 스케줄 · 총 {totalHours}시간
            </p>
          </div>

          {/* Day-by-day schedule */}
          <div className="mt-2">
            {DAYS.map((day) => (
              <DayColumn
                key={day}
                day={day}
                recommendations={recommendationsByDay[day] ?? []}
                isToday={day === todayLabel}
              />
            ))}
          </div>

          {/* ai-actionbar: ink primary + ghost secondary.
              Design-specific exception: .ai-btn uses rounded-[14px] rectangle,
              NOT the app-wide pill CTA — intentional per design spec. */}
          <div className="mt-[18px] flex flex-col gap-2.5 pb-1">
            <Link
              href="/my/availability"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-[14px] bg-ink px-4 py-[14px] text-[13.5px] font-extrabold tracking-[-0.02em] text-white transition-all hover:bg-black hover:shadow-soft-dark"
            >
              <CalendarDays className="h-4 w-4" />
              이 스케줄로 가용시간 등록
            </Link>
            <button
              type="button"
              onClick={loadSchedule}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1.5 p-2 text-[12.5px] font-bold text-muted-foreground transition-colors hover:text-ink disabled:opacity-50"
            >
              <RefreshCw
                className={cn("h-3 w-3", isLoading && "animate-spin")}
              />
              다시 추천받기
            </button>
          </div>
        </>
      )}

      {/* No recommendations but has availability */}
      {!isLoading && hasAvailability && recommendations.length === 0 && (
        <div className="rounded-[28px] border-2 border-dashed border-border bg-surface py-12 text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 text-text-subtle" />
          <p className="text-[15px] font-extrabold tracking-tight text-ink">
            추천할 스케줄이 없어요
          </p>
          <p className="mb-4 mt-1 text-[12.5px] font-medium text-muted-foreground">
            가용시간을 더 넓혀보시면 더 많은 추천을 받을 수 있어요
          </p>
          <Button variant="ghost-premium" onClick={loadSchedule}>
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </Button>
        </div>
      )}
    </div>
  );
}
