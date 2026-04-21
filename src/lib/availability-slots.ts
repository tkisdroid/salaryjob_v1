import type { Job } from "@/lib/types/job";

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const DAY_LABELS: Record<(typeof DAY_KEYS)[number], string> = {
  mon: "월",
  tue: "화",
  wed: "수",
  thu: "목",
  fri: "금",
  sat: "토",
  sun: "일",
};

export type DayKey = (typeof DAY_KEYS)[number];
export type AvailabilitySlotKey = `${DayKey}-${number}`;

const SLOT_PATTERN = /^(mon|tue|wed|thu|fri|sat|sun)-(\d{1,2})$/;

export function isAvailabilitySlotKey(value: string): value is AvailabilitySlotKey {
  const match = SLOT_PATTERN.exec(value);
  if (!match) return false;
  const hour = Number(match[2]);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23;
}

export function normalizeAvailabilitySlots(slots: readonly string[]) {
  return [...new Set(slots.filter(isAvailabilitySlotKey))].sort((a, b) => {
    const [aDay, aHour] = a.split("-");
    const [bDay, bHour] = b.split("-");
    const dayDiff = DAY_KEYS.indexOf(aDay as DayKey) - DAY_KEYS.indexOf(bDay as DayKey);
    if (dayDiff !== 0) return dayDiff;
    return Number(aHour) - Number(bHour);
  });
}

export function formatHour(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  if (normalized === 0) return "자정";
  if (normalized < 12) return `오전 ${normalized}시`;
  if (normalized === 12) return "오후 12시";
  return `오후 ${normalized - 12}시`;
}

export function formatAvailabilitySlot(slot: string): string {
  if (!isAvailabilitySlotKey(slot)) return "시간 미등록";
  const [day, rawHour] = slot.split("-") as [DayKey, string];
  const hour = Number(rawHour);
  return `${DAY_LABELS[day]}요일 ${formatHour(hour)}~${formatHour(hour + 1)}`;
}

export function groupAvailabilitySlots(slots: readonly string[]) {
  const normalized = normalizeAvailabilitySlots(slots);
  const grouped = new Map<DayKey, Array<{ start: number; end: number }>>();

  for (const day of DAY_KEYS) {
    const hours = normalized
      .filter((slot) => slot.startsWith(`${day}-`))
      .map((slot) => Number(slot.split("-")[1]))
      .sort((a, b) => a - b);
    if (hours.length === 0) continue;

    const blocks: Array<{ start: number; end: number }> = [];
    let start = hours[0];
    let previous = hours[0];
    for (const hour of hours.slice(1)) {
      if (hour !== previous + 1) {
        blocks.push({ start, end: previous + 1 });
        start = hour;
      }
      previous = hour;
    }
    blocks.push({ start, end: previous + 1 });
    grouped.set(day, blocks);
  }

  return grouped;
}

export function summarizeAvailabilitySlots(slots: readonly string[], maxItems = 3) {
  const grouped = groupAvailabilitySlots(slots);
  const labels: string[] = [];

  for (const day of DAY_KEYS) {
    const blocks = grouped.get(day);
    if (!blocks) continue;
    for (const block of blocks) {
      labels.push(`${DAY_LABELS[day]} ${formatHour(block.start)}~${formatHour(block.end)}`);
    }
  }

  if (labels.length === 0) return "등록된 가용시간 없음";
  if (labels.length <= maxItems) return labels.join(", ");
  return `${labels.slice(0, maxItems).join(", ")} 외 ${labels.length - maxItems}개`;
}

function dayKeyFromIsoDate(isoDate: string): DayKey {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return DAY_KEYS[(date.getDay() + 6) % 7];
}

function hourFromTime(time: string): number {
  const hour = Number(time.slice(0, 2));
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 0;
}

export function jobAvailabilitySlots(job: Pick<Job, "workDate" | "startTime" | "endTime">) {
  const dayKey = dayKeyFromIsoDate(job.workDate);
  const start = hourFromTime(job.startTime);
  let end = hourFromTime(job.endTime);
  if (end <= start) end += 24;

  const slots: AvailabilitySlotKey[] = [];
  for (let hour = start; hour < end; hour += 1) {
    slots.push(`${dayKey}-${hour % 24}` as AvailabilitySlotKey);
  }
  return slots;
}
