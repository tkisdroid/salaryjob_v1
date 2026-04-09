"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Clock, Wallet, Minus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeeklyEarning {
  readonly week: string; // "1주차", "2주차", etc.
  readonly amount: number;
  readonly hours: number;
}

interface EarningsDashboardProps {
  readonly monthlyEarnings?: readonly WeeklyEarning[];
  readonly previousMonthTotal?: number;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const DEFAULT_EARNINGS: readonly WeeklyEarning[] = [
  { week: "1주차", amount: 312000, hours: 24 },
  { week: "2주차", amount: 468000, hours: 36 },
  { week: "3주차", amount: 390000, hours: 30 },
  { week: "4주차", amount: 234000, hours: 18 },
];

const DEFAULT_PREVIOUS_MONTH = 1120000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeStats(earnings: readonly WeeklyEarning[], previousMonthTotal: number) {
  const totalEarnings = earnings.reduce((sum, w) => sum + w.amount, 0);
  const totalHours = earnings.reduce((sum, w) => sum + w.hours, 0);
  const avgHourlyRate = totalHours > 0 ? Math.round(totalEarnings / totalHours) : 0;
  const maxAmount = Math.max(...earnings.map((w) => w.amount), 1);

  const diff = previousMonthTotal > 0
    ? Math.round(((totalEarnings - previousMonthTotal) / previousMonthTotal) * 100)
    : 0;

  return { totalEarnings, totalHours, avgHourlyRate, maxAmount, diff };
}

// ---------------------------------------------------------------------------
// Bar Chart Component (CSS-only)
// ---------------------------------------------------------------------------

function WeeklyBarChart({
  earnings,
  maxAmount,
}: {
  readonly earnings: readonly WeeklyEarning[];
  readonly maxAmount: number;
}) {
  return (
    <div className="flex items-end gap-2 h-32">
      {earnings.map((week) => {
        const heightPercent = (week.amount / maxAmount) * 100;
        return (
          <div
            key={week.week}
            className="flex-1 flex flex-col items-center gap-1"
          >
            {/* Amount label */}
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {Math.round(week.amount / 10000)}만
            </span>

            {/* Bar */}
            <div className="w-full relative flex-1 flex items-end">
              <div
                className="w-full rounded-t-md bg-brand/80 transition-all duration-500 ease-out"
                style={{ height: `${Math.max(heightPercent, 4)}%` }}
              />
            </div>

            {/* Week label */}
            <span className="text-[10px] text-muted-foreground font-medium">
              {week.week}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatItem({
  icon: Icon,
  label,
  value,
  className,
}: {
  readonly icon: React.ElementType;
  readonly label: string;
  readonly value: string;
  readonly className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function EarningsDashboard({
  monthlyEarnings,
  previousMonthTotal,
}: EarningsDashboardProps) {
  const earnings = monthlyEarnings ?? DEFAULT_EARNINGS;
  const prevTotal = previousMonthTotal ?? DEFAULT_PREVIOUS_MONTH;

  const stats = useMemo(() => computeStats(earnings, prevTotal), [earnings, prevTotal]);

  const TrendIcon = stats.diff > 0 ? TrendingUp : stats.diff < 0 ? TrendingDown : Minus;
  const trendColor = stats.diff > 0 ? "text-green-600" : stats.diff < 0 ? "text-red-500" : "text-muted-foreground";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">이번 달 수입</CardTitle>
        <CardDescription>근무 수입 현황을 한눈에 확인하세요</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Total earnings */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-brand tabular-nums">
              {formatMoney(stats.totalEarnings)}
            </p>
            <div className={cn("flex items-center gap-1 mt-1", trendColor)}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-xs font-medium">
                지난달 대비 {stats.diff > 0 ? "+" : ""}
                {stats.diff}%
              </span>
            </div>
          </div>
        </div>

        {/* Weekly bar chart */}
        <div className="py-2">
          <WeeklyBarChart earnings={earnings} maxAmount={stats.maxAmount} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          <StatItem
            icon={Clock}
            label="총 근무시간"
            value={`${stats.totalHours}시간`}
          />
          <StatItem
            icon={Wallet}
            label="평균 시급"
            value={formatMoney(stats.avgHourlyRate)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
