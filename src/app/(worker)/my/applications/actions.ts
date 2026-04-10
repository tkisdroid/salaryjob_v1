"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireWorker } from "@/lib/dal";
import { safeRevalidate } from "@/lib/safe-revalidate";
import { cancelApplicationSchema } from "@/lib/validations/application";
import {
  ApplicationError,
  type ApplicationErrorCode,
} from "@/lib/errors/application-errors";

export type CancelResult =
  | { success: true; noShowCounted: boolean }
  | { success: false; error: ApplicationErrorCode };

/**
 * Combine a workDate (stored as UTC midnight) with an "HH:MM" startTime
 * string to produce the moment the shift actually begins. Phase 3 seed
 * stores times in UTC; Phase 4 continues that convention.
 */
function combineWorkDateTime(workDate: Date, startTime: string): Date {
  const [h, m] = startTime.split(":").map(Number);
  const combined = new Date(workDate);
  combined.setUTCHours(h, m, 0, 0);
  return combined;
}

/**
 * APPL-04 (worker side) — cancelApplication.
 *
 * D-21 24-hour rule: a worker may cancel freely up to 24 hours before the
 * shift start time. Cancelling inside the 24-hour window counts as a
 * no-show and requires the client to explicitly acknowledge the penalty
 * (`opts.acknowledgedNoShowRisk: true`) — this mirrors the confirmation
 * modal the UI surfaces before calling this action.
 *
 * D-22 no-show counter: when the late-cancel branch fires, the worker's
 * WorkerProfile.noShowCount is incremented in the same transaction as the
 * application cancellation and the jobs.filled decrement, so the three
 * stay in lock-step even if the request crashes mid-way.
 *
 * Ownership: direct workerId equality check against the requireWorker()
 * session — we don't use requireApplicationOwner here because we need the
 * application + job row for the time-window computation regardless and
 * don't want two round-trips.
 *
 * Allowed from-states: pending, confirmed. Cancelling after check-in is
 * the Business's problem (via rejectApplication or the pg_cron no-show
 * sweep) — workers cannot self-cancel once they're on shift.
 */
export async function cancelApplication(
  applicationId: string,
  opts: { acknowledgedNoShowRisk?: boolean } = {},
): Promise<CancelResult> {
  const parsed = cancelApplicationSchema.safeParse({
    applicationId,
    ...opts,
  });
  if (!parsed.success) return { success: false, error: "unknown" };
  const session = await requireWorker();

  try {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { select: { id: true, workDate: true, startTime: true } },
      },
    });
    if (!app) throw new ApplicationError("application_not_found");
    if (app.workerId !== session.id) {
      throw new ApplicationError("application_not_owned");
    }
    if (app.status !== "pending" && app.status !== "confirmed") {
      throw new ApplicationError("invalid_state");
    }

    const workStartAt = combineWorkDateTime(app.job.workDate, app.job.startTime);
    const cancelDeadline = new Date(
      workStartAt.getTime() - 24 * 60 * 60 * 1000,
    );
    const now = new Date();
    const isLate = now > cancelDeadline;

    if (isLate && !opts.acknowledgedNoShowRisk) {
      // The UI must surface the warning modal and re-call with
      // acknowledgedNoShowRisk=true before we proceed.
      return { success: false, error: "cancel_too_late" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.applications
        SET status = 'cancelled'
        WHERE id = ${applicationId}::uuid
      `);
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.jobs
        SET filled = GREATEST(filled - 1, 0),
            status = CASE WHEN status = 'filled' THEN 'active' ELSE status END,
            "updatedAt" = now()
        WHERE id = ${app.jobId}::uuid
      `);
      if (isLate) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE public.worker_profiles
          SET "noShowCount" = "noShowCount" + 1,
              "updatedAt" = now()
          WHERE "userId" = ${session.id}::uuid
        `);
      }
    });

    safeRevalidate("/my/applications");
    safeRevalidate(`/biz/posts/${app.jobId}/applicants`);

    return { success: true, noShowCounted: isLate };
  } catch (e) {
    if (e instanceof ApplicationError) {
      return { success: false, error: e.code };
    }
    console.error("[cancelApplication]", e);
    return { success: false, error: "unknown" };
  }
}
