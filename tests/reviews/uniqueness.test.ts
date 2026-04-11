// @ts-expect-error REV action files do not exist until Plan 03
// RED BASELINE (Wave 0): until Plan 03 implements createWorkerReview + createBusinessReview.
// REQ: REV-03 Same application + same direction cannot be reviewed twice.

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
// @ts-expect-error action file does not exist until Plan 03 Task 1
import { createBusinessReview } from "@/app/biz/posts/[id]/applicants/[applicantId]/review/actions";
import type {
  CreateBusinessReviewInput,
  CreateWorkerReviewInput,
} from "@/lib/validations/review";

type TestCreateWorkerReviewInput = CreateWorkerReviewInput & {
  __testSessionId?: string;
};

type TestCreateBusinessReviewInput = CreateBusinessReviewInput & {
  __testSessionId?: string;
};

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

      const firstInput: TestCreateWorkerReviewInput = {
        applicationId: application.id,
        rating: 5,
        tags: [],
        __testSessionId: worker.id,
      };
      const first = await createWorkerReview(firstInput);
      expect(first).toMatchObject({ success: true });

      const secondInput: TestCreateWorkerReviewInput = {
        applicationId: application.id,
        rating: 3,
        tags: [],
        __testSessionId: worker.id,
      };
      const second = await createWorkerReview(secondInput);
      expect(second).toMatchObject({
        success: false,
        error: "already_reviewed",
      });

      const rows = await prisma.review.findMany({
        where: { applicationId: application.id },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].direction).toBe("worker_to_business");
    });

    it("same application + opposite direction can both succeed", async () => {
      const { application, worker, business } =
        await createReviewableApplication(prisma);

      const workerInput: TestCreateWorkerReviewInput = {
        applicationId: application.id,
        rating: 5,
        tags: [],
        __testSessionId: worker.id,
      };
      const workerResult = await createWorkerReview(workerInput);
      expect(workerResult).toMatchObject({ success: true });

      const businessInput: TestCreateBusinessReviewInput = {
        applicationId: application.id,
        rating: 4,
        tags: [],
        __testSessionId: business.user.id,
      };
      const businessResult = await createBusinessReview(businessInput);
      expect(businessResult).toMatchObject({ success: true });

      const rows = await prisma.review.findMany({
        where: { applicationId: application.id },
        orderBy: { direction: "asc" },
      });
      expect(rows).toHaveLength(2);
      expect(rows.map((row) => row.direction)).toContain("worker_to_business");
      expect(rows.map((row) => row.direction)).toContain("business_to_worker");
    });
  },
);
