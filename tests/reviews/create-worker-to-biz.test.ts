// @ts-expect-error REV action file does not exist until Plan 03
// RED BASELINE (Wave 0): until Plan 03 implements createWorkerReview action.
// REQ: REV-01 Worker can review a business after a settled shift.

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

      const input: TestCreateWorkerReviewInput = {
        applicationId: application.id,
        rating: 5,
        tags: [],
        __testSessionId: worker.id,
      };

      const result = await createWorkerReview(input);
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

      const input: TestCreateWorkerReviewInput = {
        applicationId: application.id,
        rating: 5,
        tags: [],
      };

      const result = await createWorkerReview(input);
      expect(result).toMatchObject({ success: false, error: "not_settled" });
    });

    it("sets application.reviewGiven = true on success", async () => {
      const { application } = await createReviewableApplication(prisma);

      const input: TestCreateWorkerReviewInput = {
        applicationId: application.id,
        rating: 4,
        tags: [],
      };

      await createWorkerReview(input);

      const row = await prisma.application.findUnique({
        where: { id: application.id },
      });
      expect(row?.reviewGiven).toBe(true);
    });
  },
);
