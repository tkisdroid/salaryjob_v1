// AI Auto-Scheduling Service
// Generates weekly schedule recommendations based on worker availability
// and employer demand patterns.
//
// Future: Replace mock implementation with Vercel AI Gateway + AI SDK v6:
//   import { generateText, Output } from "ai";
//   import { gateway } from "@ai-sdk/gateway";
//   import { z } from "zod";
//   const result = await generateText({
//     model: gateway("anthropic/claude-sonnet-4.6"),
//     output: Output.object({ schema: z.array(scheduleRecommendationSchema) }),
//     system: "You are a Korean gig-economy scheduling AI...",
//     prompt: JSON.stringify(params),
//   });
//   return result.object;

import { CATEGORIES } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScheduleRecommendation {
  readonly day: string; // "월", "화", etc.
  readonly timeSlot: string; // "14:00~18:00"
  readonly category: string;
  readonly estimatedPay: number;
  readonly matchScore: number; // 0-100
  readonly reason: string;
}

interface WorkerPreferences {
  readonly preferredCategories: string[];
  readonly preferredRegions: string[];
  readonly minHourlyRate: number;
}

interface AvailableSlot {
  readonly day: string; // "월", "화", etc.
  readonly startHour: number;
  readonly endHour: number;
}

interface MatchHistoryEntry {
  readonly category: string;
  readonly avgRating: number;
  readonly count: number;
}

interface GenerateScheduleParams {
  readonly workerPreferences: WorkerPreferences;
  readonly availableSlots: readonly AvailableSlot[];
  readonly matchHistory: readonly MatchHistoryEntry[];
}

// ---------------------------------------------------------------------------
// Constants — demand patterns & pay ranges by category (mock data)
// ---------------------------------------------------------------------------

const DEMAND_PATTERNS: Record<string, { peakDays: string[]; peakHours: number[]; basePayPerHour: number }> = {
  food: { peakDays: ["금", "토", "일"], peakHours: [11, 12, 17, 18, 19], basePayPerHour: 12000 },
  retail: { peakDays: ["토", "일"], peakHours: [10, 11, 14, 15, 16], basePayPerHour: 11500 },
  logistics: { peakDays: ["월", "화", "수", "목", "금"], peakHours: [7, 8, 9, 14, 15], basePayPerHour: 13000 },
  office: { peakDays: ["월", "화", "수", "목", "금"], peakHours: [9, 10, 11, 13, 14, 15], basePayPerHour: 12500 },
  event: { peakDays: ["금", "토", "일"], peakHours: [10, 11, 14, 15, 16, 17, 18], basePayPerHour: 13500 },
  cleaning: { peakDays: ["월", "수", "금"], peakHours: [8, 9, 10, 14, 15], basePayPerHour: 11000 },
  education: { peakDays: ["월", "화", "수", "목", "금"], peakHours: [15, 16, 17, 18, 19], basePayPerHour: 15000 },
  tech: { peakDays: ["월", "화", "수", "목", "금"], peakHours: [10, 11, 13, 14, 15, 16], basePayPerHour: 18000 },
};

const REASONS_BY_CONTEXT = {
  peakDemand: "이 시간대에 구인 수요가 높아요",
  categoryMatch: "관심 직종과 일치해요",
  highPay: "평균 이상의 시급이에요",
  experienceBonus: "경험이 많아 우대 가능해요",
  ratingBonus: "높은 평점으로 우선 매칭돼요",
  weekendPremium: "주말 할증이 적용돼요",
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimeSlot(startHour: number, endHour: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(startHour)}:00~${pad(endHour)}:00`;
}

function getCategoryLabel(categoryId: string): string {
  return CATEGORIES.find((c) => c.id === categoryId)?.label ?? categoryId;
}

function computeMatchScore(params: {
  isPeakDay: boolean;
  isPeakHour: boolean;
  isCategoryMatch: boolean;
  historyEntry: MatchHistoryEntry | undefined;
  meetsMinPay: boolean;
}): number {
  let score = 40; // base

  if (params.isPeakDay) score += 10;
  if (params.isPeakHour) score += 10;
  if (params.isCategoryMatch) score += 20;
  if (params.meetsMinPay) score += 5;

  if (params.historyEntry) {
    if (params.historyEntry.count >= 5) score += 10;
    if (params.historyEntry.avgRating >= 4.5) score += 5;
  }

  return Math.min(score, 100);
}

function buildReason(params: {
  isPeakDay: boolean;
  isPeakHour: boolean;
  isCategoryMatch: boolean;
  historyEntry: MatchHistoryEntry | undefined;
  isWeekend: boolean;
  isHighPay: boolean;
}): string {
  const reasons: string[] = [];

  if (params.isCategoryMatch) reasons.push(REASONS_BY_CONTEXT.categoryMatch);
  if (params.isPeakDay || params.isPeakHour) reasons.push(REASONS_BY_CONTEXT.peakDemand);
  if (params.isHighPay) reasons.push(REASONS_BY_CONTEXT.highPay);
  if (params.isWeekend) reasons.push(REASONS_BY_CONTEXT.weekendPremium);
  if (params.historyEntry && params.historyEntry.count >= 5) reasons.push(REASONS_BY_CONTEXT.experienceBonus);
  if (params.historyEntry && params.historyEntry.avgRating >= 4.5) reasons.push(REASONS_BY_CONTEXT.ratingBonus);

  return reasons.length > 0 ? reasons.join(" · ") : "새로운 경험을 해볼 수 있어요";
}

function estimatePay(basePerHour: number, hours: number, isPeakDay: boolean, isWeekend: boolean): number {
  let hourlyRate = basePerHour;
  if (isPeakDay) hourlyRate = Math.round(hourlyRate * 1.05);
  if (isWeekend) hourlyRate = Math.round(hourlyRate * 1.1);
  return hourlyRate * hours;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export async function generateWeeklySchedule(
  params: GenerateScheduleParams
): Promise<ScheduleRecommendation[]> {
  // TODO: Replace with actual Vercel AI Gateway + AI SDK v6 call
  // import { generateText, Output } from "ai";
  // import { gateway } from "@ai-sdk/gateway";
  // const result = await generateText({
  //   model: gateway("anthropic/claude-sonnet-4.6"),
  //   output: Output.object({ schema: z.array(scheduleRecommendationSchema) }),
  //   system: `You are a scheduling AI for GigNow, a Korean gig platform.
  //     Given the worker's preferences, availability, and work history,
  //     generate optimal weekly schedule recommendations.
  //     Maximize match score and earnings while respecting availability.
  //     Respond in Korean.`,
  //   prompt: JSON.stringify(params),
  // });
  // return result.object;

  const { workerPreferences, availableSlots, matchHistory } = params;
  const weekendDays = new Set(["토", "일"]);

  // Determine which categories to recommend
  const targetCategories =
    workerPreferences.preferredCategories.length > 0
      ? workerPreferences.preferredCategories
      : Object.keys(DEMAND_PATTERNS);

  const recommendations: ScheduleRecommendation[] = [];

  for (const slot of availableSlots) {
    const slotDuration = slot.endHour - slot.startHour;
    if (slotDuration < 2) continue; // skip slots shorter than 2 hours

    // Pick the best category for this time slot
    let bestCategory = targetCategories[0];
    let bestScore = 0;

    for (const categoryId of targetCategories) {
      const demand = DEMAND_PATTERNS[categoryId];
      if (!demand) continue;

      const isPeakDay = demand.peakDays.includes(slot.day);
      const peakHoursInSlot = demand.peakHours.filter(
        (h) => h >= slot.startHour && h < slot.endHour
      );
      const isPeakHour = peakHoursInSlot.length > 0;
      const isCategoryMatch = workerPreferences.preferredCategories.includes(categoryId);
      const historyEntry = matchHistory.find((h) => h.category === categoryId);
      const isWeekend = weekendDays.has(slot.day);

      const estimatedPayAmount = estimatePay(demand.basePayPerHour, slotDuration, isPeakDay, isWeekend);
      const meetsMinPay = demand.basePayPerHour >= workerPreferences.minHourlyRate;

      const score = computeMatchScore({
        isPeakDay,
        isPeakHour,
        isCategoryMatch,
        historyEntry,
        meetsMinPay,
      });

      if (score > bestScore) {
        bestScore = score;
        bestCategory = categoryId;
      }
    }

    const demand = DEMAND_PATTERNS[bestCategory];
    if (!demand) continue;

    const isPeakDay = demand.peakDays.includes(slot.day);
    const isPeakHour = demand.peakHours.some((h) => h >= slot.startHour && h < slot.endHour);
    const isCategoryMatch = workerPreferences.preferredCategories.includes(bestCategory);
    const historyEntry = matchHistory.find((h) => h.category === bestCategory);
    const isWeekend = weekendDays.has(slot.day);
    const isHighPay = demand.basePayPerHour > 13000;

    recommendations.push({
      day: slot.day,
      timeSlot: formatTimeSlot(slot.startHour, slot.endHour),
      category: getCategoryLabel(bestCategory),
      estimatedPay: estimatePay(demand.basePayPerHour, slotDuration, isPeakDay, isWeekend),
      matchScore: bestScore,
      reason: buildReason({ isPeakDay, isPeakHour, isCategoryMatch, historyEntry, isWeekend, isHighPay }),
    });
  }

  // Sort by match score descending
  return [...recommendations].sort((a, b) => b.matchScore - a.matchScore);
}
