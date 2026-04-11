// @ts-expect-error REV action file does not exist until Plan 03
// RED BASELINE (Wave 0): until Plan 03 implements createWorkerReview with atomic rating aggregation.
// REQ: REV-04 createWorkerReview updates BusinessProfile.rating atomically.
//   Atomic update: $transaction + $executeRaw ensures no partial writes under concurrency.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import {
  createReviewableApplication,
  truncatePhase5Tables,
} from "../fixtures/phase5";
// @ts-expect-error action file does not exist until Plan 03 Task 1
import { createWorkerReview } from "@/app/(worker)/my/applications/[id]/review/actions";
import type { CreateWorkerReviewInput } from "@/lib/validations/review";

type TestCreateWorkerReviewInput = CreateWorkerReviewInput & {
  __testSessionId?: string;
};

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

      const profileBefore = await prisma.businessProfile.findUnique({
        where: { id: business.businessProfile.id },
      });
      expect(Number(profileBefore?.reviewCount ?? 0)).toBe(0);

      const firstReviewInput: TestCreateWorkerReviewInput = {
        applicationId: application.id,
        rating: 5,
        tags: [],
        __testSessionId: worker.id,
      };
      await createWorkerReview(firstReviewInput);

      const profileAfter = await prisma.businessProfile.findUnique({
        where: { id: business.businessProfile.id },
      });
      expect(Number(profileAfter?.rating)).toBe(5);
      expect(Number(profileAfter?.reviewCount)).toBe(1);
    });

    it("second review computes weighted average correctly: start at (4.00,1), add 5 -> (4.50,2)", async () => {
      const { application: app1, worker: worker1, business } =
        await createReviewableApplication(prisma);

      await prisma.businessProfile.update({
        where: { id: business.businessProfile.id },
        data: {
          rating: 4.0,
          reviewCount: 1,
        },
      });

      const secondReviewInput: TestCreateWorkerReviewInput = {
        applicationId: app1.id,
        rating: 5,
        tags: [],
        __testSessionId: worker1.id,
      };
      await createWorkerReview(secondReviewInput);

      const profileAfter = await prisma.businessProfile.findUnique({
        where: { id: business.businessProfile.id },
      });
      expect(Number(profileAfter?.rating)).toBe(4.5);
      expect(Number(profileAfter?.reviewCount)).toBe(2);
    });

    it("concurrent reviews on different applications for the same biz keep the final rating mathematically correct", async () => {
      const { application: app1, worker: worker1, business } =
        await createReviewableApplication(prisma);
      const { application: app2, worker: worker2 } =
        await createReviewableApplication(prisma);

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

      const app1ReviewInput: TestCreateWorkerReviewInput = {
        applicationId: app1.id,
        rating: 4,
        tags: [],
        __testSessionId: worker1.id,
      };
      const app2ReviewInput: TestCreateWorkerReviewInput = {
        applicationId: app2.id,
        rating: 5,
        tags: [],
        __testSessionId: worker2.id,
      };

      const [result1, result2] = await Promise.all([
        createWorkerReview(app1ReviewInput),
        createWorkerReview(app2ReviewInput),
      ]);

      expect(result1).toMatchObject({ success: true });
      expect(result2).toMatchObject({ success: true });

      const profileAfter = await prisma.businessProfile.findUnique({
        where: { id: business.businessProfile.id },
      });
      expect(Number(profileAfter?.reviewCount)).toBe(2);
      expect(Number(profileAfter?.rating)).toBeCloseTo(4.5, 1);
    });
  },
);
