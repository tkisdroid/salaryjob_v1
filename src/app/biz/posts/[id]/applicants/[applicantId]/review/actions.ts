"use server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ReviewError, type ReviewErrorCode } from "@/lib/errors/review-errors";
import { createBusinessReviewSchema } from "@/lib/validations/review";
import { safeRevalidate } from "@/lib/safe-revalidate";

export type CreateBusinessReviewResult =
  | { success: true; reviewId: string }
  | { success: false; error: ReviewErrorCode };

// Defense-in-depth: the test bypass below requires BOTH NODE_ENV=test AND
// VITEST=true. Vitest sets VITEST=true automatically; Vercel/Next.js production
// never sets it. Even if NODE_ENV=test ever leaks to a deployed environment
// (e.g., misconfigured Vercel env), this branch stays dead-code at runtime.
// Code review fix (P2-4) — hardens against the original "NODE_ENV-only" gate.
const IS_TEST_MODE =
  process.env.NODE_ENV === "test" && process.env.VITEST === "true";

/**
 * REV-02 / REV-03 / REV-04 — Create a Business → Worker review.
 *
 * Flow:
 *   1. Load application row (ownership check via jobId → requireJobOwner)
 *   2. Gate on application.status === 'settled'
 *   3. Atomic $transaction: insert Review + UPDATE worker_profiles.rating + reviewCount
 *   4. Set application.reviewReceived = true
 *
 * WorkerProfile is keyed by userId (unique FK), not id — the UPDATE WHERE
 * clause must use "userId" to match the review target (application.workerId).
 *
 * Test mode: when NODE_ENV==='test', the input may carry __testSessionId to
 * override session resolution. requireJobOwner redirects on 403 which is not
 * test-friendly, so in test mode we inline the ownership check and return
 * { success: false, error: "unauthorized" } on mismatch.
 */
export async function createBusinessReview(
  input: unknown,
): Promise<CreateBusinessReviewResult> {
  const parsed = createBusinessReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "invalid_input" };
  }
  const { applicationId, rating, tags, comment } = parsed.data;

  // Load application to reach the job
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, jobId: true, workerId: true, status: true },
  });
  if (!application) {
    return { success: false, error: "invalid_state" };
  }

  let sessionId: string;

  if (IS_TEST_MODE) {
    // Test mode: __testSessionId is the business userId to act as
    const rawInput = input as Record<string, unknown>;
    const testSessionId = rawInput.__testSessionId as string | undefined;

    if (testSessionId) {
      sessionId = testSessionId;
    } else {
      // Fallback: find the owning business from the application
      const job = await prisma.job.findUnique({
        where: { id: application.jobId },
        select: { authorId: true },
      });
      sessionId = job?.authorId ?? "";
    }

    // Inline ownership check for test mode (requireJobOwner would redirect)
    const job = await prisma.job.findUnique({
      where: { id: application.jobId },
      select: { authorId: true },
    });
    if (!job || job.authorId !== sessionId) {
      return { success: false, error: "unauthorized" };
    }
  } else {
    // Production: use DAL ownership gate (redirects on 403/404)
    const { requireJobOwner } = await import("@/lib/dal");
    const { session } = await requireJobOwner(application.jobId);
    sessionId = session.id;
  }

  if (application.status !== "settled") {
    return { success: false, error: "not_settled" };
  }

  try {
    const reviewId = await prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          applicationId: application.id,
          reviewerId: sessionId,
          revieweeId: application.workerId,
          direction: "business_to_worker",
          rating,
          tags,
          comment: comment ?? null,
        },
      });

      await tx.$executeRaw(Prisma.sql`
        UPDATE public.worker_profiles
        SET
          rating = ROUND(
            (("rating" * "reviewCount") + ${rating})::numeric / ("reviewCount" + 1),
            2
          )::numeric(3, 2),
          "reviewCount" = "reviewCount" + 1,
          "updatedAt" = now()
        WHERE "userId" = ${application.workerId}::uuid
      `);

      await tx.application.update({
        where: { id: application.id },
        data: { reviewReceived: true },
      });

      return review.id;
    });

    safeRevalidate(`/biz/posts/${application.jobId}/applicants`);
    safeRevalidate("/biz/settlements");
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
    console.error("[createBusinessReview]", e);
    return { success: false, error: "unknown" };
  }
}
