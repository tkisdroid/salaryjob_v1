// RED BASELINE (Wave 0): until Plan 04-04 implements atomic UPDATE that flips
// jobs.status='filled' when filled == headcount.
// REQ: APPL-05 — Accept된 지원이 headcount에 도달하면 공고가 자동으로 마감 상태로 전환된다.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  createTestWorker,
  createTestBusiness,
  createTestJob,
  truncatePhase4Tables,
} from "../fixtures/phase4";
import { skipIfNoSupabase } from "../helpers/skip-if-no-supabase";
// @ts-expect-error — Plan 04-04 will provide this
import { applyOneTap } from "@/app/(worker)/posts/[id]/apply/actions";

describe.skipIf(skipIfNoSupabase())("APPL-05 headcount auto-fill", () => {
  beforeEach(async () => {
    await truncatePhase4Tables(prisma);
  });
  afterEach(async () => {
    await truncatePhase4Tables(prisma);
  });

  it("marks job as filled atomically when last seat taken", async () => {
    await createTestWorker();
    const { user: bizUser, profile } = await createTestBusiness();
    const job = await createTestJob({
      businessId: profile.id,
      authorId: bizUser.id,
      headcount: 1,
    });

    const result = await applyOneTap({ jobId: job.id });
    expect(result.success).toBe(true);

    const after = await prisma.job.findUnique({ where: { id: job.id } });
    expect(after?.filled).toBe(1);
    expect(after?.status).toBe("filled");
  });

  it("subsequent apply after fill returns job_full", async () => {
    await createTestWorker();
    const { user: bizUser, profile } = await createTestBusiness();
    const job = await createTestJob({
      businessId: profile.id,
      authorId: bizUser.id,
      headcount: 1,
    });

    await applyOneTap({ jobId: job.id });
    // second worker session — Plan 04-04 must rotate the auth context per call
    await createTestWorker({ email: "second@test.local" });
    const r2 = await applyOneTap({ jobId: job.id });
    expect(r2.success).toBe(false);
    if (r2.success) return;
    expect(["job_full", "job_not_active"]).toContain(r2.error);
  });
});
