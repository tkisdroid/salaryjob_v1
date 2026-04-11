"use client";

import { Fragment, useState, useCallback } from "react";
import Link from "next/link";
import {
  Clock,
  Sparkles,
  ChevronLeft,
  RotateCcw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const START_HOUR = 6;
const END_HOUR = 24;
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => i + START_HOUR
);

type SlotKey = `${(typeof DAY_KEYS)[number]}-${number}`;

// ---------------------------------------------------------------------------
// Mock existing availability data
// ---------------------------------------------------------------------------

const INITIAL_SLOTS: Set<SlotKey> = new Set([
  "mon-9",
  "mon-10",
  "mon-11",
  "wed-14",
  "wed-15",
  "wed-16",
  "fri-18",
  "fri-19",
  "fri-20",
  "fri-21",
  "sat-10",
  "sat-11",
  "sat-12",
  "sat-13",
  "sat-14",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatHour(hour: number): string {
  if (hour === 0 || hour === 24) return "자정";
  if (hour < 12) return `오전 ${hour}시`;
  if (hour === 12) return "오후 12시";
  return `오후 ${hour - 12}시`;
}

function countSelectedHours(slots: Set<SlotKey>): number {
  return slots.size;
}

function getContiguousBlocks(
  slots: Set<SlotKey>,
  dayKey: string
): Array<{ start: number; end: number }> {
  const daySlots = HOURS.filter((h) => slots.has(`${dayKey}-${h}` as SlotKey));
  if (daySlots.length === 0) return [];

  const blocks: Array<{ start: number; end: number }> = [];
  let start = daySlots[0];
  let prev = daySlots[0];

  for (let i = 1; i < daySlots.length; i++) {
    if (daySlots[i] !== prev + 1) {
      blocks.push({ start, end: prev + 1 });
      start = daySlots[i];
    }
    prev = daySlots[i];
  }
  blocks.push({ start, end: prev + 1 });
  return blocks;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AvailabilityPage() {
  const [selectedSlots, setSelectedSlots] = useState<Set<SlotKey>>(
    () => new Set(INITIAL_SLOTS)
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove">("add");

  const totalHours = countSelectedHours(selectedSlots);

  const toggleSlot = useCallback((slotKey: SlotKey) => {
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slotKey)) {
        next.delete(slotKey);
      } else {
        next.add(slotKey);
      }
      return next;
    });
  }, []);

  const handlePointerDown = useCallback(
    (slotKey: SlotKey) => {
      setIsDragging(true);
      const newMode = selectedSlots.has(slotKey) ? "remove" : "add";
      setDragMode(newMode);
      toggleSlot(slotKey);
    },
    [selectedSlots, toggleSlot]
  );

  const handlePointerEnter = useCallback(
    (slotKey: SlotKey) => {
      if (!isDragging) return;
      setSelectedSlots((prev) => {
        const next = new Set(prev);
        if (dragMode === "add") {
          next.add(slotKey);
        } else {
          next.delete(slotKey);
        }
        return next;
      });
    },
    [isDragging, dragMode]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedSlots(new Set());
  }, []);

  return (
    <div
      className="max-w-lg mx-auto px-4 py-6 space-y-6"
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Link href="/my" className="p-1 -ml-1 hover:bg-muted rounded-md">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand" />
            내 가용시간
          </h1>
        </div>
        <p className="text-sm text-muted-foreground pl-7">
          빈 시간을 등록하면 AI가 맞춤 공고를 찾아드려요
        </p>
      </header>

      {/* Empty state or Calendar */}
      {totalHours === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">
              아직 등록된 시간이 없어요
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              빈 시간을 탭해서 등록해보세요{" "}
              <span aria-hidden="true">&#9757;&#65039;</span>
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Weekly Calendar Grid */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">이번 주</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-muted-foreground"
            >
              <RotateCcw className="w-3 h-3" />
              초기화
            </Button>
          </div>
          <CardDescription className="text-xs">
            셀을 탭하거나 드래그해서 가용 시간을 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto -mx-4 px-4">
          <div
            className="grid select-none touch-none"
            style={{
              gridTemplateColumns: "48px repeat(7, 1fr)",
              minWidth: "480px",
            }}
          >
            {/* Header row */}
            <div className="h-8" />
            {DAYS.map((day, i) => {
              const isWeekend = i >= 5;
              return (
                <div
                  key={day}
                  className={`h-8 flex items-center justify-center text-xs font-semibold ${
                    isWeekend ? "text-brand" : "text-foreground"
                  }`}
                >
                  {day}
                </div>
              );
            })}

            {/* Time rows. Fragment needs an explicit key here — short-form
                `<>` fragments cannot carry one, so we use Fragment. */}
            {HOURS.map((hour) => (
              <Fragment key={`row-${hour}`}>
                {/* Time label */}
                <div className="h-8 flex items-center justify-end pr-2 text-[10px] text-muted-foreground">
                  {hour}시
                </div>

                {/* Day cells */}
                {DAY_KEYS.map((dayKey) => {
                  const slotKey: SlotKey = `${dayKey}-${hour}`;
                  const isSelected = selectedSlots.has(slotKey);

                  return (
                    <div
                      key={slotKey}
                      role="button"
                      aria-pressed={isSelected}
                      aria-label={`${DAYS[DAY_KEYS.indexOf(dayKey)]}요일 ${formatHour(hour)}`}
                      className={`h-8 border border-border/50 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-brand/80 border-brand/60"
                          : "bg-background hover:bg-brand/10"
                      }`}
                      onPointerDown={() => handlePointerDown(slotKey)}
                      onPointerEnter={() => handlePointerEnter(slotKey)}
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-brand/80" />
              <span>가용</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-background border border-border" />
              <span>불가</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time blocks summary */}
      {totalHours > 0 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">등록된 시간 블록</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {DAY_KEYS.map((dayKey, i) => {
                const blocks = getContiguousBlocks(selectedSlots, dayKey);
                if (blocks.length === 0) return null;
                return (
                  <div key={dayKey} className="flex items-start gap-2">
                    <Badge
                      variant={i >= 5 ? "default" : "secondary"}
                      className="shrink-0 w-8 justify-center"
                    >
                      {DAYS[i]}
                    </Badge>
                    <div className="flex flex-wrap gap-1">
                      {blocks.map((block) => (
                        <span
                          key={`${dayKey}-${block.start}`}
                          className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md"
                        >
                          {formatHour(block.start)} - {formatHour(block.end)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Summary & CTA */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            이번 주{" "}
            <span className="text-brand font-bold">{totalHours}시간</span>{" "}
            등록됨
          </p>
          <p className="text-xs text-muted-foreground">
            {totalHours > 0
              ? "AI가 맞춤 공고를 찾고 있어요"
              : "시간을 등록하면 AI 매칭이 시작됩니다"}
          </p>
        </div>
        <Button className="bg-brand hover:bg-brand-dark text-white" asChild>
          <Link href="/explore">
            <Sparkles className="w-4 h-4" />
            AI 매칭 추천 보기
          </Link>
        </Button>
      </div>
    </div>
  );
}
