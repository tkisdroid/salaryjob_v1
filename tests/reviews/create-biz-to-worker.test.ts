// @ts-expect-error REV action file does not exist until Plan 03
// RED BASELINE (Wave 0): until Plan 03 implements createBusinessReview action.
// REQ: REV-02 Business can review a worker after a settled shift.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import {
  createReviewableApplication,
  createTestBusiness,
  truncatePhase5Tables,
} from "../fixtures/phase5";
// @ts-expect-error action file does not exist until Plan 03 Task 1
import { createBusinessReview } from "@/app/biz/posts/[id]/applicants/[applicantId]/review/actions";
import type { CreateBusinessReviewInput } from "@/lib/validations/review";

type TestCreateBusinessReviewInput = CreateBusinessReviewInput & {
  __testSessionId?: string;
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

describe.skipIf(!process.env.DATABASE_URL)(
  "REV-02: createBusinessReview",
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

    it("happy path: createBusinessReview by job owner returns success", async () => {
      const { application, business } = await createReviewableApplication(prisma);

      const input: TestCreateBusinessReviewInput = {
        applicationId: application.id,
        rating: 4,
        tags: [],
        __testSessionId: business.user.id,
      };

      const result = await createBusinessReview(input);
      expect(result).toMatchObject({ success: true });

      const row = await prisma.review.findUnique({
        where: {
          applicationId_direction: {
            applicationId: application.id,
            direction: "business_to_worker",
          },
        },
      });
      expect(row).not.toBeNull();
      expect(row?.rating).toBe(4);
    });

    it("rejects when caller is not the job owner (ownership failure)", async () => {
      const { application } = await createReviewableApplication(prisma);
      const { user: otherBusiness } = await createTestBusiness();

      const input: TestCreateBusinessReviewInput = {
        applicationId: application.id,
        rating: 3,
        tags: [],
        __testSessionId: otherBusiness.id,
      };

      const result = await createBusinessReview(input);
      expect(result).toMatchObject({ success: false, error: "unauthorized" });
    });
  },
);
