"use server";

import { safeRevalidate } from "@/lib/safe-revalidate";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireApplicationOwner } from "@/lib/dal";
import {
  ApplicationError,
  type ApplicationErrorCode,
} from "@/lib/errors/application-errors";
import {
  isWithinCheckInWindow,
  isWithinCheckOutWindow,
} from "@/lib/shift-validation";
import { isWithinGeofence } from "@/lib/geofence";
import { verifyCheckoutToken } from "@/lib/qr";
import { calculateActualHours, calculateEarnings } from "@/lib/job-utils";
import { calculateNightShiftPremium } from "@/lib/night-shift";

/**
 * Phase 4 Plan 04-05 — Worker check-in / check-out Server Actions.
 *
 * These are the action handlers backing `/my/applications/[id]/check-in/page.tsx`.
 * They transition an Application row through the shift lifecycle:
 *
 *   confirmed  →  in_progress  →  completed
 *        checkIn()         checkOut()
 *
 * Both actions are **direct POST-reachable** (per Next.js 16 Server Action
 * semantics), so every gate — ownership, state, time window, geofence, QR
 * validity — is enforced server-side regardless of the calling UI.
 */

export type CheckInResult =
  | { success: true }
  | { success: false; error: ApplicationErrorCode };

export type CheckOutResult =
  | {
      success: true;
      actualHours: number;
      earnings: number;
      nightPremium: number;
    }
  | { success: false; error: ApplicationErrorCode };

/**
 * SHIFT-01 — Worker checks in for a confirmed shift.
 *
 * Gates (in order):
 *   1. `requireApplicationOwner` — session owns the application (redirect on fail)
 *   2. Application.status === 'confirmed'
 *   3. `isWithinCheckInWindow` (startTime -10min ~ +30min inclusive)
 *   4. `isWithinGeofence` (PostGIS ST_DWithin, 200m of business location)
 *
 * On success:
 *   - status → 'in_progress'
 *   - checkInAt → now()
 *   - `/my/applications/[id]` and `/my/applications` revalidated
 */
export async function checkIn(
  applicationId: string,
  coords: { lat: number; lng: number },
): Promise<CheckInResult> {
  // requireApplicationOwner redirects on 404/403 — no try/catch needed here
  const { application } = await requireApplicationOwner(applicationId);

  try {
    if (application.status !== "confirmed") {
      throw new ApplicationError("invalid_state");
    }

    // Fetch job details for window + geofence checks
    const job = await prisma.job.findUnique({
      where: { id: application.jobId },
      select: {
        id: true,
        businessId: true,
        workDate: true,
        startTime: true,
      },
    });
    if (!job) {
      throw new ApplicationError("invalid_state");
    }

    const now = new Date();
    if (!isWithinCheckInWindow(now, job.workDate, job.startTime)) {
      throw new ApplicationError("check_in_time_window");
    }
    if (!(await isWithinGeofence(job.businessId, coords))) {
      throw new ApplicationError("check_in_geofence");
    }

    await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: "in_progress",
        checkInAt: now,
      },
    });

    safeRevalidate(`/my/applications/${applicationId}`);
    safeRevalidate("/my/applications");
    return { success: true };
  } catch (e) {
    if (e instanceof ApplicationError) {
      return { success: false, error: e.code };
    }
    console.error("[checkIn]", e);
    return { success: false, error: "unknown" };
  }
}

/**
 * SHIFT-02, SHIFT-03 — Worker checks out by scanning the Business QR.
 *
 * Gates:
 *   1. `requireApplicationOwner`
 *   2. Application.status === 'in_progress' AND checkInAt is set
 *   3. `isWithinCheckOutWindow` (loose 12h upper bound)
 *   4. `verifyCheckoutToken` — JWT signature, expiry, alg, payload shape
 *   5. `payload.jobId === application.jobId && payload.businessId === job.businessId`
 *      (prevents a QR from one job being used to check out of another)
 *
 * On success, computes:
 *   - actualHours (15-min rounding) via `calculateActualHours`
 *   - nightPremium via `calculateNightShiftPremium`
 *   - earnings = floor(actualHours * hourlyPay) + nightPremium + transportFee
 *
 * Then writes:
 *   - status → 'settled'   (Phase 5 SETL-01 — was 'completed' pre-Phase-5)
 *   - checkOutAt → now()
 *   - actualHours, earnings
 */
export async function checkOut(
  applicationId: string,
  qrToken: string,
): Promise<CheckOutResult> {
  const { application } = await requireApplicationOwner(applicationId);

  try {
    if (application.status !== "in_progress") {
      throw new ApplicationError("invalid_state");
    }
    if (!application.checkInAt) {
      throw new ApplicationError("invalid_state");
    }

    const job = await prisma.job.findUnique({
      where: { id: application.jobId },
      select: {
        id: true,
        businessId: true,
        workDate: true,
        startTime: true,
        hourlyPay: true,
        transportFee: true,
      },
    });
    if (!job) {
      throw new ApplicationError("invalid_state");
    }

    const now = new Date();
    if (
      !isWithinCheckOutWindow(
        now,
        job.workDate,
        job.startTime,
        application.checkInAt,
      )
    ) {
      throw new ApplicationError("check_out_time_window");
    }

    // Verify the JWT QR payload and map jose errors to user-facing codes
    let payload;
    try {
      payload = await verifyCheckoutToken(qrToken);
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      const message = err instanceof Error ? err.message : String(err);
      if (code === "ERR_JWT_EXPIRED" || /expired/i.test(message)) {
        throw new ApplicationError("check_out_qr_expired");
      }
      throw new ApplicationError("check_out_qr_invalid");
    }
    if (
      payload.jobId !== job.id ||
      payload.businessId !== job.businessId
    ) {
      throw new ApplicationError("check_out_qr_invalid");
    }

    const checkOutAt = now;
    const actualHours = calculateActualHours(application.checkInAt, checkOutAt);
    const nightPremium = calculateNightShiftPremium(
      application.checkInAt,
      checkOutAt,
      job.hourlyPay,
    );
    const earnings = calculateEarnings(
      actualHours,
      { hourlyPay: job.hourlyPay, transportFee: job.transportFee },
      nightPremium,
    );

    await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: "settled",
        checkOutAt,
        actualHours: new Prisma.Decimal(actualHours),
        earnings,
      },
    });

    safeRevalidate(`/my/applications/${applicationId}`);
    safeRevalidate("/my/applications");
    return { success: true, actualHours, earnings, nightPremium };
  } catch (e) {
    if (e instanceof ApplicationError) {
      return { success: false, error: e.code };
    }
    console.error("[checkOut]", e);
    return { success: false, error: "unknown" };
  }
}
