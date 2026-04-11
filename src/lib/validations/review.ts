/**
 * Phase 5 Plan 02 — Review Server Action input schemas.
 * Shared shape for worker→business and business→worker: direction is inferred
 * from the Server Action file location, not from client input (defense-in-depth).
 *
 * Threat mitigations:
 *   T-05-04: rating z.number().int().min(1).max(5) rejects rating=0/6/-1/3.5/NaN
 *   T-05-05: comment z.string().max(500) caps comment length (React auto-escapes in JSX)
 *   T-05-08: tags z.array(z.string().max(20)).max(8) validates shape before Prisma binding
 */

import { z } from "zod";

export const createWorkerReviewSchema = z.object({
  applicationId: z.string().uuid("올바른 지원 ID가 필요합니다"),
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.string().max(20)).max(8).default([]),
  comment: z.string().max(500).optional(),
});

export const createBusinessReviewSchema = createWorkerReviewSchema;

export type CreateWorkerReviewInput = z.infer<typeof createWorkerReviewSchema>;
export type CreateBusinessReviewInput = z.infer<typeof createBusinessReviewSchema>;
