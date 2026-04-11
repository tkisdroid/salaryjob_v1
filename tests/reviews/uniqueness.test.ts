// @ts-expect-error — REV action files do not exist until Plan 03
// RED BASELINE (Wave 0): until Plan 03 implements createWorkerReview + createBusinessReview.
// REQ: REV-03 — 동일 지원 건 + 동일 방향으로 리뷰를 2회 제출하면 already_reviewed 에러 반환.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import {
  createReviewableApplication,
  truncatePhase5Tables,
} from "../fixtures/phase5";
// @ts-expect-error — action file does not exist until Plan 03 Task 1
import { createWorkerReview } from "@/app/(worker)/my/applications/[id]/review/actions";
// @ts-expect-error — action file does not exist until Plan 03 Task 1
import { createBusinessReview } from "@/app/biz/posts/[id]/applicants/[applicantId]/review/actions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

describe.skipIf(!process.env.DATABASE_URL)(
  "REV-03: review uniqueness constraint",
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

    it("second identical submission returns error='already_reviewed'", async () => {
      const { application, worker } = await createReviewableApplication(prisma);
      const first = await createWorkerReview({
        applicationId: application.id,
        rating: 5,
        tags: [],
        __testSessionId: worker.id,
      } as any);
      expect(first).toMatchObject({ success: true });

      const second = await createWorkerReview({
        applicationId: application.id,
        rating: 3,
        tags: [],
        __testSessionId: worker.id,
      } as any);
      expect(second).toMatchObject({ success: false, error: "already_reviewed" });

      // Verify only one row exists in DB with applicationId_direction composite key
      const rows = await prisma.review.findMany({
        where: { applicationId: application.id },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].direction).toBe("worker_to_business");
    });

    it("same application + opposite direction can both succeed (worker_to_business AND business_to_worker)", async () => {
      const { application, worker, business } =
        await createReviewableApplication(prisma);

      const workerResult = await createWorkerReview({
        applicationId: application.id,
        rating: 5,
        tags: ["친절해요"],
        __testSessionId: worker.id,
      } as any);
      expect(workerResult).toMatchObject({ success: true });

      const bizResult = await createBusinessReview({
        applicationId: application.id,
        rating: 4,
        tags: ["성실함"],
        __testSessionId: business.user.id,
      } as any);
      expect(bizResult).toMatchObject({ success: true });

      // Verify 2 rows exist with different directions — applicationId_direction composite unique
      const rows = await prisma.review.findMany({
        where: { applicationId: application.id },
        orderBy: { direction: "asc" },
      });
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.direction)).toContain("worker_to_business");
      expect(rows.map((r) => r.direction)).toContain("business_to_worker");
    });
  },
);
