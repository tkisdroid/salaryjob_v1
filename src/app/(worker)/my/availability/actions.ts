"use server";

import { z } from "zod";
import { requireWorker } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { safeRevalidate } from "@/lib/safe-revalidate";

/**
 * Persist the worker's weekly availability slot selection.
 *
 * Storage: WorkerProfile.availabilitySlots (text[]) keyed by `${day}-${hour}`.
 * Auth:    requireWorker() resolves the session; worker can only mutate
 *          their own WorkerProfile row (updateMany with userId scope).
 * Schema:  Zod enum on day prefix + integer range on hour prevents any
 *          arbitrary string sneaking into the text[] column.
 */

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const SLOT_PATTERN = /^(mon|tue|wed|thu|fri|sat|sun)-(\d{1,2})$/;

// Max 168 slots (7 days * 24 hours) — hard cap to keep the text[] bounded.
const MAX_SLOTS = 168;

const saveAvailabilitySchema = z.object({
  slots: z
    .array(
      z
        .string()
        .max(8)
        .refine((s) => {
          const m = SLOT_PATTERN.exec(s);
          if (!m) return false;
          const hour = Number(m[2]);
          return Number.isInteger(hour) && hour >= 0 && hour <= 23;
        }, "invalid slot key"),
    )
    .max(MAX_SLOTS, `최대 ${MAX_SLOTS}개까지 등록할 수 있습니다`),
});

export type SaveAvailabilityResult =
  | { success: true; count: number }
  | { success: false; error: string };

/**
 * Normalize: dedupe, sort for stable storage, filter duplicates.
 */
function normalize(slots: string[]): string[] {
  return [...new Set(slots)].sort((a, b) => {
    const [aDay, aHour] = a.split("-");
    const [bDay, bHour] = b.split("-");
    const aIdx = DAY_KEYS.indexOf(aDay as (typeof DAY_KEYS)[number]);
    const bIdx = DAY_KEYS.indexOf(bDay as (typeof DAY_KEYS)[number]);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return Number(aHour) - Number(bHour);
  });
}

export async function saveAvailability(
  input: unknown,
): Promise<SaveAvailabilityResult> {
  const parsed = saveAvailabilitySchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "올바르지 않은 입력입니다",
    };
  }

  const session = await requireWorker();
  const normalized = normalize(parsed.data.slots);

  try {
    const updated = await prisma.workerProfile.updateMany({
      where: { userId: session.id },
      data: { availabilitySlots: normalized },
    });
    if (updated.count === 0) {
      return {
        success: false,
        error: "워커 프로필을 찾을 수 없습니다. 잠시 후 다시 시도해주세요",
      };
    }
  } catch (e) {
    console.error("[saveAvailability]", e);
    return {
      success: false,
      error: "시간 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요",
    };
  }

  safeRevalidate("/my/availability");
  safeRevalidate("/my");
  return { success: true, count: normalized.length };
}

/**
 * Load the current slot selection for the signed-in worker. Returns an
 * empty array if the worker has never saved a selection.
 */
export async function loadAvailability(): Promise<string[]> {
  const session = await requireWorker();
  const profile = await prisma.workerProfile.findUnique({
    where: { userId: session.id },
    select: { availabilitySlots: true },
  });
  return profile?.availabilitySlots ?? [];
}
