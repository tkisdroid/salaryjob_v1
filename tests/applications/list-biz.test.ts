// RED BASELINE (Wave 0): until Plan 04-04 implements getApplicationsByJob.
// REQ: APPL-03 — Business는 자신의 공고에 대한 지원자 목록을 worker profile join으로 본다.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  createTestWorker,
  createTestBusiness,
  createTestJob,
  truncatePhase4Tables,
} from "../fixtures/phase4";
import { skipIfNoSupabase } from "../helpers/skip-if-no-supabase";
// @ts-expect-error — Plan 04-04 will provide getApplicationsByJob
import { getApplicationsByJob } from "@/lib/db/queries";

describe.skipIf(skipIfNoSupabase())("APPL-03 list applications by biz job", () => {
  beforeEach(async () => {
    await truncatePhase4Tables(prisma);
  });
  afterEach(async () => {
    await truncatePhase4Tables(prisma);
  });

  it("returns all applications for a business job joined with worker profile", async () => {
    const w1 = await createTestWorker({ name: "Alice" });
    const w2 = await createTestWorker({ name: "Bob" });
    const w3 = await createTestWorker({ name: "Carol" });
    const { user: bizUser, profile } = await createTestBusiness();
    const job = await createTestJob({
      businessId: profile.id,
      authorId: bizUser.id,
      headcount: 5,
    });

    await prisma.application.createMany({
      data: [
        { jobId: job.id, workerId: w1.id, status: "pending" as never },
        { jobId: job.id, workerId: w2.id, status: "confirmed" },
        { jobId: job.id, workerId: w3.id, status: "completed" },
      ],
    });

    const rows = await getApplicationsByJob(job.id);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(3);
    for (const row of rows) {
      expect(row.worker).toBeDefined();
      expect(typeof row.worker.name).toBe("string");
      expect(row.workerProfile).toBeDefined();
      expect(row.workerProfile).toHaveProperty("rating");
    }
    const names = rows.map((r) => r.worker.name).sort();
    expect(names).toEqual(["Alice", "Bob", "Carol"]);
  });
});
