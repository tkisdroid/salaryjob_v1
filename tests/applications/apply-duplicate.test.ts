// RED BASELINE (Wave 0): until Plan 04-04 implements ON CONFLICT + status='filled' rejection.
// REQ: APPL-01 — duplicate apply from same worker, and apply-after-fill must fail.

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

describe.skipIf(skipIfNoSupabase())("APPL-01 applyOneTap duplicate guard", () => {
  beforeEach(async () => {
    await truncatePhase4Tables(prisma);
  });
  afterEach(async () => {
    await truncatePhase4Tables(prisma);
  });

  it("rejects duplicate apply from same worker", async () => {
    await createTestWorker();
    const { user: bizUser, profile } = await createTestBusiness();
    const job = await createTestJob({
      businessId: profile.id,
      authorId: bizUser.id,
      headcount: 5,
    });

    const r1 = await applyOneTap({ jobId: job.id });
    expect(r1.success).toBe(true);

    const r2 = await applyOneTap({ jobId: job.id });
    expect(r2.success).toBe(false);
    if (r2.success) return;
    expect(r2.error).toBe("already_applied");

    const jobAfter = await prisma.job.findUnique({ where: { id: job.id } });
    // Compensation rollback: filled count must NOT have advanced past 1
    expect(jobAfter?.filled).toBe(1);
  });

  it("rejects apply when job.status='filled'", async () => {
    await createTestWorker();
    const { user: bizUser, profile } = await createTestBusiness();
    const job = await createTestJob({
      businessId: profile.id,
      authorId: bizUser.id,
      headcount: 1,
      filled: 1,
      status: "filled",
    });

    const result = await applyOneTap({ jobId: job.id });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(["job_not_active", "job_full"]).toContain(result.error);
  });
});
