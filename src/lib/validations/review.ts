/**
 * Phase 5 Plan 02 — Review Server Action input schemas.
 * Shared shape for worker→business and business→worker: direction is inferred
 * from the Server Action file location, not from client input (defense-in-depth).
 *
 * Threat mitigations:
 *   T-05-04: rating z.number().int().min(1).max(5) rejects rating=0/6/-1/3.5/NaN
 *   T-05-05: comment z.string().max(500) caps comment length (React auto-escapes in JSX)
 *   T-05-08: tags strictly enum-validated against the hardcoded constants in
 *           review-tags.ts. Prevents API-direct callers from inserting arbitrary
 *           strings, zero-width characters, emoji bombs, or whitespace abuse —
 *           the original z.string().max(20) shape check did not enforce content.
 *           Code review fix (P2-6 followup tags whitelist).
 */

import { z } from "zod";
import {
  WORKER_TO_BIZ_TAGS,
  BIZ_TO_WORKER_TAGS,
} from "@/lib/constants/review-tags";

const workerToBizTagSchema = z.enum(
  WORKER_TO_BIZ_TAGS as unknown as [string, ...string[]],
);
const bizToWorkerTagSchema = z.enum(
  BIZ_TO_WORKER_TAGS as unknown as [string, ...string[]],
);

export const createWorkerReviewSchema = z.object({
  applicationId: z.string().uuid("올바른 지원 ID가 필요합니다"),
  rating: z.number().int().min(1).max(5),
  tags: z.array(workerToBizTagSchema).max(8).default([]),
  comment: z.string().max(500).optional(),
});

export const createBusinessReviewSchema = z.object({
  applicationId: z.string().uuid("올바른 지원 ID가 필요합니다"),
  rating: z.number().int().min(1).max(5),
  tags: z.array(bizToWorkerTagSchema).max(8).default([]),
  comment: z.string().max(500).optional(),
});

export type CreateWorkerReviewInput = z.infer<typeof createWorkerReviewSchema>;
export type CreateBusinessReviewInput = z.infer<typeof createBusinessReviewSchema>;
