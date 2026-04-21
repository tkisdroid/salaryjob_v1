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
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { categoryLabel, formatWorkDate } from "@/lib/job-utils";
import { summarizeAvailabilitySlots } from "@/lib/availability-slots";
import { getAvailabilityMatches, saveAvailability } from "./actions";

// ---------------------------------------------------------------------------
// Constants (mirror server action validation)
// ---------------------------------------------------------------------------

const DAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

// 24 selectable hours with early-morning (0-5) rendered AFTER late-night (23)
// so overnight shifts (e.g., 22:00-02:00) read as a visually continuous block
// in the grid rather than wrapping to the top of the next day.
const HOURS: readonly number[] = [
  6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
  0, 1, 2, 3, 4, 5,
];

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

  // Contiguity is defined against HOURS' display order so an overnight
  // selection like 22,23,0,1 collapses into a single 22:00-02:00 block.
  const blocks: Array<{ start: number; end: number }> = [];
  let start = daySlots[0];
  let prev = daySlots[0];
  let prevIdx = HOURS.indexOf(daySlots[0]);

  for (let i = 1; i < daySlots.length; i++) {
    const currIdx = HOURS.indexOf(daySlots[i]);
    if (currIdx !== prevIdx + 1) {
      blocks.push({ start, end: prev + 1 });
      start = daySlots[i];
    }
    prev = daySlots[i];
    prevIdx = currIdx;
  }
  blocks.push({ start, end: prev + 1 });
  return blocks;
}

function serializeSlots(slots: Set<SlotKey>): string[] {
  return [...slots];
}

function parseSlotKey(slotKey: SlotKey) {
  const [dayKey, hour] = slotKey.split("-");
  return {
    dayKey: dayKey as (typeof DAY_KEYS)[number],
    hour: Number(hour),
  };
}

function getSlotRange(from: SlotKey | null, to: SlotKey): SlotKey[] {
  if (!from) return [to];

  const start = parseSlotKey(from);
  const end = parseSlotKey(to);

  if (start.dayKey === end.dayKey) {
    // Use HOURS array position (not raw hour value) so that an overnight
    // drag such as 22→02 fills [22, 23, 0, 1, 2] instead of [2..22].
    const startIdx = HOURS.indexOf(start.hour);
    const endIdx = HOURS.indexOf(end.hour);
    if (startIdx === -1 || endIdx === -1) return [to];
    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);
    const slots: SlotKey[] = [];
    for (let i = minIdx; i <= maxIdx; i += 1) {
      slots.push(`${start.dayKey}-${HOURS[i]}` as SlotKey);
    }
    return slots;
  }

  if (start.hour === end.hour) {
    const fromIndex = DAY_KEYS.indexOf(start.dayKey);
    const toIndex = DAY_KEYS.indexOf(end.dayKey);
    const min = Math.min(fromIndex, toIndex);
    const max = Math.max(fromIndex, toIndex);
    const slots: SlotKey[] = [];
    for (let index = min; index <= max; index += 1) {
      slots.push(`${DAY_KEYS[index]}-${start.hour}` as SlotKey);
    }
    return slots;
  }

  return [to];
}

function getSlotElementAtPoint(clientX: number, clientY: number) {
  const hitStack =
    typeof document.elementsFromPoint === "function"
      ? document.elementsFromPoint(clientX, clientY)
      : [document.elementFromPoint(clientX, clientY)].filter(
          (element): element is Element => element instanceof Element,
        );

  for (const element of hitStack) {
    const cell = element.closest("[data-slot-key]");
    if (cell instanceof HTMLElement) {
      return cell;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; count: number; at: number }
  | { kind: "error"; message: string };

type MatchResult = Awaited<ReturnType<typeof getAvailabilityMatches>>;
type AiMatch = Extract<MatchResult, { success: true }>["matches"][number];
type MatchStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; matches: AiMatch[] }
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
  const [matchStatus, setMatchStatus] = useState<MatchStatus>({ kind: "idle" });
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
  // closure. Reading state via refs is synchronous.
  const gridRef = useRef<HTMLDivElement | null>(null);
  const lastVisitedRef = useRef<SlotKey | null>(null);
  const dragModeRef = useRef<"add" | "remove">("add");
  const slotRectsRef = useRef<Array<{ slotKey: SlotKey; rect: DOMRect }>>([]);
  const dragTouchTargetRef = useRef<HTMLElement | null>(null);
  // A ref that reflects selectedSlots without forcing re-renders of the
  // mousedown handler. We use this to decide the initial drag mode
  // without re-binding the grid listeners on every selection change.
  const selectedSlotsRef = useRef(selectedSlots);
  useEffect(() => {
    selectedSlotsRef.current = selectedSlots;
  }, [selectedSlots]);

  const refreshSlotRects = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) {
      slotRectsRef.current = [];
      return;
    }

    slotRectsRef.current = Array.from(
      grid.querySelectorAll<HTMLElement>("[data-slot-key]"),
    )
      .map((cell) => {
        const slotKey = cell.dataset.slotKey as SlotKey | undefined;
        if (!slotKey) return null;
        return {
          slotKey,
          rect: cell.getBoundingClientRect(),
        };
      })
      .filter((entry): entry is { slotKey: SlotKey; rect: DOMRect } => entry !== null);
  }, []);

  const getSlotKeyAtPoint = useCallback((clientX: number, clientY: number) => {
    const cached = slotRectsRef.current.find(
      ({ rect }) =>
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom,
    );
    if (cached) return cached.slotKey;

    const cell = getSlotElementAtPoint(clientX, clientY);
    return (cell?.dataset.slotKey as SlotKey | undefined) ?? null;
  }, []);

  const applySlotAtPoint = useCallback((clientX: number, clientY: number) => {
    const slotKey = getSlotKeyAtPoint(clientX, clientY);
    if (!slotKey) return;
    if (lastVisitedRef.current === slotKey) return;
    const slotKeys = getSlotRange(lastVisitedRef.current, slotKey);
    lastVisitedRef.current = slotKey;
    const mode = dragModeRef.current;
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      for (const key of slotKeys) {
        if (mode === "add") {
          next.add(key);
        } else {
          next.delete(key);
        }
      }
      return next;
    });
  }, [getSlotKeyAtPoint]);

  // Native window-level drag listeners. Attached lazily from
  // pointerdown/touchstart and torn down on pointerup/touchend/cancel.
  //
  // Why native window listeners instead of React synthetic events on the
  // grid div + setPointerCapture:
  //   1. React 17+ uses event delegation — synthetic events don't always
  //      play nice with setPointerCapture on currentTarget.
  //   2. Mobile Safari and some mobile Chrome builds silently drop pointer
  //      capture when the parent element has `overflow-x: auto` (the
  //      CardContent that wraps our grid), because the browser reserves
  //      the pointer for the scroller.
  //   3. Touch events fire on their initial target for the full gesture
  //      regardless of capture — using them directly is the most reliable
  //      mobile path.
  //
  // We attach to window (not the grid) so the move listener keeps firing
  // even if the finger drifts outside the grid card entirely.
  const beginDrag = useCallback(
    (clientX: number, clientY: number) => {
      refreshSlotRects();
      const slotKey = getSlotKeyAtPoint(clientX, clientY);
      if (!slotKey) return false;

      const mode: "add" | "remove" = selectedSlotsRef.current.has(slotKey)
        ? "remove"
        : "add";
      dragModeRef.current = mode;
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
      return true;
    },
    [getSlotKeyAtPoint, refreshSlotRects],
  );

  const endDrag = useCallback(() => {
    lastVisitedRef.current = null;
  }, []);

  // Touch path — we attach native listeners via useEffect below instead
  // of using React's onTouchStart/onTouchMove props. React 18+ registers
  // all touch event listeners as PASSIVE by default (perf optimization
  // for scroll jank), which means calling e.preventDefault() inside a
  // React synthetic touch handler is silently ignored. Without
  // preventDefault, mobile Chrome interprets the drag as a horizontal
  // scroll of the parent overflow-x-auto CardContent and the very first
  // touchmove after touchstart never reaches the handler — only the
  // initial tap flips a cell, and the rest of the drag is lost.
  //
  // Binding addEventListener ourselves with { passive: false } is the
  // only way to actually cancel the browser's default gesture handling.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const onTouchMove = (ev: TouchEvent) => {
      const touch = ev.changedTouches[0] ?? ev.touches[0];
      if (!touch) return;
      ev.preventDefault();
      applySlotAtPoint(touch.clientX, touch.clientY);
    };

    const detachTouchListeners = () => {
      const dragTouchTarget = dragTouchTargetRef.current;
      if (dragTouchTarget) {
        dragTouchTarget.removeEventListener("touchmove", onTouchMove);
        dragTouchTarget.removeEventListener("touchend", onTouchEnd);
        dragTouchTarget.removeEventListener("touchcancel", onTouchEnd);
      }
      dragTouchTargetRef.current = null;
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };

    const onTouchEnd = (ev: TouchEvent) => {
      const touch = ev.changedTouches[0];
      if (touch) {
        applySlotAtPoint(touch.clientX, touch.clientY);
      }
      endDrag();
      detachTouchListeners();
    };

    const onTouchStart = (ev: TouchEvent) => {
      const touch = ev.changedTouches[0] ?? ev.touches[0];
      if (!touch) return;
      if (beginDrag(touch.clientX, touch.clientY)) {
        ev.preventDefault();
        const dragTouchTarget =
          ev.target instanceof HTMLElement ? ev.target : null;
        dragTouchTargetRef.current = dragTouchTarget;
        if (dragTouchTarget) {
          dragTouchTarget.addEventListener("touchmove", onTouchMove, {
            passive: false,
          });
          dragTouchTarget.addEventListener("touchend", onTouchEnd);
          dragTouchTarget.addEventListener("touchcancel", onTouchEnd);
        }
        window.addEventListener("touchmove", onTouchMove, { passive: false });
        window.addEventListener("touchend", onTouchEnd);
        window.addEventListener("touchcancel", onTouchEnd);
      }
    };

    grid.addEventListener("touchstart", onTouchStart, { passive: false });
    grid.addEventListener("touchmove", onTouchMove, { passive: false });
    grid.addEventListener("touchend", onTouchEnd);
    grid.addEventListener("touchcancel", onTouchEnd);

    return () => {
      grid.removeEventListener("touchstart", onTouchStart);
      grid.removeEventListener("touchmove", onTouchMove);
      grid.removeEventListener("touchend", onTouchEnd);
      grid.removeEventListener("touchcancel", onTouchEnd);
      detachTouchListeners();
    };
  }, [beginDrag, applySlotAtPoint, endDrag]);

  // Mouse / pen path (desktop). Uses window-level listeners bound
  // inside mousedown so we don't depend on React's delegation or
  // setPointerCapture.
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only primary button.
      if (e.button !== 0) return;
      if (!beginDrag(e.clientX, e.clientY)) return;

      const onMove = (ev: MouseEvent) => {
        applySlotAtPoint(ev.clientX, ev.clientY);
      };
      const onUp = () => {
        endDrag();
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [beginDrag, endDrag, applySlotAtPoint],
  );

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

  const handleAiMatch = useCallback(() => {
    const slotsArray = serializeSlots(selectedSlots);
    startTransition(async () => {
      setMatchStatus({ kind: "loading" });
      const result = await getAvailabilityMatches({ slots: slotsArray });
      if (result.success) {
        setMatchStatus({ kind: "ready", matches: result.matches });
      } else {
        setMatchStatus({ kind: "error", message: result.error });
      }
    });
  }, [selectedSlots]);

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 py-6 pb-16">
      {/* Header */}
      <header className="flex items-center gap-2">
        <Link
          href="/my"
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-ink transition-colors hover:border-ink hover:bg-surface-2"
          aria-label="뒤로"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-[18px] font-extrabold tracking-[-0.025em] text-ink">
            시간 등록
          </h1>
          <p className="text-[12px] font-medium text-muted-foreground">
            빈 시간을 등록하면 AI가 맞춤 공고를 찾아드려요
          </p>
        </div>
      </header>

      {/* Empty state */}
      {totalHours === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-border bg-surface py-12 text-center">
          <Clock className="mb-3 h-10 w-10 text-text-subtle" />
          <p className="text-[14px] font-extrabold tracking-tight text-ink">
            아직 등록된 시간이 없어요
          </p>
          <p className="mt-1 text-[12.5px] font-medium text-muted-foreground">
            빈 시간을 탭해서 등록해보세요{" "}
            <span aria-hidden="true">&#9757;&#65039;</span>
          </p>
        </div>
      ) : null}

      {/* Weekly Calendar Grid */}
      <section className="rounded-[22px] border border-border-soft bg-surface p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-extrabold tracking-tight text-ink">
                가능한 시간을 선택하세요
              </p>
              <p className="text-[11.5px] font-medium text-muted-foreground">
                드래그로 여러 칸을 한 번에 선택
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-surface px-3 text-[11.5px] font-bold text-ink transition-colors hover:border-ink hover:bg-surface-2"
          >
            <RotateCcw className="h-3 w-3" />
            초기화
          </button>
        </div>

        <div
          ref={gridRef}
          data-testid="availability-grid"
          className="grid touch-none select-none"
          style={{
            gridTemplateColumns: "28px repeat(7, minmax(0, 1fr))",
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Header row */}
          <div className="h-8" />
          {DAYS.map((day, i) => {
            const isWeekend = i >= 5;
            return (
              <div
                key={day}
                className={cn(
                  "grid h-8 place-items-center rounded-md text-[10.5px] font-extrabold tracking-tight",
                  isWeekend ? "text-brand-deep" : "text-muted-foreground",
                )}
              >
                {day}
              </div>
            );
          })}

          {/* Time rows */}
          {HOURS.map((hour) => (
            <Fragment key={`row-${hour}`}>
              <div className="tabnum flex h-8 items-center justify-end pr-1 text-[10px] font-semibold text-text-subtle">
                {hour}
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
                    className={cn(
                      "h-7 cursor-pointer rounded-md transition-colors",
                      isSelected
                        ? "bg-ink"
                        : "bg-surface-2 hover:bg-[color-mix(in_oklch,var(--brand)_15%,var(--surface-2))]",
                    )}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-[11px] font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-ink" />
            <span>가용</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-surface-2" />
            <span>불가</span>
          </div>
        </div>
      </section>

      {/* Time blocks summary */}
      {totalHours > 0 && (
        <section className="rounded-[22px] border border-border-soft bg-surface p-4">
          <p className="mb-3 text-[13.5px] font-extrabold tracking-tight text-ink">
            등록된 시간 블록
          </p>
          <div className="space-y-2.5">
            {DAY_KEYS.map((dayKey, i) => {
              const blocks = getContiguousBlocks(selectedSlots, dayKey);
              if (blocks.length === 0) return null;
              const isWeekend = i >= 5;
              return (
                <div key={dayKey} className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "inline-flex h-6 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-extrabold",
                      isWeekend
                        ? "bg-ink text-white"
                        : "bg-surface-2 text-ink",
                    )}
                  >
                    {DAYS[i]}
                  </span>
                  <div className="tabnum flex flex-wrap gap-1.5">
                    {blocks.map((block) => (
                      <span
                        key={`${dayKey}-${block.start}`}
                        className="rounded-md bg-surface-2 px-2 py-0.5 text-[11.5px] font-semibold text-ink"
                      >
                        {formatHour(block.start)} – {formatHour(block.end)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Summary */}
      <div className="border-t border-dashed border-border pt-4 text-center">
        <p className="text-[11.5px] font-bold uppercase tracking-wider text-text-subtle">
          {totalHours}개 시간대 선택됨
        </p>
        <p className="tabnum mt-1 text-[14px] font-extrabold text-ink">
          이번 주{" "}
          <span className="text-brand-deep">{totalHours}시간</span> 등록됨
        </p>
      </div>

      {/* Save status banner */}
      {status.kind === "saved" && (
        <div className="flex items-center gap-2 rounded-[14px] border border-brand/30 bg-[color-mix(in_oklch,var(--brand)_12%,var(--surface))] px-3 py-2 text-[12.5px] font-bold text-brand-deep">
          <Check className="h-4 w-4" />
          저장되었어요 ({status.count}개 슬롯)
        </div>
      )}
      {status.kind === "error" && (
        <div className="flex items-start gap-2 rounded-[14px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12.5px] font-semibold text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{status.message}</span>
        </div>
      )}

      {matchStatus.kind !== "idle" && (
        <section className="rounded-[22px] border border-border-soft bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[13.5px] font-extrabold tracking-tight text-ink">
                <Sparkles className="h-4 w-4 text-brand-deep" />
                AI 매칭 결과
              </p>
              <p className="mt-0.5 text-[11.5px] font-semibold text-muted-foreground">
                현재 선택한 시간과 선호 직종을 함께 반영합니다.
              </p>
            </div>
          </div>

          {matchStatus.kind === "loading" && (
            <div className="rounded-[16px] border border-border bg-surface-2 px-4 py-8 text-center text-[12.5px] font-bold text-muted-foreground">
              AI가 맞는 공고를 찾고 있어요...
            </div>
          )}

          {matchStatus.kind === "error" && (
            <div className="flex items-start gap-2 rounded-[14px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12.5px] font-semibold text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{matchStatus.message}</span>
            </div>
          )}

          {matchStatus.kind === "ready" && matchStatus.matches.length === 0 && (
            <div className="rounded-[16px] border border-border bg-surface-2 px-4 py-8 text-center">
              <p className="text-[13px] font-extrabold text-ink">
                현재 조건에 맞는 공고가 없습니다
              </p>
              <p className="mt-1 text-[12px] font-semibold text-muted-foreground">
                시간을 더 넓게 선택하면 추천 가능성이 높아집니다.
              </p>
            </div>
          )}

          {matchStatus.kind === "ready" && matchStatus.matches.length > 0 && (
            <ul className="space-y-2.5">
              {matchStatus.matches.map((match) => (
                <li key={match.job.id}>
                  <Link
                    href={`/posts/${match.job.id}`}
                    className="block rounded-[18px] border border-border bg-surface p-3.5 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-soft-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-bold text-muted-foreground">
                          {match.job.business.name} · {categoryLabel(match.job.category)}
                        </p>
                        <h3 className="mt-0.5 line-clamp-1 text-[14px] font-extrabold tracking-[-0.02em] text-ink">
                          {match.job.title}
                        </h3>
                      </div>
                      <span className="tabnum shrink-0 rounded-full bg-brand px-2.5 py-1 text-[11px] font-extrabold text-ink">
                        {match.score}%
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11.5px] font-semibold text-muted-foreground">
                      <span>
                        {match.matchingSlots.length > 0
                          ? summarizeAvailabilitySlots(match.matchingSlots, 2)
                          : `${formatWorkDate(match.job.workDate)} ${match.job.startTime}~${match.job.endTime}`}
                      </span>
                      <span className="tabnum font-extrabold text-brand-deep">
                        {formatMoney(match.estimatedPay)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[11.5px] font-medium text-text-subtle">
                      {match.reasons.join(" · ")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Sticky save bar stacks above MobileTabBar using the Premium blur+tint
          idiom shared with other sticky bars (profile-edit §04, check-in §CTA).
          bottom = tab bar height (6.25rem) + iOS safe-area-inset-bottom. */}
      <div className="fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t border-border-soft bg-[color-mix(in_oklch,var(--surface)_96%,transparent)] [backdrop-filter:saturate(1.6)_blur(16px)]">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            {isDirty ? (
              <p className="text-[11px] font-extrabold tracking-tight text-brand-deep">
                저장되지 않은 변경사항
              </p>
            ) : (
              <p className="text-[11px] font-semibold text-muted-foreground">
                모두 저장됨
              </p>
            )}
            <p className="tabnum text-[13px] font-extrabold tracking-tight text-ink">
              총 {totalHours}시간
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleAiMatch}
              disabled={isPending}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-[12px] font-extrabold tracking-tight text-ink transition-colors hover:border-ink hover:bg-surface-2 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {matchStatus.kind === "loading" ? "매칭 중..." : "AI 매칭"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || !isDirty}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[12px] font-extrabold tracking-tight text-white transition-all hover:bg-black hover:shadow-soft-dark disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {status.kind === "saving" || isPending ? "저장 중..." : "저장하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
