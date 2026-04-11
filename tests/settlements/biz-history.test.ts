// RED BASELINE (Wave 0): until Plan 04 implements getBizSettlements query.
// REQ: SETL-02 — getBizSettlements는 해당 사업체 소유 공고의 settled 지원 건만 반환한다.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import {
  createSettledApplication,
  truncatePhase5Tables,
} from "../fixtures/phase5";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

describe.skipIf(!process.env.DATABASE_URL)(
  "SETL-02: getBizSettlements returns only own jobs' settled applications",
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

    it("returns only own biz settlements, not foreign biz settlements", async () => {
      // Seed biz1 + biz2, each with 1 job, each with 1 settled-style application
      const { business: biz1 } =
        await createSettledApplication(prisma);
      await createSettledApplication(prisma); // biz2 — different business

      const { getBizSettlements } = await import("@/lib/db/queries");
      const result = await getBizSettlements(biz1.user.id);

      expect(result).toHaveLength(1);
      expect(result[0].job.businessId).toBe(biz1.businessProfile.id);
    });

    it("result row includes job.business and worker.workerProfile nested relations", async () => {
      const { business: biz1 } =
        await createSettledApplication(prisma);

      const { getBizSettlements } = await import("@/lib/db/queries");
      const result = await getBizSettlements(biz1.user.id);

      expect(result).toHaveLength(1);
      const row = result[0];
      // Nested relations required by SETL-02
      expect(row.job).toBeDefined();
      expect(row.job.businessId).toBe(biz1.businessProfile.id);
      expect(row.worker).toBeDefined();
    });
  },
);
