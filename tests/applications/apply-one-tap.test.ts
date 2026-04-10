// RED BASELINE (Wave 0): this test will fail until Plan 04-04 implements applyOneTap.
// REQ: APPL-01 — happy path. Worker는 공고 상세에서 원탭 지원으로 application(pending)을 생성하고 jobs.filled가 1 증가한다.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  createTestWorker,
  createTestBusiness,
  createTestJob,
  truncatePhase4Tables,
} from "../fixtures/phase4";
import { skipIfNoSupabase } from "../helpers/skip-if-no-supabase";
// @ts-expect-error — Plan 04-04 will create this Server Action file
import { applyOneTap } from "@/app/(worker)/posts/[id]/apply/actions";

describe.skipIf(skipIfNoSupabase())("APPL-01 applyOneTap happy path", () => {
  beforeEach(async () => {
    await truncatePhase4Tables(prisma);
  });
  afterEach(async () => {
    await truncatePhase4Tables(prisma);
  });

  it("creates application with pending status and increments job.filled", async () => {
    const worker = await createTestWorker();
    const { user: bizUser, profile } = await createTestBusiness();
    const job = await createTestJob({
      businessId: profile.id,
      authorId: bizUser.id,
      headcount: 3,
    });

    const result = await applyOneTap({ jobId: job.id });

    expect(result.success).toBe(true);
    if (!result.success) return;
    const app = await prisma.application.findUnique({
      where: { id: result.applicationId },
    });
    expect(app).not.toBeNull();
    expect(app?.workerId).toBe(worker.id);
    expect(app?.status).toBe("pending");
    const jobAfter = await prisma.job.findUnique({ where: { id: job.id } });
    expect(jobAfter?.filled).toBe(1);
    expect(jobAfter?.status).toBe("active"); // not yet full
  });
});
