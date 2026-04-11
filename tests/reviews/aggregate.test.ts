// @ts-expect-error — REV action file does not exist until Plan 03
// RED BASELINE (Wave 0): until Plan 03 implements createWorkerReview with atomic rating aggregation.
// REQ: REV-04 — createWorkerReview가 BusinessProfile.rating을 원자적으로 갱신한다.
//   Atomic update: $transaction + $executeRaw ensures no partial writes under concurrency.

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

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

describe.skipIf(!process.env.DATABASE_URL)(
  "REV-04: BusinessProfile rating aggregation",
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

    it("first review on a biz with reviewCount=0 sets rating=new exactly (edge case)", async () => {
      const { application, worker, business } =
        await createReviewableApplication(prisma);

      // Ensure fresh biz starts with reviewCount=0, rating=0
      const profileBefore = await prisma.businessProfile.findUnique({
        where: { id: business.businessProfile.id },
      });
      expect(Number(profileBefore?.reviewCount ?? 0)).toBe(0);

      await createWorkerReview({
        applicationId: application.id,
        rating: 5,
        tags: [],
        __testSessionId: worker.id,
      } as any);

      const profileAfter = await prisma.businessProfile.findUnique({
        where: { id: business.businessProfile.id },
      });
      expect(Number(profileAfter?.rating)).toBe(5);
      expect(Number(profileAfter?.reviewCount)).toBe(1);
    });

    it("second review computes weighted average correctly: start at (4.00,1), add 5 → (4.50,2)", async () => {
      const { application: app1, worker: w1, business } =
        await createReviewableApplication(prisma);

      // Manually seed businessProfile with rating=4.00, reviewCount=1 (as-if one prior review)
      await prisma.businessProfile.update({
        where: { id: business.businessProfile.id },
        data: {
          rating: 4.0,
          reviewCount: 1,
        } as any,
      });

      await createWorkerReview({
        applicationId: app1.id,
        rating: 5,
        tags: [],
        __testSessionId: w1.id,
      } as any);

      const profileAfter = await prisma.businessProfile.findUnique({
        where: { id: business.businessProfile.id },
      });
      // (4.00 * 1 + 5) / 2 = 4.50
      expect(Number(profileAfter?.rating)).toBe(4.5);
      expect(Number(profileAfter?.reviewCount)).toBe(2);
    });

    it("concurrent Promise.all of 2 reviews on different applications for same biz → final rating is mathematically correct", async () => {
      const { application: app1, worker: w1, business } =
        await createReviewableApplication(prisma);

      // Create a second application for the same business
      const { application: app2, worker: w2 } =
        await createReviewableApplication(prisma);

      // Update app2 to point to the same business (override job's businessId)
      // By seeding a second job under the same biz profile
      const { createTestJob } = await import("../fixtures/phase4/jobs");
      const job2 = await createTestJob({
        businessId: business.businessProfile.id,
        authorId: business.user.id,
        status: "active",
      });
      await prisma.application.update({
        where: { id: app2.id },
        data: { jobId: job2.id },
      });

      // Fire both reviews concurrently — atomic $transaction must prevent a race condition
      const [result1, result2] = await Promise.all([
        createWorkerReview({
          applicationId: app1.id,
          rating: 4,
          tags: [],
          __testSessionId: w1.id,
        } as any),
        createWorkerReview({
          applicationId: app2.id,
          rating: 5,
          tags: [],
          __testSessionId: w2.id,
        } as any),
      ]);

      // Both writes must succeed
      expect(result1).toMatchObject({ success: true });
      expect(result2).toMatchObject({ success: true });

      const profileAfter = await prisma.businessProfile.findUnique({
        where: { id: business.businessProfile.id },
      });
      expect(Number(profileAfter?.reviewCount)).toBe(2);
      // Average of 4 + 5 = 4.5 (order-independent since both applications use same biz)
      expect(Number(profileAfter?.rating)).toBeCloseTo(4.5, 1);
    });
  },
);
