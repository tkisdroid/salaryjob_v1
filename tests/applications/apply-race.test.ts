// RED BASELINE (Wave 0): until Plan 04-04 implements atomic UPDATE for applyOneTap.
// REQ: APPL-01 concurrency — N concurrent apply attempts on a job with headcount=K
// must yield exactly K successes and N-K 'job_full' failures, with jobs.status='filled'.

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

describe.skipIf(skipIfNoSupabase())("APPL-01 applyOneTap race", () => {
  beforeEach(async () => {
    await truncatePhase4Tables(prisma);
  });
  afterEach(async () => {
    await truncatePhase4Tables(prisma);
  });

  it("allows exactly headcount successes out of N concurrent apply attempts", async () => {
    const HEADCOUNT = 5;
    const TOTAL_WORKERS = 10;

    const { user: bizUser, profile } = await createTestBusiness();
    const job = await createTestJob({
      businessId: profile.id,
      authorId: bizUser.id,
      headcount: HEADCOUNT,
    });

    const workers = await Promise.all(
      Array.from({ length: TOTAL_WORKERS }, () => createTestWorker()),
    );

    const results = await Promise.all(
      workers.map(() => applyOneTap({ jobId: job.id })),
    );

    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    expect(successes.length).toBe(HEADCOUNT);
    expect(failures.length).toBe(TOTAL_WORKERS - HEADCOUNT);
    for (const f of failures) {
      if (f.success) continue;
      expect(["job_full", "already_applied"]).toContain(f.error);
    }

    const jobAfter = await prisma.job.findUnique({ where: { id: job.id } });
    expect(jobAfter?.filled).toBe(HEADCOUNT);
    expect(jobAfter?.status).toBe("filled");
  });
});
