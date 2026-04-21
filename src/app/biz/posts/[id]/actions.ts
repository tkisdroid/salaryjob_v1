"use server";

import { randomUUID } from "node:crypto";
import { requireJobOwner } from "@/lib/dal";
import { signCheckoutToken } from "@/lib/qr";
import { prisma } from "@/lib/db";
import {
  ApplicationError,
  type ApplicationErrorCode,
} from "@/lib/errors/application-errors";

/**
 * Phase 4 Plan 04-05 — Business-side QR token generator.
 *
 * The Business opens a "체크아웃 QR" modal on a given job's detail page; this
 * Server Action mints a JWT (HS256, 10-minute TTL) encoding
 * `{jobId, businessId, nonce}` which is rendered as a QR for Workers to scan.
 *
 * Security:
 *   - `requireJobOwner` redirects on 404/403 (centralized in dal.ts).
 *   - Naive in-process rate limit: one token per Business user per 30 seconds.
 *     Prevents casual button mashing and brute force. Phase 5 will replace with
 *     Redis-backed or DB-backed limiter; in-memory Map is acceptable here because
 *     legitimate Business usage is "open modal once per shift end".
 *   - Token nonce is a random UUID so replay attempts can be detected by future
 *     Phase 5 server-side nonce tracking (out of scope for this plan).
 */

export type QrTokenResult =
  | { success: true; token: string; expiresAt: Date }
  | { success: false; error: ApplicationErrorCode | "rate_limited" | "no_active_worker" };

// Naive in-process rate limit: one QR per RATE_LIMIT_MS per Biz user.
// Per-process memory; safe for serverless because a cold instance simply
// resets the limiter, and each legitimate request takes <50ms anyway.
const lastGeneratedByUser = new Map<string, number>();
const RATE_LIMIT_MS = 30 * 1000;

/**
 * Mint a signed checkout JWT for the given job.
 * Callable only by the job author (enforced via `requireJobOwner`).
 */
export async function generateCheckoutQrToken(
  jobId: string,
): Promise<QrTokenResult> {
  // requireJobOwner redirects on 404/403 — no try/catch wrap needed here
  const { session, job } = await requireJobOwner(jobId);

  // BUG-B07: Verify at least one worker is in an active shift for this job.
  // Without this, a business could generate a QR when nobody is working.
  const activeWorkerCount = await prisma.application.count({
    where: {
      jobId: job.id,
      status: { in: ["in_progress", "checked_in"] },
    },
  });
  if (activeWorkerCount === 0) {
    return { success: false, error: "no_active_worker" };
  }

  const now = Date.now();
  const last = lastGeneratedByUser.get(session.id) ?? 0;
  if (now - last < RATE_LIMIT_MS) {
    return { success: false, error: "rate_limited" };
  }

  try {
    const token = await signCheckoutToken({
      jobId: job.id,
      businessId: job.businessId,
      nonce: randomUUID(),
      ttlSeconds: 600, // 10 minutes per D-15
    });
    lastGeneratedByUser.set(session.id, now);

    return {
      success: true,
      token,
      expiresAt: new Date(now + 10 * 60 * 1000),
    };
  } catch (e) {
    if (e instanceof ApplicationError) {
      return { success: false, error: e.code };
    }
    console.error("[generateCheckoutQrToken]", e);
    return { success: false, error: "unknown" };
  }
}
