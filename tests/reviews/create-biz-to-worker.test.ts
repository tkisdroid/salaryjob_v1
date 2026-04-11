// @ts-expect-error — REV action file does not exist until Plan 03
// RED BASELINE (Wave 0): until Plan 03 implements createBusinessReview action.
// REQ: REV-02 — Business가 근무 완료(settled) 지원 건에 대해 Worker를 리뷰할 수 있다.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import {
  createReviewableApplication,
  createTestBusiness,
  truncatePhase5Tables,
} from "../fixtures/phase5";
// @ts-expect-error — action file does not exist until Plan 03 Task 1
import { createBusinessReview } from "@/app/biz/posts/[id]/applicants/[applicantId]/review/actions";

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
      const { application, business, worker } =
        await createReviewableApplication(prisma);
      const result = await createBusinessReview({
        applicationId: application.id,
        rating: 4,
        tags: ["성실해요"],
        comment: "잘 해줬어요",
        __testSessionId: business.user.id, // test-mode ownership bypass
      } as any);
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
      // Create a different business that does NOT own the job
      const { user: otherBiz } = await createTestBusiness();
      const result = await createBusinessReview({
        applicationId: application.id,
        rating: 3,
        tags: [],
        __testSessionId: otherBiz.id, // foreign business session
      } as any);
      expect(result).toMatchObject({ success: false, error: "unauthorized" });
    });
  },
);
