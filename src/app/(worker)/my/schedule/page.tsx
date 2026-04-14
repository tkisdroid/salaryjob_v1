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
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
  return (
    <div className="rounded-2xl border border-border bg-card p-4 active:scale-[0.99] transition-transform">
      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
          {renderCategoryIcon(recommendation.category, "w-5 h-5 text-brand")}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold truncate">
              {recommendation.category}
            </h3>
            <span
              className={cn(
                "text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0",
                recommendation.matchScore >= 100
                  ? "bg-brand text-white"
                  : "bg-brand/10 text-brand"
              )}
            >
              {recommendation.matchScore}%
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {recommendation.timeSlot}
            </span>
            <span className="flex items-center gap-1">
              <Wallet className="w-3 h-3" />
              {formatMoney(recommendation.estimatedPay)}
            </span>
          </div>

          <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-1">
            {recommendation.reason}
          </p>
        </div>
      </div>
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
  return (
    <div>
      {/* Day divider */}
      <div className="flex items-center justify-center my-2">
        <div
          className={cn(
            "px-8 py-1.5 rounded-full text-xs font-semibold",
            isToday
              ? "bg-brand text-white"
              : "bg-transparent text-muted-foreground"
          )}
        >
          {day}
        </div>
      </div>

      {recommendations.length > 0 ? (
        <div className="space-y-2">
          {recommendations.map((rec) => (
            <ScheduleBlock key={`${rec.day}-${rec.timeSlot}`} recommendation={rec} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-border">
          <span className="text-xs text-muted-foreground">추천 없음</span>
        </div>
      )}
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

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <Link href="/my" className="p-1 -ml-1 hover:bg-muted rounded-md text-muted-foreground">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-brand" />
            <h1 className="text-base font-bold">AI 추천 스케줄</h1>
          </div>
        </div>
        <p className="text-xs text-muted-foreground pl-7">
          이번 주 최적의 일정을 제안해드릴게요
        </p>
      </header>

      {/* Empty state: no availability */}
      {!hasAvailability && !isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarDays className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">
              가용시간을 먼저 등록해주세요
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
              가용시간을 먼저 등록하면 AI가 최적의 스케줄을 추천해드려요
            </p>
            <Button className="bg-brand hover:bg-brand-dark text-white" asChild>
              <Link href="/my/availability">
                <Clock className="w-4 h-4" />
                가용시간 등록하기
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <RefreshCw className="w-8 h-8 text-brand animate-spin mb-4" />
            <p className="text-sm text-muted-foreground font-medium">
              AI가 최적의 스케줄을 분석하고 있어요...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Schedule results */}
      {!isLoading && hasAvailability && recommendations.length > 0 && (
        <>
          {/* Weekly summary */}
          <Card className="rounded-2xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">이번 주 예상 수입</p>
                <p className="text-[10px] text-muted-foreground">
                  {recommendations.length}개 추천 스케줄
                </p>
              </div>
              <p className="text-xl font-extrabold tabular-nums">
                {formatMoney(weeklyTotal)}
              </p>
            </CardContent>
          </Card>

          {/* Day-by-day schedule */}
          <div className="space-y-4">
            {DAYS.map((day) => (
              <DayColumn
                key={day}
                day={day}
                recommendations={recommendationsByDay[day] ?? []}
                isToday={day === todayLabel}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <Button className="w-full rounded-xl bg-brand hover:bg-brand-dark text-white py-3.5 text-sm font-semibold active:scale-[0.98] transition-transform" asChild>
              <Link href="/my/availability">
                <CalendarDays className="w-4 h-4" />
                이 스케줄로 가용시간 등록
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="w-full text-sm font-medium text-muted-foreground active:scale-[0.98]"
              onClick={loadSchedule}
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              다시 추천받기
            </Button>
          </div>
        </>
      )}

      {/* No recommendations but has availability */}
      {!isLoading && hasAvailability && recommendations.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">
              추천할 스케줄이 없어요
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
              가용시간을 더 넓혀보시면 더 많은 추천을 받을 수 있어요
            </p>
            <Button variant="outline" onClick={loadSchedule}>
              <RefreshCw className="w-4 h-4" />
              다시 시도
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
