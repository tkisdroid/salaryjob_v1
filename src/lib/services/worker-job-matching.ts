import "server-only";

import { prisma } from "@/lib/db";
import { getJobsPaginated } from "@/lib/db/queries";
import { calculateEarnings, categoryLabel, formatWorkDate } from "@/lib/job-utils";
import {
  jobAvailabilitySlots,
  normalizeAvailabilitySlots,
  summarizeAvailabilitySlots,
} from "@/lib/availability-slots";
import type { Job, JobCategory } from "@/lib/types/job";

export interface WorkerJobMatch {
  job: Job;
  score: number;
  reasons: string[];
  matchingSlots: string[];
  estimatedPay: number;
}

function categoryReason(category: JobCategory) {
  return `${categoryLabel(category)} 선호 직종`;
}

function scoreJob(opts: {
  job: Job;
  workerSlots: Set<string>;
  preferredCategories: Set<JobCategory>;
}) {
  const { job, workerSlots, preferredCategories } = opts;
  const jobSlots = jobAvailabilitySlots(job);
  const matchingSlots = jobSlots.filter((slot) => workerSlots.has(slot));
  const slotCoverage = jobSlots.length > 0 ? matchingSlots.length / jobSlots.length : 0;
  const reasons: string[] = [];
  let score = 35;

  if (slotCoverage > 0) {
    score += Math.round(slotCoverage * 40);
    reasons.push(
      slotCoverage >= 1
        ? "등록한 가용시간과 완전히 일치"
        : "등록한 가용시간과 일부 일치",
    );
  }

  if (preferredCategories.has(job.category)) {
    score += 15;
    reasons.push(categoryReason(job.category));
  }

  if (job.isUrgent) {
    score += 5;
    reasons.push("급구 공고");
  }

  if (job.transportFee > 0) {
    score += 3;
    reasons.push("교통비 지원");
  }

  if (job.hourlyPay >= 12000) {
    score += 2;
    reasons.push("시급 12,000원 이상");
  }

  if (reasons.length === 0) {
    reasons.push("조건에 맞는 대체 추천");
  }

  return {
    score: Math.min(100, score),
    reasons,
    matchingSlots,
  };
}

export async function getWorkerJobMatches(
  userId: string,
  opts: { slots?: readonly string[]; limit?: number } = {},
): Promise<WorkerJobMatch[]> {
  const profile = await prisma.workerProfile.findUnique({
    where: { userId },
    select: {
      availabilitySlots: true,
      preferredCategories: true,
    },
  });

  if (!profile) return [];

  const availabilitySlots = normalizeAvailabilitySlots(
    opts.slots?.length ? opts.slots : profile.availabilitySlots,
  );
  const workerSlots = new Set(availabilitySlots);
  const preferredCategories = new Set(profile.preferredCategories as JobCategory[]);
  const { jobs } = await getJobsPaginated({ limit: 80 });

  const matches = jobs
    .map((job) => {
      const scored = scoreJob({ job, workerSlots, preferredCategories });
      return {
        job,
        score: scored.score,
        reasons: scored.reasons,
        matchingSlots: scored.matchingSlots,
        estimatedPay: calculateEarnings(job),
      } satisfies WorkerJobMatch;
    })
    .filter((match) => {
      if (workerSlots.size === 0 && preferredCategories.size === 0) return true;
      return match.matchingSlots.length > 0 || preferredCategories.has(match.job.category);
    })
    .sort((a, b) => b.score - a.score || b.estimatedPay - a.estimatedPay);

  return matches.slice(0, opts.limit ?? 10);
}

export function formatMatchTime(match: WorkerJobMatch) {
  const exactSlots =
    match.matchingSlots.length > 0
      ? summarizeAvailabilitySlots(match.matchingSlots, 2)
      : null;
  return exactSlots ?? `${formatWorkDate(match.job.workDate)} ${match.job.startTime}~${match.job.endTime}`;
}
