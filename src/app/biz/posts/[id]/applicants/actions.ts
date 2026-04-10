"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireBusiness } from "@/lib/dal";
import { safeRevalidate } from "@/lib/safe-revalidate";
import { sendPushToUser } from "@/lib/push";
import {
  acceptApplicationSchema,
  rejectApplicationSchema,
} from "@/lib/validations/application";
import {
  ApplicationError,
  type ApplicationErrorCode,
} from "@/lib/errors/application-errors";

export type BizActionResult =
  | { success: true }
  | { success: false; error: ApplicationErrorCode };

/**
 * Load an application plus the minimal job columns needed for ownership
 * verification and seat re-computation. Throws ApplicationError on
 * not-found / not-owned so the outer try/catch maps to a typed result.
 */
async function loadAppAndVerifyOwner(
  applicationId: string,
  sessionUserId: string,
) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: {
        select: {
          id: true,
          authorId: true,
          status: true,
          filled: true,
          headcount: true,
        },
      },
    },
  });
  if (!app) throw new ApplicationError("application_not_found");
  if (app.job.authorId !== sessionUserId) {
    throw new ApplicationError("job_not_owned");
  }
  return app;
}

/**
 * APPL-04 accept: transition a pending application to confirmed.
 *
 * Idempotent: calling this on an already-confirmed application is a no-op
 * success (the Biz UI may click "수락" twice from a stale tab, and we
 * don't want the second click to surface an error).
 *
 * Ownership: enforced via loadAppAndVerifyOwner — session user must equal
 * job.authorId. The dal test-mode hint picks the owning business for this
 * specific application so vitest can exercise the flow without needing a
 * Supabase cookie (see src/lib/dal.ts resolveTestBusinessSession).
 */
export async function acceptApplication(
  applicationId: string,
): Promise<BizActionResult> {
  const parsed = acceptApplicationSchema.safeParse({ applicationId });
  if (!parsed.success) return { success: false, error: "unknown" };
  const session = await requireBusiness(applicationId);

  try {
    const app = await loadAppAndVerifyOwner(applicationId, session.id);
    if (app.status === "confirmed") {
      // Idempotent success path — just bust the caches.
      safeRevalidate(`/biz/posts/${app.jobId}/applicants`);
      return { success: true };
    }
    if (app.status !== "pending") {
      throw new ApplicationError("invalid_state");
    }

    await prisma.application.update({
      where: { id: applicationId },
      data: { status: "confirmed" },
    });

    safeRevalidate(`/biz/posts/${app.jobId}/applicants`);
    safeRevalidate("/my/applications");

    // Plan 06 D-20 — Notify the worker that their application was accepted.
    // Fire-and-forget: see applyOneTap comment.
    try {
      const job = await prisma.job.findUnique({
        where: { id: app.jobId },
        select: { title: true },
      });
      await sendPushToUser(app.workerId, {
        type: "accepted",
        title: "지원이 수락되었습니다",
        body: job?.title ?? "근무가 확정되었어요",
        url: `/my/applications/${applicationId}`,
      });
    } catch (pushErr) {
      console.error("[acceptApplication] push notify failed", pushErr);
    }

    return { success: true };
  } catch (e) {
    if (e instanceof ApplicationError) {
      return { success: false, error: e.code };
    }
    console.error("[acceptApplication]", e);
    return { success: false, error: "unknown" };
  }
}

/**
 * APPL-04 reject: transition a pending/confirmed application to cancelled
 * and atomically decrement jobs.filled, re-opening the job if it was
 * previously marked 'filled'.
 *
 * The application status update and the jobs.filled decrement live in the
 * same `$transaction` so a crash between the two never leaves a rejected
 * application whose seat is still taken (and vice-versa).
 *
 * Allowed from-states: pending, confirmed. Rejecting after check-in/out
 * would corrupt settlement, so we throw 'invalid_state' for those.
 */
export async function rejectApplication(
  applicationId: string,
): Promise<BizActionResult> {
  const parsed = rejectApplicationSchema.safeParse({ applicationId });
  if (!parsed.success) return { success: false, error: "unknown" };
  const session = await requireBusiness(applicationId);

  try {
    const app = await loadAppAndVerifyOwner(applicationId, session.id);
    if (app.status !== "pending" && app.status !== "confirmed") {
      throw new ApplicationError("invalid_state");
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.applications
        SET status = 'cancelled'
        WHERE id = ${applicationId}::uuid
      `);
      // GREATEST(filled - 1, 0) guards against races with pg_cron no-show
      // (which also decrements). Re-open jobs that were previously full.
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.jobs
        SET filled = GREATEST(filled - 1, 0),
            status = CASE WHEN status = 'filled' THEN 'active' ELSE status END,
            "updatedAt" = now()
        WHERE id = ${app.jobId}::uuid
      `);
    });

    safeRevalidate(`/biz/posts/${app.jobId}/applicants`);
    safeRevalidate("/my/applications");

    // Plan 06 D-20 — Notify the worker that their application was rejected.
    // Fire-and-forget: see applyOneTap comment.
    try {
      const job = await prisma.job.findUnique({
        where: { id: app.jobId },
        select: { title: true },
      });
      await sendPushToUser(app.workerId, {
        type: "rejected",
        title: "지원이 거절되었습니다",
        body: job?.title ?? "",
        url: "/my/applications",
      });
    } catch (pushErr) {
      console.error("[rejectApplication] push notify failed", pushErr);
    }

    return { success: true };
  } catch (e) {
    if (e instanceof ApplicationError) {
      return { success: false, error: e.code };
    }
    console.error("[rejectApplication]", e);
    return { success: false, error: "unknown" };
  }
}
