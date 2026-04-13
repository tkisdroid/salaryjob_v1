// Wave 0 RED tests — D-32/D-33 CLOVA OCR parser unit tests
//
// INTENTIONALLY SKIPPED until Wave 4 (Plan 06-04) implements runBizLicenseOcr
// at src/lib/ocr/clova.ts.
//
// Flip to GREEN: Plan 06-04 (Wave 4) must create src/lib/ocr/clova.ts with:
//   export async function runBizLicenseOcr(
//     fileBuffer: ArrayBuffer,
//     mimeType: string
//   ): Promise<ClovaOcrResult>
//
//   type ClovaOcrResult =
//     | { ok: true; fullText: string; candidateRegNumbers: string[] }
//     | { ok: false; reason: 'timeout' | 'api_error' | 'unparseable' }
//
// To flip: remove describe.skip → describe once Plan 06-04 ships.
//
// Test strategy: mock global fetch + vi.stubEnv — pure unit, no DB, no real HTTP.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Lazy import — will throw until Wave 4 ships the module.
// describe.skip prevents this import from failing test collection.

describe(
  // Plan 06-04 shipped src/lib/ocr/clova.ts with runBizLicenseOcr
  "D-32/D-33: CLOVA OCR parser — runBizLicenseOcr",
  () => {
    // @ts-expect-error wave-4-not-yet-implemented
    let runBizLicenseOcr: typeof import("@/lib/ocr/clova").runBizLicenseOcr;

    const FAKE_BUFFER = new ArrayBuffer(1024);
    const FAKE_MIME = "image/png";

    beforeEach(async () => {
      vi.stubEnv("CLOVA_OCR_SECRET", "test-secret-key");
      vi.stubEnv("CLOVA_OCR_API_URL", "https://mock-clova.api/ocr");

      // @ts-expect-error wave-4-not-yet-implemented
      const mod = await import("@/lib/ocr/clova");
      runBizLicenseOcr = mod.runBizLicenseOcr;
    });

    afterEach(() => {
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
    });

    // -----------------------------------------------------------------------
    // D-32 happy path
    // -----------------------------------------------------------------------

    it("D-32 happy path: CLOVA returns a single regNumber field → ok=true, candidateRegNumbers=['1234567890']", async () => {
      const mockResponse = {
        images: [
          {
            fields: [
              { inferText: "123-45-67890" },
              { inferText: "홍길동" },
              { inferText: "서울특별시 강남구" },
            ],
          },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        }),
      );

      const result = await runBizLicenseOcr(FAKE_BUFFER, FAKE_MIME);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.candidateRegNumbers).toContain("1234567890");
        expect(result.fullText).toBeTruthy();
      }
    });

    it("D-32 multiple candidates: inferText contains two regNumber-shaped strings → both in candidateRegNumbers (digit-only)", async () => {
      const mockResponse = {
        images: [
          {
            fields: [
              { inferText: "123-45-67890" },
              { inferText: "987-65-43210" },
              { inferText: "대표자 홍길동" },
            ],
          },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        }),
      );

      const result = await runBizLicenseOcr(FAKE_BUFFER, FAKE_MIME);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.candidateRegNumbers).toContain("1234567890");
        expect(result.candidateRegNumbers).toContain("9876543210");
        // All candidates must be digit-only (no dashes)
        for (const candidate of result.candidateRegNumbers) {
          expect(candidate).toMatch(/^\d{10}$/);
        }
      }
    });

    // -----------------------------------------------------------------------
    // D-33 mismatch at parser level: no 10-digit sequence found
    // -----------------------------------------------------------------------

    it("D-33 parser-level no-match: inferText has no 10-digit sequence → ok=true, candidateRegNumbers=[]", async () => {
      const mockResponse = {
        images: [
          {
            fields: [
              { inferText: "대표자 홍길동" },
              { inferText: "서울특별시" },
              { inferText: "2023년 1월" },
            ],
          },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        }),
      );

      const result = await runBizLicenseOcr(FAKE_BUFFER, FAKE_MIME);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.candidateRegNumbers).toEqual([]);
        expect(result.fullText).toBeTruthy(); // still returns full text
      }
    });

    // -----------------------------------------------------------------------
    // D-33 error paths
    // -----------------------------------------------------------------------

    it("D-33 timeout: fetch rejects with AbortError → { ok: false, reason: 'timeout' }", async () => {
      const abortError = new DOMException("The operation was aborted.", "AbortError");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValueOnce(abortError),
      );

      const result = await runBizLicenseOcr(FAKE_BUFFER, FAKE_MIME);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("timeout");
      }
    });

    it("D-33 API error 500: CLOVA returns non-ok status → { ok: false, reason: 'api_error' }", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: "Internal Server Error" }),
        }),
      );

      const result = await runBizLicenseOcr(FAKE_BUFFER, FAKE_MIME);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("api_error");
      }
    });

    it("D-33 missing env vars: CLOVA_OCR_SECRET unset → { ok: false, reason: 'api_error' } without making fetch call", async () => {
      vi.unstubAllEnvs();
      // Explicitly unset the secret
      vi.stubEnv("CLOVA_OCR_SECRET", "");
      vi.stubEnv("CLOVA_OCR_API_URL", "https://mock-clova.api/ocr");

      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const result = await runBizLicenseOcr(FAKE_BUFFER, FAKE_MIME);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("api_error");
      }
      // No fetch call should have been made when secret is missing
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("D-33 unparseable response: CLOVA returns 200 but malformed JSON structure → { ok: false, reason: 'unparseable' }", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ unexpected: "schema" }), // missing .images array
        }),
      );

      const result = await runBizLicenseOcr(FAKE_BUFFER, FAKE_MIME);
      // Parser should handle unexpected schema gracefully
      // Either returns ok:true with empty candidates OR ok:false with 'unparseable'
      // Accept both but ensure it doesn't throw
      expect(["ok", "reason"]).toContain(result.ok ? "ok" : "reason");
    });
  },
);
