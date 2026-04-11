// RED BASELINE (Wave 0): until Plan 04-04 extends getApplicationsByWorker with bucket filter.
// REQ: APPL-02 — Worker는 자신의 지원 목록을 예정/진행중/완료 버킷으로 필터해서 본다.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  createTestWorker,
  createTestBusiness,
  createTestJob,
  truncatePhase4Tables,
} from "../fixtures/phase4";
import { skipIfNoSupabase } from "../helpers/skip-if-no-supabase";
import { getApplicationsByWorker } from "@/lib/db/queries";

type Bucket = "upcoming" | "active" | "done";

describe.skipIf(skipIfNoSupabase())("APPL-02 list applications by worker bucket", () => {
  beforeEach(async () => {
    await truncatePhase4Tables(prisma);
  });
  afterEach(async () => {
    await truncatePhase4Tables(prisma);
  });

  it("returns worker applications filtered by status bucket 예정/진행중/완료", async () => {
    const worker = await createTestWorker();
    const { user: bizUser, profile } = await createTestBusiness();

    const baseOpts = { businessId: profile.id, authorId: bizUser.id };
    const j1 = await createTestJob({ ...baseOpts, headcount: 5 });
    const j2 = await createTestJob({ ...baseOpts, headcount: 5 });
    const j3 = await createTestJob({ ...baseOpts, headcount: 5 });
    const j4 = await createTestJob({ ...baseOpts, headcount: 5 });
    const j5 = await createTestJob({ ...baseOpts, headcount: 5 });

    await prisma.application.createMany({
      data: [
        // pending added in Plan 04-02 — until then this insert is RED
        { jobId: j1.id, workerId: worker.id, status: "pending" as never },
        { jobId: j2.id, workerId: worker.id, status: "confirmed" },
        { jobId: j3.id, workerId: worker.id, status: "in_progress" },
        { jobId: j4.id, workerId: worker.id, status: "settled" as never },
        { jobId: j5.id, workerId: worker.id, status: "cancelled" },
      ],
    });

    const upcoming = await getApplicationsByWorker(worker.id, {
      bucket: "upcoming" as Bucket,
    });
    const active = await getApplicationsByWorker(worker.id, {
      bucket: "active" as Bucket,
    });
    const done = await getApplicationsByWorker(worker.id, {
      bucket: "done" as Bucket,
    });

    expect(upcoming.map((a: { status: string }) => a.status).sort()).toEqual([
      "confirmed",
      "pending",
    ]);
    expect(active.map((a: { status: string }) => a.status)).toEqual([
      "in_progress",
    ]);
    expect(done.map((a: { status: string }) => a.status)).toEqual(["settled"]);
  });
});
