/**
 * Phase 4 Plan 04 — Application Server Action input schemas.
 *
 * All mutation Server Actions validate their input with one of these Zod
 * schemas before touching the database. UUID validation catches malformed
 * client input (e.g. `"undefined"` strings from broken client code) before
 * we bind into raw SQL.
 */

import { z } from "zod";

export const uuidSchema = z.string().uuid("유효하지 않은 ID 형식입니다");

export const applyOneTapSchema = z.object({
  jobId: uuidSchema,
});
export type ApplyOneTapInput = z.infer<typeof applyOneTapSchema>;

export const acceptApplicationSchema = z.object({
  applicationId: uuidSchema,
});
export type AcceptApplicationInput = z.infer<typeof acceptApplicationSchema>;

export const rejectApplicationSchema = z.object({
  applicationId: uuidSchema,
});
export type RejectApplicationInput = z.infer<typeof rejectApplicationSchema>;

export const cancelApplicationSchema = z.object({
  applicationId: uuidSchema,
  acknowledgedNoShowRisk: z.boolean().optional(),
});
export type CancelApplicationInput = z.infer<typeof cancelApplicationSchema>;
