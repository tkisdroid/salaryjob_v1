"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import {
  Clock,
  Sparkles,
  ChevronLeft,
  RotateCcw,
  Check,
  Save,
  AlertTriangle,
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
import { saveAvailability } from "./actions";

// ---------------------------------------------------------------------------
// Constants (mirror server action validation)
// ---------------------------------------------------------------------------

const DAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const START_HOUR = 6;
const END_HOUR = 24;
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => i + START_HOUR,
);

type SlotKey = `${(typeof DAY_KEYS)[number]}-${number}`;

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
  dayKey: string,
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

function serializeSlots(slots: Set<SlotKey>): string[] {
  return [...slots];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; count: number; at: number }
  | { kind: "error"; message: string };

export function AvailabilityEditor({
  initialSlots,
}: {
  initialSlots: readonly string[];
}) {
  const [selectedSlots, setSelectedSlots] = useState<Set<SlotKey>>(
    () => new Set(initialSlots as SlotKey[]),
  );
  // Track the last persisted snapshot so we can show an accurate dirty badge.
  const [savedSnapshot, setSavedSnapshot] = useState<string>(
    () => [...initialSlots].sort().join(","),
  );
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  const totalHours = countSelectedHours(selectedSlots);
  const currentSnapshot = [...selectedSlots].sort().join(",");
  const isDirty = currentSnapshot !== savedSnapshot;

  // Auto-hide the success toast after a few seconds so the CTA does not
  // linger and confuse the user into saving twice.
  useEffect(() => {
    if (status.kind !== "saved") return;
    const t = setTimeout(() => {
      setStatus({ kind: "idle" });
    }, 2500);
    return () => clearTimeout(t);
  }, [status]);

  // Drag state lives in refs, NOT useState. Mobile touch drags fire
  // pointerdown and the first few pointermoves inside the same event
  // loop tick before React can re-render and hand us the post-update
  // closure. Reading state via refs is synchronous, so the move handler
  // always sees the latest drag mode and isDragging flag.
  const gridRef = useRef<HTMLDivElement | null>(null);
  const lastVisitedRef = useRef<SlotKey | null>(null);
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<"add" | "remove">("add");

  const applySlotAtPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = document.elementFromPoint(clientX, clientY);
      if (!el) return;
      const cell = el.closest("[data-slot-key]") as HTMLElement | null;
      if (!cell) return;
      const slotKey = cell.dataset.slotKey as SlotKey | undefined;
      if (!slotKey) return;
      if (lastVisitedRef.current === slotKey) return;
      lastVisitedRef.current = slotKey;
      const mode = dragModeRef.current;
      setSelectedSlots((prev) => {
        const next = new Set(prev);
        if (mode === "add") {
          next.add(slotKey);
        } else {
          next.delete(slotKey);
        }
        return next;
      });
    },
    [],
  );

  const handleGridPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el?.closest("[data-slot-key]") as HTMLElement | null;
      if (!cell) return;
      const slotKey = cell.dataset.slotKey as SlotKey | undefined;
      if (!slotKey) return;

      // Prevent the browser from interpreting the touch as a scroll
      // gesture on the horizontally-scrollable CardContent parent.
      e.preventDefault();

      // Capture the pointer on the grid so subsequent move events keep
      // firing even when the finger leaves the initially-touched cell.
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // setPointerCapture can throw if the target has already been
        // detached (StrictMode double-invoke) — safe to ignore.
      }

      // Flip refs synchronously so the very next pointermove event sees
      // the right mode + dragging flag without waiting for React to
      // re-render.
      const mode: "add" | "remove" = selectedSlots.has(slotKey)
        ? "remove"
        : "add";
      dragModeRef.current = mode;
      isDraggingRef.current = true;
      lastVisitedRef.current = slotKey;

      setSelectedSlots((prev) => {
        const next = new Set(prev);
        if (mode === "add") {
          next.add(slotKey);
        } else {
          next.delete(slotKey);
        }
        return next;
      });
    },
    [selectedSlots],
  );

  const handleGridPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      applySlotAtPoint(e.clientX, e.clientY);
    },
    [applySlotAtPoint],
  );

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
    lastVisitedRef.current = null;
  }, []);

  const handleReset = useCallback(() => {
    setSelectedSlots(new Set());
  }, []);

  const handleSave = useCallback(() => {
    const slotsArray = serializeSlots(selectedSlots);
    startTransition(async () => {
      setStatus({ kind: "saving" });
      const result = await saveAvailability({ slots: slotsArray });
      if (result.success) {
        setSavedSnapshot([...slotsArray].sort().join(","));
        setStatus({ kind: "saved", count: result.count, at: Date.now() });
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    });
  }, [selectedSlots]);

  return (
    <div
      className="max-w-lg mx-auto px-4 py-6 pb-32 space-y-6"
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
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

      {/* Empty state */}
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
            ref={gridRef}
            className="grid select-none touch-none"
            style={{
              gridTemplateColumns: "48px repeat(7, 1fr)",
              minWidth: "480px",
            }}
            onPointerDown={handleGridPointerDown}
            onPointerMove={handleGridPointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
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
                <div className="h-8 flex items-center justify-end pr-2 text-[10px] text-muted-foreground">
                  {hour}시
                </div>
                {DAY_KEYS.map((dayKey) => {
                  const slotKey: SlotKey = `${dayKey}-${hour}`;
                  const isSelected = selectedSlots.has(slotKey);

                  return (
                    <div
                      key={slotKey}
                      data-slot-key={slotKey}
                      role="button"
                      aria-pressed={isSelected}
                      aria-label={`${DAYS[DAY_KEYS.indexOf(dayKey)]}요일 ${formatHour(hour)}`}
                      className={`h-8 border border-border/50 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-brand/80 border-brand/60"
                          : "bg-background hover:bg-brand/10"
                      }`}
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

      {/* Summary */}
      <div>
        <p className="text-sm font-medium">
          이번 주{" "}
          <span className="text-brand font-bold">{totalHours}시간</span> 등록됨
        </p>
        <p className="text-xs text-muted-foreground">
          {totalHours > 0
            ? "AI가 맞춤 공고를 찾고 있어요"
            : "시간을 등록하면 AI 매칭이 시작됩니다"}
        </p>
      </div>

      {/* Save status banner */}
      {status.kind === "saved" && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2 text-xs text-green-700 dark:text-green-300">
          <Check className="w-4 h-4" />
          저장되었어요 ({status.count}개 슬롯)
        </div>
      )}
      {status.kind === "error" && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{status.message}</span>
        </div>
      )}

      {/* Sticky bottom action bar: positioned above the MobileTabBar (h-16 +
          safe-area). The fixed bar at bottom-16 sits just above the brand
          tab bar on mobile, and degrades to a normal spacer on desktop. */}
      <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {isDirty ? (
              <p className="text-[11px] text-amber-600 font-medium">
                저장되지 않은 변경사항
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">모두 저장됨</p>
            )}
            <p className="text-xs font-bold">총 {totalHours}시간</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              asChild
              className="text-xs"
            >
              <Link href="/explore">
                <Sparkles className="w-3.5 h-3.5" />
                매칭 보기
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending || !isDirty}
              className="bg-brand hover:bg-brand-dark text-white text-xs disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {status.kind === "saving" || isPending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
