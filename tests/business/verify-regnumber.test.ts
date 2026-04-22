// Wave 0 RED tests — D-30 business registration number validation
//
// D-30 block: INTENTIONALLY RED until Wave 6 (Plan 06-06 Task 1) ships
// the verifyBusinessRegNumber Server Action.
//
// Flip to GREEN: Plan 06-06 Task 1 must implement:
//   - Server Action `verifyBusinessRegNumber(formData)` at
//     src/app/biz/signup/actions.ts (or biz/verify/actions.ts)
//   - Valid 10-digit format (NNN-NN-NNNNN) → writes businessRegNumber (digit-only)
//     WITHOUT setting verified=true (OCR match is the only auto-verification path)
//   - Invalid format → returns field error, no DB write
//   - Duplicate regNumber across distinct businesses is ALLOWED (no uniqueness per D-30)
//
// D-33 block: SKIPPED — flips in Wave 4 (Plan 06-06 Task 2) once:
//   1. Wave 2 schema migration adds regNumberOcrMismatched column
//   2. Plan 06-06 Task 2 implements uploadBusinessRegImage Server Action
//      at src/app/biz/verify/actions.ts

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { createTestAdmin, createTestBusinessWithReg, cleanupPhase6Fixtures } from "../fixtures/phase6";
import { skipIfNoSupabase } from "../helpers/skip-if-no-supabase";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// D-30: Registration number format validation (RED — Plan 06-06 Task 1)
// ---------------------------------------------------------------------------

describe.skipIf(skipIfNoSupabase())(
  "D-30: Business registration number format validation",
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

    it("valid format '123-45-67890' → writes digit-only regNumber without auto-verifying", async () => {
      const { verifyBusinessRegNumber } = await import(
        "@/app/biz/signup/actions"
      );

      const { id: adminId } = await createTestAdmin();
      const { id: bizId } = await createTestBusinessWithReg({
        userId: adminId,
        verified: false,
      });

      const formData = new FormData();
      formData.set("businessId", bizId);
      formData.set("regNumber", "123-45-67890");

      const result = await verifyBusinessRegNumber(formData);
      expect(result.success).toBe(true);

      const row = await prisma.$queryRawUnsafe<
        { businessRegNumber: string; verified: boolean }[]
      >(
        `SELECT "businessRegNumber", verified FROM public.business_profiles WHERE id = $1::uuid`,
        bizId,
      );
      expect(row[0]?.businessRegNumber).toBe("1234567890"); // digit-only
      expect(row[0]?.verified).toBe(false);
    });

    it("invalid format 'abc-12-34567' → returns field error, no DB write, verified stays false", async () => {
      const { verifyBusinessRegNumber } = await import(
        "@/app/biz/signup/actions"
      );

      const { id: adminId } = await createTestAdmin();
      const { id: bizId } = await createTestBusinessWithReg({
        userId: adminId,
        verified: false,
        regNumber: null,
      });

      const formData = new FormData();
      formData.set("businessId", bizId);
      formData.set("regNumber", "abc-12-34567");

      const result = await verifyBusinessRegNumber(formData);
      expect(result.success).toBe(false);
      expect('error' in result && result.error).toBeTruthy(); // some field error message

      const row = await prisma.$queryRawUnsafe<
        { businessRegNumber: string | null; verified: boolean }[]
      >(
        `SELECT "businessRegNumber", verified FROM public.business_profiles WHERE id = $1::uuid`,
        bizId,
      );
      expect(row[0]?.businessRegNumber).toBeNull();
      expect(row[0]?.verified).toBe(false);
    });

    it("duplicate format-valid regNumber across distinct businesses → both accepted (no uniqueness per D-30)", async () => {
      const { verifyBusinessRegNumber } = await import(
        "@/app/biz/signup/actions"
      );

      const { id: admin1 } = await createTestAdmin({ email: `admin-dup1-${Date.now()}@test.local` });

      const { id: biz1 } = await createTestBusinessWithReg({
        userId: admin1,
        verified: false,
      });
      const { id: biz2 } = await createTestBusinessWithReg({
        userId: admin1,
        verified: false,
      });

      const formData1 = new FormData();
      formData1.set("businessId", biz1);
      formData1.set("regNumber", "123-45-67890");

      const formData2 = new FormData();
      formData2.set("businessId", biz2);
      formData2.set("regNumber", "123-45-67890");

      const result1 = await verifyBusinessRegNumber(formData1);
      const result2 = await verifyBusinessRegNumber(formData2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  },
);

// ---------------------------------------------------------------------------
// D-33: OCR mismatch integration — image still saved, flag set
// TODO(wave-4): flip describe.skip → describe once Plan 06-06 Task 2 lands
// (Wave 2 schema must have regNumberOcrMismatched column; Wave 4 has uploadBusinessRegImage action)
// ---------------------------------------------------------------------------

describe(
  "D-33: OCR mismatch — image still saved, regNumberOcrMismatched flag written",
  () => {
    // Mock the OCR module before imports resolve
    vi.mock("@/lib/ocr/gemini", () => ({
      hasGeminiApiKey: vi.fn(() => Boolean(process.env.GOOGLE_GEMINI_API_KEY?.trim())),
      runBizLicenseOcr: vi.fn(),
    }));
    vi.mock("@/lib/biz-verification", () => ({
      verifyBusinessStatus: vi.fn(),
    }));
    vi.mock("@/lib/supabase/storage-biz-reg", () => ({
      uploadBusinessRegFile: vi.fn(
        async (_file: File, opts: { userId: string; businessId: string }) => {
          const ext =
            _file.type === 'application/pdf'
              ? 'pdf'
              : _file.type === 'image/jpeg'
                ? 'jpg'
                : 'png'

          return {
            ok: true as const,
            path: `${opts.userId}/${opts.businessId}.${ext}`,
          }
        },
      ),
    }));

    beforeAll(async () => {
      await cleanupPhase6Fixtures();
    });
    afterAll(async () => {
      await cleanupPhase6Fixtures();
      await prisma.$disconnect();
    });
    beforeEach(async () => {
      vi.stubEnv("GOOGLE_GEMINI_API_KEY", "test-secret-key");
      await cleanupPhase6Fixtures();
      vi.clearAllMocks();
    });
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.clearAllMocks();
    });

    it("OCR returns non-matching candidate → regNumberOcrMismatched=true, image URL set, verified unchanged", async () => {
      const { runBizLicenseOcr } = await import("@/lib/ocr/gemini");
      const { processBusinessRegOcr } = await import("@/lib/ocr/business-reg-processor");
      vi.mocked(runBizLicenseOcr).mockResolvedValueOnce({
        ok: true,
        fullText: "some scan text 9999 9999 9999",
        candidateRegNumbers: ["9999999999"], // non-matching
      });

      const { verifyBusinessStatus } = await import("@/lib/biz-verification");
      vi.mocked(verifyBusinessStatus).mockResolvedValueOnce({
        ok: false,
        reason: "closed",
      });

      // uploadBusinessRegImage is at src/app/biz/verify/actions.ts (Plan 06-06 Task 2)
      const { uploadBusinessRegImage } = await import(
        "@/app/biz/verify/actions"
      );

      const { id: adminId } = await createTestAdmin();
      const { id: bizId } = await createTestBusinessWithReg({
        userId: adminId,
        regNumber: "1234567890",
        verified: false,
      });

      // Build a minimal ~1KB fake PNG file
      const fakeBytes = new Uint8Array(1024).fill(0x89); // not a real PNG but bypasses size gate
      const file = new File([fakeBytes], "reg.png", { type: "image/png" });

      const formData = new FormData();
      formData.set("file", file);
      formData.set("businessId", bizId);

      const result = await uploadBusinessRegImage(formData);
      expect(result.ok).toBe(true);
      expect(result.ok && result.ocr).toBe("queued");

      // Reload via raw SQL — column may not be in Prisma types pre-Wave 2 regen
      const rows = await prisma.$queryRawUnsafe<
        {
          regNumberOcrMismatched: boolean;
          businessRegImageUrl: string | null;
          verified: boolean;
          updatedAt: Date;
        }[]
      >(
          `SELECT "regNumberOcrMismatched", "businessRegImageUrl", verified, "updatedAt"
         FROM public.business_profiles WHERE id = $1::uuid`,
        bizId,
      );

      expect(rows[0]?.businessRegImageUrl).toBeTypeOf("string");
      expect(rows[0]?.businessRegImageUrl).toContain(`.png`);

      const processingResult = await processBusinessRegOcr({
        businessId: bizId,
        uploadedPath: rows[0]!.businessRegImageUrl ?? "",
        uploadedAt: rows[0]!.updatedAt,
        fileBuffer: await file.arrayBuffer(),
        mimeType: file.type,
      });

      expect(processingResult).toBe("mismatched");

      const rowsAfter = await prisma.$queryRawUnsafe<
        {
          regNumberOcrMismatched: boolean;
          businessRegImageUrl: string | null;
          verified: boolean;
        }[]
      >(
        `SELECT "regNumberOcrMismatched", "businessRegImageUrl", verified
         FROM public.business_profiles WHERE id = $1::uuid`,
        bizId,
      );

      expect(rowsAfter[0]?.regNumberOcrMismatched).toBe(true);
      expect(rowsAfter[0]?.businessRegImageUrl).not.toBeNull();
      expect(rowsAfter[0]?.verified).toBe(false); // unchanged despite mismatch
    });

    it("OCR returns matching candidate → regNumberOcrMismatched=false, image URL set", async () => {
      const { runBizLicenseOcr } = await import("@/lib/ocr/gemini");
      const { processBusinessRegOcr } = await import("@/lib/ocr/business-reg-processor");
      vi.mocked(runBizLicenseOcr).mockResolvedValueOnce({
        ok: true,
        fullText: "사업자등록번호 1234567890",
        candidateRegNumbers: ["1234567890"], // matching
      });

      const { verifyBusinessStatus } = await import("@/lib/biz-verification");
      vi.mocked(verifyBusinessStatus).mockResolvedValueOnce({
        ok: true,
        status: "operating"
      });

      const { uploadBusinessRegImage } = await import(
        "@/app/biz/verify/actions"
      );

      const { id: adminId } = await createTestAdmin();
      const { id: bizId } = await createTestBusinessWithReg({
        userId: adminId,
        regNumber: "1234567890",
        verified: true,
      });

      const fakeBytes = new Uint8Array(1024).fill(0x89);
      const file = new File([fakeBytes], "reg.png", { type: "image/png" });

      const formData = new FormData();
      formData.set("file", file);
      formData.set("businessId", bizId);

      const result = await uploadBusinessRegImage(formData);
      expect(result.ok).toBe(true);
      expect(result.ok && result.ocr).toBe("queued");

      const beforeRows = await prisma.$queryRawUnsafe<
        {
          regNumberOcrMismatched: boolean;
          businessRegImageUrl: string | null;
          updatedAt: Date;
        }[]
      >(
        `SELECT "regNumberOcrMismatched", "businessRegImageUrl", "updatedAt"
         FROM public.business_profiles WHERE id = $1::uuid`,
        bizId,
      );

      expect(beforeRows[0]?.businessRegImageUrl).toBeTypeOf("string");
      expect(beforeRows[0]?.businessRegImageUrl).toContain(`.png`);

      const processingResult = await processBusinessRegOcr({
        businessId: bizId,
        uploadedPath: beforeRows[0]!.businessRegImageUrl ?? "",
        uploadedAt: beforeRows[0]!.updatedAt,
        fileBuffer: await file.arrayBuffer(),
        mimeType: file.type,
      });

      expect(processingResult).toBe("matched");

      const rows = await prisma.$queryRawUnsafe<
        {
          regNumberOcrMismatched: boolean;
          businessRegImageUrl: string | null;
          verified: boolean;
        }[]
      >(
        `SELECT "regNumberOcrMismatched", "businessRegImageUrl"
         , verified
         FROM public.business_profiles WHERE id = $1::uuid`,
        bizId,
      );

      expect(rows[0]?.regNumberOcrMismatched).toBe(false);
      expect(rows[0]?.businessRegImageUrl).not.toBeNull();
      expect(rows[0]?.verified).toBe(true);
    });

    it("PDF 업로드 시 파일 경로가 .pdf로 저장되고 ocr은 queued로 반환됨", async () => {
      vi.unstubAllEnvs();
      vi.stubEnv("GOOGLE_GEMINI_API_KEY", "test-secret-key");

      const { uploadBusinessRegImage } = await import(
        "@/app/biz/verify/actions"
      );

      const { id: adminId } = await createTestAdmin();
      const { id: bizId } = await createTestBusinessWithReg({
        userId: adminId,
        regNumber: "1234567890",
        verified: false,
      });

      const fakeBytes = new Uint8Array(1024).fill(0x89);
      const file = new File([fakeBytes], "reg.pdf", { type: "application/pdf" });

      const formData = new FormData();
      formData.set("file", file);
      formData.set("businessId", bizId);

      const result = await uploadBusinessRegImage(formData);
      expect(result.ok).toBe(true);
      expect(result.ok && result.ocr).toBe("queued");

      const rows = await prisma.$queryRawUnsafe<
        {
          businessRegImageUrl: string | null;
        }[]
      >(
        `SELECT "businessRegImageUrl"
         FROM public.business_profiles WHERE id = $1::uuid`,
        bizId,
      );

      expect(rows[0]?.businessRegImageUrl).toContain(".pdf");
    });

    it("GOOGLE_GEMINI_API_KEY 미설정이면 OCR 스킵 이유가 반환됨", async () => {
      vi.unstubAllEnvs();
      vi.stubEnv("GOOGLE_GEMINI_API_KEY", "");

      const { runBizLicenseOcr } = await import("@/lib/ocr/gemini");
      const { uploadBusinessRegImage } = await import(
        "@/app/biz/verify/actions"
      );

      const { id: adminId } = await createTestAdmin();
      const { id: bizId } = await createTestBusinessWithReg({
        userId: adminId,
        regNumber: "1234567890",
        verified: false,
      });

      const fakeBytes = new Uint8Array(1024).fill(0x89);
      const file = new File([fakeBytes], "reg.png", { type: "image/png" });

      const formData = new FormData();
      formData.set("file", file);
      formData.set("businessId", bizId);

      const result = await uploadBusinessRegImage(formData);
      expect(result.ok).toBe(true);
      expect(result.ok && result.ocr).toBe("skipped");
      if (result.ok) {
        expect(result.ocrSkipReason).toBe("missing_api_key");
      }
      expect(vi.mocked(runBizLicenseOcr)).not.toHaveBeenCalled();
    });
  },
);
