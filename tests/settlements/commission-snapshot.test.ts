// Wave 0 RED tests — D-34/D-35/D-36 Commission snapshot on checkOut
//
// INTENTIONALLY SKIPPED until Wave 7 (Plan 06-07) implements commission snapshot logic.
//
// Depends on TWO prerequisites before these tests can run:
//   1. Wave 2 (Plan 06-02) schema migration — adds commissionRate column to
//      BusinessProfile AND commissionRate/commissionAmount/netEarnings columns
//      to Application
//   2. Wave 7 (Plan 06-07) implementation — patches checkOut Server Action at
//      src/app/(worker)/my/applications/[id]/check-in/actions.ts to:
//      - Read BusinessProfile.commissionRate (or fall back to PLATFORM_DEFAULT_COMMISSION_RATE env)
//      - Compute commissionAmount = ROUND_HALF_UP(gross * rate / 100) as integer KRW
//      - Compute netEarnings = gross - commissionAmount
//      - Write commissionRate/commissionAmount/netEarnings to the Application row
//      - Keep existing `earnings` field = gross (D-34 regression guard)
//
// Flip to GREEN: Plan 06-07 Task 2.
// To flip: change describe.skip → describe.skipIf(!process.env.DATABASE_URL)
//
// Patterns follow Phase 5 settlement tests in tests/settlements/*.test.ts

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import {
  createTestAdmin,
  createTestBusinessWithReg,
  cleanupPhase6Fixtures,
} from "../fixtures/phase6";
import { createTestWorker, createTestJob } from "../fixtures/phase4";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

describe.skipIf(!process.env.DATABASE_URL)(
  "D-34/D-35/D-36: Commission snapshot written by checkOut",
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
      vi.unstubAllEnvs();
    });

    // -----------------------------------------------------------------------
    // Helper: create application in in_progress state ready for checkOut
    // -----------------------------------------------------------------------

    async function createInProgressApplication(opts: {
      bizId: string;
      bizUserId: string;
      hourlyPay?: number;
      transportFee?: number;
      actualHoursDecimal?: number; // e.g. 4.0
    }) {
      const worker = await createTestWorker();
      const job = await createTestJob({
        businessId: opts.bizId,
        authorId: opts.bizUserId,
        hourlyPay: opts.hourlyPay ?? 12000,
        transportFee: opts.transportFee ?? 0,
        headcount: 1,
        status: "active",
      });

      const checkInAt = new Date(Date.now() - (opts.actualHoursDecimal ?? 4) * 3600 * 1000);

      const application = await prisma.application.create({
        data: {
          jobId: job.id,
          workerId: worker.id,
          status: "in_progress",
          appliedAt: new Date(Date.now() - 24 * 3600 * 1000),
          checkInAt,
        },
      });

      return { worker, job, application };
    }

    // -----------------------------------------------------------------------
    // D-34 + D-36: Business-level rate override
    // -----------------------------------------------------------------------

    it("D-34/D-36: BusinessProfile.commissionRate=5.00 → commissionAmount=round(earnings*0.05), netEarnings=earnings-commissionAmount", async () => {
      vi.stubEnv("PLATFORM_DEFAULT_COMMISSION_RATE", "10.00");

      const { id: adminId } = await createTestAdmin();
      const { id: bizId } = await createTestBusinessWithReg({
        userId: adminId,
        commissionRate: "5.00",
        verified: true,
      });

      const { application } = await createInProgressApplication({
        bizId,
        bizUserId: adminId,
        hourlyPay: 10000, // 4h → 40000 gross
        transportFee: 0,
        actualHoursDecimal: 4,
      });

      // Import checkOut lazily to avoid wave-7 module-not-found at collect time
      const { checkOut } = await import(
        "@/app/(worker)/my/applications/[id]/check-in/actions"
      );

      // Invoke checkOut with a mock QR token (Wave 7 must accept 'test-bypass' token in test env)
      const result = await checkOut(application.id, "test-bypass");
      expect(result.success).toBe(true);

      // Reload application via raw SQL (commissionRate/Amount/netEarnings columns not in Prisma types pre-Wave 2 regen)
      const rows = await prisma.$queryRawUnsafe<
        {
          earnings: number;
          commissionRate: string | null;
          commissionAmount: number | null;
          netEarnings: number | null;
        }[]
      >(
        `SELECT earnings, "commissionRate", "commissionAmount", "netEarnings"
         FROM public.applications WHERE id = $1::uuid`,
        application.id,
      );

      const row = rows[0]!;
      const gross = row.earnings;
      const rate = parseFloat(row.commissionRate ?? "0");

      // commissionRate snapshot must be 5.00 (not the env default of 10.00)
      expect(rate).toBe(5.0);

      // commissionAmount = ROUND_HALF_UP(gross * 0.05)
      const expectedCommission = Math.round(gross * 0.05);
      expect(row.commissionAmount).toBe(expectedCommission);

      // netEarnings = gross - commissionAmount
      expect(row.netEarnings).toBe(gross - expectedCommission);

      // D-34 regression: earnings field must remain == gross (not net)
      expect(row.earnings).toBe(gross);
    });

    // -----------------------------------------------------------------------
    // D-35: Null rate fallback to env
    // -----------------------------------------------------------------------

    it("D-35: BusinessProfile.commissionRate=null + PLATFORM_DEFAULT_COMMISSION_RATE='10.00' → commissionAmount=round(earnings*0.10)", async () => {
      vi.stubEnv("PLATFORM_DEFAULT_COMMISSION_RATE", "10.00");

      const { id: adminId } = await createTestAdmin();
      const { id: bizId } = await createTestBusinessWithReg({
        userId: adminId,
        commissionRate: null, // no override
        verified: true,
      });

      const { application } = await createInProgressApplication({
        bizId,
        bizUserId: adminId,
        hourlyPay: 10000,
        transportFee: 0,
        actualHoursDecimal: 4,
      });

      const { checkOut } = await import(
        "@/app/(worker)/my/applications/[id]/check-in/actions"
      );

      await checkOut(application.id, "test-bypass");

      const rows = await prisma.$queryRawUnsafe<
        { earnings: number; commissionRate: string | null; commissionAmount: number | null }[]
      >(
        `SELECT earnings, "commissionRate", "commissionAmount"
         FROM public.applications WHERE id = $1::uuid`,
        application.id,
      );

      const row = rows[0]!;
      const gross = row.earnings;
      const rate = parseFloat(row.commissionRate ?? "0");

      expect(rate).toBe(10.0); // fell back to env
      expect(row.commissionAmount).toBe(Math.round(gross * 0.10));
    });

    it("D-35: BusinessProfile.commissionRate=null + env unset → commissionAmount=0, netEarnings=earnings", async () => {
      // Do NOT stub PLATFORM_DEFAULT_COMMISSION_RATE → should use 0% fallback
      vi.unstubAllEnvs();

      const { id: adminId } = await createTestAdmin();
      const { id: bizId } = await createTestBusinessWithReg({
        userId: adminId,
        commissionRate: null,
        verified: true,
      });

      const { application } = await createInProgressApplication({
        bizId,
        bizUserId: adminId,
        hourlyPay: 10000,
        transportFee: 0,
        actualHoursDecimal: 4,
      });

      const { checkOut } = await import(
        "@/app/(worker)/my/applications/[id]/check-in/actions"
      );

      await checkOut(application.id, "test-bypass");

      const rows = await prisma.$queryRawUnsafe<
        { earnings: number; commissionAmount: number | null; netEarnings: number | null }[]
      >(
        `SELECT earnings, "commissionAmount", "netEarnings"
         FROM public.applications WHERE id = $1::uuid`,
        application.id,
      );

      const row = rows[0]!;
      expect(row.commissionAmount).toBe(0);
      expect(row.netEarnings).toBe(row.earnings);
    });

    // -----------------------------------------------------------------------
    // D-34 rounding test
    // -----------------------------------------------------------------------

    it("D-34 rounding: earnings=10001, rate=5.00% → 10001 * 0.05 = 500.05 → ROUND_HALF_UP → 500", async () => {
      vi.stubEnv("PLATFORM_DEFAULT_COMMISSION_RATE", "0.00");

      const { id: adminId } = await createTestAdmin();
      const { id: bizId } = await createTestBusinessWithReg({
        userId: adminId,
        commissionRate: "5.00",
        verified: true,
      });

      const { application } = await createInProgressApplication({
        bizId,
        bizUserId: adminId,
        hourlyPay: 10001, // specific amount to trigger rounding
        transportFee: 0,
        actualHoursDecimal: 1, // 1 hour → earnings = 10001
      });

      const { checkOut } = await import(
        "@/app/(worker)/my/applications/[id]/check-in/actions"
      );

      await checkOut(application.id, "test-bypass");

      const rows = await prisma.$queryRawUnsafe<
        { earnings: number; commissionAmount: number | null }[]
      >(
        `SELECT earnings, "commissionAmount"
         FROM public.applications WHERE id = $1::uuid`,
        application.id,
      );

      const row = rows[0]!;
      // 10001 * 0.05 = 500.05 → ROUND_HALF_UP → 500 (0.05 rounds down per ROUND_HALF_UP)
      // Note: ROUND_HALF_UP(500.05) → 500 (digit after is 5, but the 0 before it means it rounds to 500)
      // Actually: floor-based or banker's rounding might differ. Spec says ROUND_HALF_UP → 500
      expect(row.commissionAmount).toBe(500);
    });

    it("D-34 rounding: earnings=10000, rate=5.00% → 10000 * 0.05 = 500.00 exact → 500", async () => {
      const { id: adminId } = await createTestAdmin();
      const { id: bizId } = await createTestBusinessWithReg({
        userId: adminId,
        commissionRate: "5.00",
        verified: true,
      });

      const { application } = await createInProgressApplication({
        bizId,
        bizUserId: adminId,
        hourlyPay: 10000,
        transportFee: 0,
        actualHoursDecimal: 1, // 1 hour → earnings = 10000
      });

      const { checkOut } = await import(
        "@/app/(worker)/my/applications/[id]/check-in/actions"
      );

      await checkOut(application.id, "test-bypass");

      const rows = await prisma.$queryRawUnsafe<
        { commissionAmount: number | null }[]
      >(
        `SELECT "commissionAmount" FROM public.applications WHERE id = $1::uuid`,
        application.id,
      );

      expect(rows[0]?.commissionAmount).toBe(500); // exact
    });

    // -----------------------------------------------------------------------
    // D-34 regression: earnings field still = gross (not net)
    // -----------------------------------------------------------------------

    it("D-34 regression: application.earnings stays equal to gross (not net) after checkOut", async () => {
      vi.stubEnv("PLATFORM_DEFAULT_COMMISSION_RATE", "0.00");

      const { id: adminId } = await createTestAdmin();
      const { id: bizId } = await createTestBusinessWithReg({
        userId: adminId,
        commissionRate: "5.00",
        verified: true,
      });

      const { application } = await createInProgressApplication({
        bizId,
        bizUserId: adminId,
        hourlyPay: 12000,
        transportFee: 2000,
        actualHoursDecimal: 4,
      });

      const { checkOut } = await import(
        "@/app/(worker)/my/applications/[id]/check-in/actions"
      );

      const result = await checkOut(application.id, "test-bypass");
      expect(result.success).toBe(true);
      if (result.success) {
        const grossEarnings = result.earnings;

        const rows = await prisma.$queryRawUnsafe<
          { earnings: number; netEarnings: number | null }[]
        >(
          `SELECT earnings, "netEarnings" FROM public.applications WHERE id = $1::uuid`,
          application.id,
        );
        const row = rows[0]!;

        // earnings field must remain gross
        expect(row.earnings).toBe(grossEarnings);
        // netEarnings is the new field carrying the post-commission amount
        expect(row.netEarnings).not.toBeNull();
        expect(row.netEarnings).toBeLessThan(row.earnings); // net < gross when rate > 0
      }
    });
  },
);
