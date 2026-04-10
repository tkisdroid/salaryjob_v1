"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireWorker } from "@/lib/dal";
import { safeRevalidate } from "@/lib/safe-revalidate";
import {
  applyOneTapSchema,
  type ApplyOneTapInput,
} from "@/lib/validations/application";
import {
  ApplicationError,
  type ApplicationErrorCode,
} from "@/lib/errors/application-errors";

export type ApplyResult =
  | { success: true; applicationId: string }
  | { success: false; error: ApplicationErrorCode };

/**
 * APPL-01: 원탭 지원 — atomic, concurrency-safe.
 *
 * Flow inside a single `prisma.$transaction`:
 *
 *   Step 1 — atomic seat reservation
 *     UPDATE jobs SET filled = filled + 1,
 *                     status = CASE WHEN filled+1 >= headcount THEN 'filled' ELSE status END
 *     WHERE id = $jobId AND filled < headcount AND status = 'active'
 *     RETURNING id
 *     → 0 rows → throw ApplicationError('job_full')  (seat not available)
 *
 *   Step 2 — idempotent application insert
 *     INSERT INTO applications (..., status='pending') ON CONFLICT (jobId, workerId) DO NOTHING
 *     RETURNING id
 *     → 0 rows → throw ApplicationError('already_applied')
 *       The throw rolls back the Step 1 increment so the seat is released —
 *       this compensation is the whole reason Step 2 lives in the same
 *       transaction instead of being a separate round-trip.
 *
 * Why raw SQL: Prisma Client cannot express the conditional CASE-on-UPDATE
 * with RETURNING, nor ON CONFLICT DO NOTHING with RETURNING. Raw SQL is the
 * only path that gives both atomicity and explicit conflict semantics in a
 * single statement per step.
 *
 * Threat T-04-17 (jobId tampering) is mitigated by Zod UUID validation plus
 * `Prisma.sql` parameter binding — the jobId never touches the SQL string.
 *
 * Threat T-04-19 (headcount race) is mitigated by the `filled < headcount`
 * guard inside the UPDATE — Postgres row-level locking serializes concurrent
 * UPDATEs on the same row, so exactly `headcount` updates succeed and the
 * rest fall through with zero rows affected. Verified by
 * tests/applications/apply-race.test.ts.
 */
export async function applyOneTap(
  input: ApplyOneTapInput,
): Promise<ApplyResult> {
  const parsed = applyOneTapSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "unknown" };
  }
  const { jobId } = parsed.data;
  const session = await requireWorker();

  try {
    const applicationId = await prisma.$transaction(async (tx) => {
      // Step 1 — atomic capacity check + increment + auto-fill transition.
      const seatRows = await tx.$queryRaw<
        { id: string; filled: number; headcount: number; status: string }[]
      >(Prisma.sql`
        UPDATE public.jobs
        SET filled = filled + 1,
            status = CASE WHEN filled + 1 >= headcount THEN 'filled' ELSE status END,
            "updatedAt" = now()
        WHERE id = ${jobId}::uuid
          AND filled < headcount
          AND status = 'active'
        RETURNING id, filled, headcount, status
      `);
      if (seatRows.length === 0) {
        // Either the job is full, not active, expired, or the id doesn't exist.
        // We collapse all of these to 'job_full' here — the Biz-side accept
        // path will never see this because accept doesn't go through applyOneTap.
        throw new ApplicationError("job_full");
      }

      // Step 2 — idempotent application insert.
      const appRows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
        INSERT INTO public.applications (id, "jobId", "workerId", status, "appliedAt")
        VALUES (gen_random_uuid(), ${jobId}::uuid, ${session.id}::uuid, 'pending', now())
        ON CONFLICT ("jobId", "workerId") DO NOTHING
        RETURNING id
      `);
      if (appRows.length === 0) {
        // Compensating throw: rolls back the Step 1 filled++ so the seat is
        // released back to the pool for the next applicant.
        throw new ApplicationError("already_applied");
      }

      return appRows[0].id;
    });

    // Non-DB side effects happen AFTER the transaction commits so a failed
    // insert never triggers a ghost notification or bogus cache bust.
    // Wrapped in safeRevalidate because vitest invokes Server Actions
    // directly without a Next request context, and `revalidatePath` throws
    // `Invariant: static generation store missing` in that case. Production
    // always has a request context so the call goes through normally.
    safeRevalidate("/my/applications");
    safeRevalidate(`/posts/${jobId}`);
    // TODO(Plan 06): sendPushToUser(jobAuthorId, { type: 'new-application', jobId })
    //                — notify Biz of new applicant via Web Push.

    return { success: true, applicationId };
  } catch (e) {
    if (e instanceof ApplicationError) {
      return { success: false, error: e.code };
    }
    console.error("[applyOneTap] unexpected error", e);
    return { success: false, error: "unknown" };
  }
}
