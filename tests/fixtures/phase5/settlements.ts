// Phase 5 Wave 0 settlement fixtures
//
// Wave 0 note: factories use status='completed' because the 'settled' enum value
// does NOT yet exist — it will be added by Plan 02 Task 1 (prisma db push).
// Plan 04 Task 1 updates the factory to emit 'settled' after Plan 02 pushes the enum.
// See Plan 01 frontmatter coupling note and 05-RESEARCH.md for details.

import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { createTestWorker, createTestBusiness } from "../phase4/users";
import { createTestJob } from "../phase4/jobs";

export interface CreateSettledApplicationOpts {
  hourlyPay?: number;
  transportFee?: number;
}

/**
 * Creates a complete worker + business + job + application fixture with
 * realistic check-in/out times and earnings. Status is 'completed' in Wave 0
 * because 'settled' enum value is added in Plan 02; Plan 04 updates this literal.
 *
 * Phase 4 factories (createTestWorker / createTestBusiness / createTestJob) use
 * the global @/lib/db prisma singleton internally — this factory receives its own
 * prisma parameter only for the application.create call.
 *
 * @param prisma - PrismaClient instance (passed in so tests control connection lifecycle)
 * @param opts - Optional overrides for hourlyPay and transportFee
 */
export async function createSettledApplication(
  prisma: PrismaClient,
  opts: CreateSettledApplicationOpts = {},
) {
  const worker = await createTestWorker();
  const { user: bizUser, profile: bizProfile } = await createTestBusiness();
  const job = await createTestJob({
    businessId: bizProfile.id,
    hourlyPay: opts.hourlyPay ?? 12000,
    transportFee: opts.transportFee ?? 2000,
    headcount: 1,
    status: "active",
    authorId: bizUser.id,
  });

  // Wave 0: use 'completed' because 'settled' enum value does not yet exist.
  // Plan 04 migrates both the factory and the DONE_STATUSES constant.
  const checkInAt = new Date(Date.now() - 5 * 3600 * 1000);
  const checkOutAt = new Date(Date.now() - 1 * 3600 * 1000);

  const application = await prisma.application.create({
    data: {
      jobId: job.id,
      workerId: worker.id,
      status: "completed",
      appliedAt: new Date(Date.now() - 24 * 3600 * 1000),
      checkInAt,
      checkOutAt,
      actualHours: new Prisma.Decimal(4),
      earnings: 50000,
    },
  });

  return {
    worker,
    business: { user: bizUser, businessProfile: bizProfile },
    job,
    application,
  };
}

/**
 * Creates a reviewable application (like createSettledApplication) with
 * realistic shift data: checkInAt, checkOutAt, actualHours=4.0, earnings=60000.
 * Used by review tests where shift data needs to be present.
 *
 * @param prisma - PrismaClient instance
 * @param opts - Optional overrides including custom checkOutAt for boundary tests
 */
export async function createReviewableApplication(
  prisma: PrismaClient,
  opts: { checkOutAt?: Date } = {},
) {
  const base = await createSettledApplication(prisma);
  if (opts.checkOutAt) {
    await prisma.application.update({
      where: { id: base.application.id },
      data: { checkOutAt: opts.checkOutAt },
    });
    base.application.checkOutAt = opts.checkOutAt;
  }
  return base;
}
