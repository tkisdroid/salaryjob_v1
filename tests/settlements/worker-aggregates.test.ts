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
  vi,
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
            status: "completed", // Wave 0: 'settled' added in Plan 02
            appliedAt: new Date(Date.now() - 24 * 3600 * 1000),
            checkInAt: new Date(Date.now() - 5 * 3600 * 1000),
            checkOutAt: new Date(Date.now() - 1 * 3600 * 1000),
            actualHours: new Prisma.Decimal(4),
            earnings,
          },
        });
      }

      // @ts-expect-error — symbol does not exist until Plan 04
      const { getWorkerSettlementTotals } = await import("@/lib/db/queries");
      const totals = await getWorkerSettlementTotals(worker.id);

      expect(totals.allTimeTotal).toBe(100000); // 50000 + 30000 + 20000
      expect(totals.allTimeCount).toBe(3);
    });

    it("thisMonthTotal counts April settlement correctly when now is in April (KST)", async () => {
      // Freeze time: April 30, 2026 23:00 KST = 2026-04-30T14:00:00Z
      vi.setSystemTime(new Date("2026-04-30T14:00:00Z"));

      const worker = await createTestWorker();
      const { user: bizUser, profile: bizProfile } = await createTestBusiness();

      const job = await createTestJob({
        businessId: bizProfile.id,
        authorId: bizUser.id,
        status: "active",
      });

      // checkOutAt: 2026-04-30T14:59:59.999Z = April 30 23:59:59 KST — still in April
      const aprilCheckout = new Date("2026-04-30T14:59:59.999Z");
      await prisma.application.create({
        data: {
          jobId: job.id,
          workerId: worker.id,
          status: "completed",
          appliedAt: new Date("2026-04-29T00:00:00Z"),
          checkInAt: new Date("2026-04-30T10:00:00Z"),
          checkOutAt: aprilCheckout,
          actualHours: new Prisma.Decimal(4),
          earnings: 40000,
        },
      });

      // @ts-expect-error — symbol does not exist until Plan 04
      const { getWorkerSettlementTotals } = await import("@/lib/db/queries");
      const totals = await getWorkerSettlementTotals(worker.id);

      // Should count this settlement in April's thisMonthTotal
      expect(totals.thisMonthTotal).toBe(40000);

      vi.useRealTimers();
    });

    it("KST boundary: 2026-04-30T15:00:01Z (= May 1 00:00:01 KST) crosses into May", async () => {
      // Freeze time: still April 30 UTC, but May 1 KST
      vi.setSystemTime(new Date("2026-04-30T15:00:01Z"));

      const worker = await createTestWorker();
      const { user: bizUser, profile: bizProfile } = await createTestBusiness();

      const job = await createTestJob({
        businessId: bizProfile.id,
        authorId: bizUser.id,
        status: "active",
      });

      // checkOutAt: 2026-04-30T15:00:01Z = May 1 00:00:01 KST — crosses into May
      const mayCheckout = new Date("2026-04-30T15:00:01Z");
      await prisma.application.create({
        data: {
          jobId: job.id,
          workerId: worker.id,
          status: "completed",
          appliedAt: new Date("2026-04-29T00:00:00Z"),
          checkInAt: new Date("2026-04-30T10:00:00Z"),
          checkOutAt: mayCheckout,
          actualHours: new Prisma.Decimal(4),
          earnings: 35000,
        },
      });

      // @ts-expect-error — symbol does not exist until Plan 04
      const { getWorkerSettlementTotals } = await import("@/lib/db/queries");
      const totals = await getWorkerSettlementTotals(worker.id);

      // thisMonthTotal for April should be 0 (the checkout is May 1 KST)
      // allTimeTotal should still include it
      expect(totals.thisMonthTotal).toBe(0); // May 1 KST — not counted in April
      expect(totals.allTimeTotal).toBe(35000);

      vi.useRealTimers();
    });
  },
);
