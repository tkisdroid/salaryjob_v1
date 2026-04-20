// Wave 0 RED tests — D-31 createJob image gate
//
// INTENTIONALLY RED/SKIP until Wave 7 (Plan 06-07) patches createJob to check
// businessRegImageUrl before creating a Job row.
//
// Flip to GREEN: Plan 06-07 must:
//   1. Add a guard in createJob (src/app/biz/posts/actions.ts) that:
//      - Queries BusinessProfile.businessRegImageUrl for the given businessId
//      - If null → returns { error: 'verify_required', redirectTo: '/biz/verify?businessId=...' } (NO Job insert)
//      - If NOT null → proceeds normally and inserts 1 Job row
//   2. Gate checks businessRegImageUrl IS NOT NULL — NOT the `verified` column (per Pitfall 3)
//
// NOTE: describe.skip here because:
//   - Wave 2 schema must have the businessRegImageUrl column on BusinessProfile
//   - The actual gate logic won't exist until Wave 7
// Remove describe.skip once Plan 06-07 ships.

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { createTestAdmin, createTestBusinessWithReg, cleanupPhase6Fixtures } from "../fixtures/phase6";
import { createJob } from "@/app/biz/posts/actions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Helper: build a valid createJob FormData payload
// ---------------------------------------------------------------------------

function buildJobFormData(businessId: string): FormData {
  const formData = new FormData();
  formData.set("businessId", businessId);
  formData.set("title", "단기 알바 — Wave0 게이트 테스트");
  formData.set("category", "food");
  formData.set("description", "Phase 6 RED test — image gate fixture");
  formData.set("hourlyPay", "12000");
  formData.set("transportFee", "0");
  const tomorrow = new Date(Date.now() + 86400 * 1000);
  formData.set("workDate", tomorrow.toISOString().slice(0, 10));
  formData.set("startTime", "09:00");
  formData.set("endTime", "13:00");
  formData.set("headcount", "1");
  formData.set("address", "서울 강남구 테헤란로 212");
  return formData;
}

describe.skipIf(!process.env.DATABASE_URL)(
  "D-31: createJob image gate — businessRegImageUrl null blocks job creation",
  () => {
    beforeAll(async () => {
      await cleanupPhase6Fixtures();
    });
    afterAll(async () => {
      await cleanupPhase6Fixtures();
      await prisma.$disconnect();
    });
    beforeEach(async () => {
      await cleanupPhase6Fixtures();
    });

    it("businessRegImageUrl=null → createJob returns verify_required sentinel and inserts ZERO Job rows", async () => {
      const { id: userId } = await createTestAdmin();
      const { id: bizId } = await createTestBusinessWithReg({
        userId,
        businessRegImageUrl: null, // no image uploaded
        verified: true,            // verified by regNumber — but image gate is separate (D-39 / Pitfall 3)
      });

      const before = await prisma.job.count({
        where: { businessId: bizId },
      });

      const formData = buildJobFormData(bizId);

      // createJob uses 'use server' — invoke directly per Phase 4/5 pattern
      // (requires VITEST=true bypass in requireBusiness to skip Supabase session check)
      const result = await createJob({} as Parameters<typeof createJob>[0], formData);

      // Gate should short-circuit with a sentinel before inserting
      expect(result).toMatchObject({
        error: "verify_required",
      });
      // redirectTo field is optional but preferred
      if ("redirectTo" in (result ?? {})) {
        expect((result as { redirectTo?: string }).redirectTo).toBe(
          `/biz/verify?businessId=${bizId}`,
        );
      }

      const after = await prisma.job.count({
        where: { businessId: bizId },
      });
      expect(after).toBe(before); // ZERO new rows
    });

    it("businessRegImageUrl='some/path.png' → createJob proceeds and inserts 1 Job row", async () => {
      const { id: userId } = await createTestAdmin();
      const { id: bizId } = await createTestBusinessWithReg({
        userId,
        businessRegImageUrl: "business-reg-docs/some/path.png",
        verified: true,
      });

      const before = await prisma.job.count({
        where: { businessId: bizId },
      });

      const formData = buildJobFormData(bizId);

      // createJob may throw redirect() on success — catch it
      let threw = false;
      try {
        await createJob({} as Parameters<typeof createJob>[0], formData);
      } catch (e) {
        // Next.js redirect() throws a NEXT_REDIRECT object — that's a success signal
        if (
          e instanceof Error &&
          (e.message.includes("NEXT_REDIRECT") || e.message.includes("redirect"))
        ) {
          threw = true;
        } else {
          // Only job count assertion is needed; non-redirect errors are real failures
          throw e;
        }
      }

      const after = await prisma.job.count({
        where: { businessId: bizId },
      });
      expect(after).toBeGreaterThan(before); // 1 new job inserted
      void threw; // silence unused warning — success path may or may not redirect
    });

    it("gate checks businessRegImageUrl IS NOT NULL — NOT the verified column (D-39 / Pitfall 3)", async () => {
      // verified=false but businessRegImageUrl is set → should PROCEED
      const { id: userId } = await createTestAdmin();
      const { id: bizId } = await createTestBusinessWithReg({
        userId,
        businessRegImageUrl: "business-reg-docs/reg_check.png",
        verified: false, // intentionally unverified
      });

      const before = await prisma.job.count({
        where: { businessId: bizId },
      });

      const formData = buildJobFormData(bizId);

      try {
        await createJob({} as Parameters<typeof createJob>[0], formData);
      } catch {
        // redirect on success is fine
      }

      const after = await prisma.job.count({
        where: { businessId: bizId },
      });
      // verified=false but image present → should NOT be blocked
      expect(after).toBeGreaterThan(before);
    });
  },
);
