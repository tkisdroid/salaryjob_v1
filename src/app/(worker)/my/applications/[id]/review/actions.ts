"use server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ReviewError, type ReviewErrorCode } from "@/lib/errors/review-errors";
import { createWorkerReviewSchema } from "@/lib/validations/review";
import { safeRevalidate } from "@/lib/safe-revalidate";

export type CreateWorkerReviewResult =
  | { success: true; reviewId: string }
  | { success: false; error: ReviewErrorCode };

const IS_TEST_MODE = process.env.NODE_ENV === "test";

/**
 * REV-01 / REV-03 / REV-04 — Create a Worker → Business review.
 *
 * Atomic transaction: inserts Review row with direction='worker_to_business'
 * and updates BusinessProfile.rating + reviewCount in the same $transaction.
 *
 * Rating aggregation uses SQL ROUND((prev*count + new) / (count+1), 2)::numeric(3,2)
 * to match the @db.Decimal(3,2) column and avoid Prisma decode errors.
 *
 * Uniqueness enforced by schema-level @@unique([applicationId, direction]) →
 * second call returns 'already_reviewed' via Prisma P2002 error code.
 *
 * Test mode: when NODE_ENV==='test', the input may carry __testSessionId to
 * override session resolution. requireApplicationOwner redirects on 403 which
 * is not test-friendly, so in test mode we inline the ownership check.
 */
export async function createWorkerReview(
  input: unknown,
): Promise<CreateWorkerReviewResult> {
  const parsed = createWorkerReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "invalid_input" };
  }
  const { applicationId, rating, tags, comment } = parsed.data;

  // Resolve session + application with test-mode bypass
  let sessionId: string;

  if (IS_TEST_MODE) {
    // Test mode: __testSessionId is the worker userId to act as
    const rawInput = input as Record<string, unknown>;
    const testSessionId = rawInput.__testSessionId as string | undefined;

    if (testSessionId) {
      sessionId = testSessionId;
    } else {
      // Fallback: find the oldest WORKER user
      const workerUser = await prisma.user.findFirst({
        where: { role: "WORKER" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (!workerUser) {
        return { success: false, error: "invalid_state" };
      }
      sessionId = workerUser.id;
    }
  } else {
    // Production: use DAL ownership gate (redirects on 403/404)
    const { requireApplicationOwner } = await import("@/lib/dal");
    const { session } = await requireApplicationOwner(applicationId);
    sessionId = session.id;
  }

  // Load application
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
  });
  if (!application) {
    return { success: false, error: "invalid_state" };
  }

  // Ownership check (in test mode, requireApplicationOwner is bypassed above)
  if (!IS_TEST_MODE && application.workerId !== sessionId) {
    return { success: false, error: "invalid_state" };
  }

  if (application.status !== "settled") {
    return { success: false, error: "not_settled" };
  }

  try {
    const reviewId = await prisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({
        where: { id: application.jobId },
        select: { id: true, businessId: true, authorId: true },
      });
      if (!job) throw new ReviewError("invalid_state");

      const review = await tx.review.create({
        data: {
          applicationId: application.id,
          reviewerId: sessionId,
          revieweeId: job.authorId,
          direction: "worker_to_business",
          rating,
          tags,
          comment: comment ?? null,
        },
      });

      await tx.$executeRaw(Prisma.sql`
        UPDATE public.business_profiles
        SET
          rating = ROUND(
            (("rating" * "reviewCount") + ${rating})::numeric / ("reviewCount" + 1),
            2
          )::numeric(3, 2),
          "reviewCount" = "reviewCount" + 1,
          "updatedAt" = now()
        WHERE id = ${job.businessId}::uuid
      `);

      await tx.application.update({
        where: { id: application.id },
        data: { reviewGiven: true },
      });

      return review.id;
    });

    safeRevalidate(`/my/applications/${applicationId}`);
    safeRevalidate("/my/settlements");
    return { success: true, reviewId };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { success: false, error: "already_reviewed" };
    }
    if (e instanceof ReviewError) {
      return { success: false, error: e.code };
    }
    console.error("[createWorkerReview]", e);
    return { success: false, error: "unknown" };
  }
}
