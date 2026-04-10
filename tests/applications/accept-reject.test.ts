// RED BASELINE (Wave 0): until Plan 04-04 implements acceptApplication / rejectApplication.
// REQ: APPL-04 — Business는 지원자를 수락/거절할 수 있고 거절은 jobs.filled를 감산한다.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  createTestWorker,
  createTestBusiness,
  createTestJob,
  truncatePhase4Tables,
} from "../fixtures/phase4";
import { skipIfNoSupabase } from "../helpers/skip-if-no-supabase";
// @ts-expect-error — Plan 04-04 provides these
import {
  acceptApplication,
  rejectApplication,
} from "@/app/biz/posts/[id]/applicants/actions";

describe.skipIf(skipIfNoSupabase())("APPL-04 accept/reject", () => {
  beforeEach(async () => {
    await truncatePhase4Tables(prisma);
  });
  afterEach(async () => {
    await truncatePhase4Tables(prisma);
  });

  async function seedPendingApplication(filled = 1) {
    const worker = await createTestWorker();
    const { user: bizUser, profile } = await createTestBusiness();
    const job = await createTestJob({
      businessId: profile.id,
      authorId: bizUser.id,
      headcount: 5,
      filled,
    });
    const app = await prisma.application.create({
      data: {
        jobId: job.id,
        workerId: worker.id,
        status: "pending" as never,
      },
    });
    return { worker, job, app };
  }

  it("accept transitions pending → confirmed", async () => {
    const { app } = await seedPendingApplication();
    const result = await acceptApplication(app.id);
    expect(result.success).toBe(true);
    const after = await prisma.application.findUnique({ where: { id: app.id } });
    expect(after?.status).toBe("confirmed");
  });

  it("reject transitions pending → cancelled and decrements job.filled", async () => {
    const { app, job } = await seedPendingApplication(1);
    const result = await rejectApplication(app.id);
    expect(result.success).toBe(true);
    const after = await prisma.application.findUnique({ where: { id: app.id } });
    expect(after?.status).toBe("cancelled");
    const jobAfter = await prisma.job.findUnique({ where: { id: job.id } });
    expect(jobAfter?.filled).toBe(0);
  });

  it("reject on confirmed also decrements filled", async () => {
    const { app, job } = await seedPendingApplication(1);
    await acceptApplication(app.id);
    await rejectApplication(app.id);
    const jobAfter = await prisma.job.findUnique({ where: { id: job.id } });
    expect(jobAfter?.filled).toBe(0);
  });
});
