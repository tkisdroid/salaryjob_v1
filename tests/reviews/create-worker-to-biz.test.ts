// @ts-expect-error — REV action file does not exist until Plan 03
// RED BASELINE (Wave 0): until Plan 03 implements createWorkerReview action.
// REQ: REV-01 — Worker가 근무 완료(settled) 지원 건에 대해 사업장을 리뷰할 수 있다.

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
  "REV-01: createWorkerReview",
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

    it("persists review row on settled application", async () => {
      const { application, worker } = await createReviewableApplication(prisma);
      // Force status -> settled (Plan 02 will add enum value; Wave 0 stub asserts future behavior)
      const result = await createWorkerReview({
        applicationId: application.id,
        rating: 5,
        tags: ["친절해요"],
        comment: "좋았어요",
        __testSessionId: worker.id, // test-mode dal override
      } as any);
      expect(result).toMatchObject({ success: true });
      const row = await prisma.review.findUnique({
        where: {
          applicationId_direction: {
            applicationId: application.id,
            direction: "worker_to_business",
          },
        },
      });
      expect(row).not.toBeNull();
      expect(row?.rating).toBe(5);
    });

    it("returns error=not_settled on in_progress application", async () => {
      const { application } = await createReviewableApplication(prisma);
      await prisma.application.update({
        where: { id: application.id },
        data: { status: "in_progress" },
      });
      const result = await createWorkerReview({
        applicationId: application.id,
        rating: 5,
        tags: [],
      } as any);
      expect(result).toMatchObject({ success: false, error: "not_settled" });
    });

    it("sets application.reviewGiven = true on success", async () => {
      const { application } = await createReviewableApplication(prisma);
      await createWorkerReview({
        applicationId: application.id,
        rating: 4,
        tags: [],
      } as any);
      const row = await prisma.application.findUnique({
        where: { id: application.id },
      });
      expect(row?.reviewGiven).toBe(true);
    });
  },
);
