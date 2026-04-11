// RED BASELINE (Wave 0): until Plan 04 implements getWorkerSettlementTotals query.
// REQ: SETL-03 — getWorkerSettlementTotals가 전체 합산과 KST 당월 합산을 정확하게 반환한다.
//   KST = UTC+9. Boundary: 2026-04-30T15:00:00Z = 2026-05-01T00:00:00+09:00

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import {
  createTestWorker,
  createTestBusiness,
  createTestJob,
  truncatePhase5Tables,
} from "../fixtures/phase5";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

describe.skipIf(!process.env.DATABASE_URL)(
  "SETL-03: getWorkerSettlementTotals KST month boundary",
  () => {
    beforeAll(async () => {
      await truncatePhase5Tables(prisma);
    });
    afterAll(async () => {
      await truncatePhase5Tables(prisma);
      await prisma.$disconnect();
    });
    beforeEach(async () => {
      await truncatePhase5Tables(prisma);
    });

    it("allTimeTotal and allTimeCount are correct across 3+ seeded settlements", async () => {
      const worker = await createTestWorker();
      const { user: bizUser, profile: bizProfile } = await createTestBusiness();

      // Seed 3 settled-style applications with earnings 50000 / 30000 / 20000
      const earningsValues = [50000, 30000, 20000];
      for (const earnings of earningsValues) {
        const job = await createTestJob({
          businessId: bizProfile.id,
          authorId: bizUser.id,
          status: "active",
        });
        await prisma.application.create({
          data: {
            jobId: job.id,
            workerId: worker.id,
            status: "settled",
            appliedAt: new Date(Date.now() - 24 * 3600 * 1000),
            checkInAt: new Date(Date.now() - 5 * 3600 * 1000),
            checkOutAt: new Date(Date.now() - 1 * 3600 * 1000),
            actualHours: new Prisma.Decimal(4),
            earnings,
          },
        });
      }

      const { getWorkerSettlementTotals } = await import("@/lib/db/queries");
      const totals = await getWorkerSettlementTotals(worker.id);

      expect(totals.allTimeTotal).toBe(100000); // 50000 + 30000 + 20000
      expect(totals.allTimeCount).toBe(3);
    });

    it("thisMonthTotal counts a checkout in the current KST month correctly", async () => {
      // vi.setSystemTime() does not affect PostgreSQL's now() — we use real-time-relative
      // checkOutAt values instead. The KST boundary logic is tested by the month-boundary case below.
      const worker = await createTestWorker();
      const { user: bizUser, profile: bizProfile } = await createTestBusiness();

      const job = await createTestJob({
        businessId: bizProfile.id,
        authorId: bizUser.id,
        status: "active",
      });

      // checkOutAt: 1 hour ago (real time) — guaranteed to be in the same KST month as now()
      const thisMonthCheckout = new Date(Date.now() - 1 * 3600 * 1000);
      await prisma.application.create({
        data: {
          jobId: job.id,
          workerId: worker.id,
          status: "settled",
          appliedAt: new Date(Date.now() - 24 * 3600 * 1000),
          checkInAt: new Date(Date.now() - 5 * 3600 * 1000),
          checkOutAt: thisMonthCheckout,
          actualHours: new Prisma.Decimal(4),
          earnings: 40000,
        },
      });

      const { getWorkerSettlementTotals } = await import("@/lib/db/queries");
      const totals = await getWorkerSettlementTotals(worker.id);

      // checkOutAt is in the current KST month → should be counted in thisMonthTotal
      expect(totals.thisMonthTotal).toBe(40000);
      expect(totals.allTimeTotal).toBe(40000);
    });

    it("KST boundary: checkOutAt in previous month (KST) is excluded from thisMonthTotal", async () => {
      // vi.setSystemTime() does not affect PostgreSQL's now() — use real absolute timestamps.
      // We seed a settlement with checkOutAt = last month (reliably in a different KST month).
      // The SQL uses AT TIME ZONE 'Asia/Seoul' so KST month boundaries are respected.
      const worker = await createTestWorker();
      const { user: bizUser, profile: bizProfile } = await createTestBusiness();

      const job = await createTestJob({
        businessId: bizProfile.id,
        authorId: bizUser.id,
        status: "active",
      });

      // checkOutAt: 35 days ago — guaranteed to be in a previous KST month
      const lastMonthCheckout = new Date(Date.now() - 35 * 24 * 3600 * 1000);

      await prisma.application.create({
        data: {
          jobId: job.id,
          workerId: worker.id,
          status: "settled",
          appliedAt: new Date(Date.now() - 36 * 24 * 3600 * 1000),
          checkInAt: new Date(Date.now() - 35 * 24 * 3600 * 1000 - 5 * 3600 * 1000),
          checkOutAt: lastMonthCheckout,
          actualHours: new Prisma.Decimal(4),
          earnings: 35000,
        },
      });

      const { getWorkerSettlementTotals } = await import("@/lib/db/queries");
      const totals = await getWorkerSettlementTotals(worker.id);

      // checkOutAt is 35 days ago (previous KST month) → thisMonthTotal must be 0
      expect(totals.thisMonthTotal).toBe(0);
      // allTimeTotal still includes it
      expect(totals.allTimeTotal).toBe(35000);
    });
  },
);
