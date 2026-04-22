// Wave 0 RED tests — D-32/D-33 Gemini OCR parser unit tests

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("D-32/D-33: Gemini OCR parser — runBizLicenseOcr", () => {
  let runBizLicenseOcr: typeof import("@/lib/ocr/gemini").runBizLicenseOcr;

  const FAKE_BUFFER = new ArrayBuffer(1024);
  const FAKE_MIME = "image/png";

  beforeEach(async () => {
    vi.stubEnv("GOOGLE_GEMINI_API_KEY", "test-secret-key");

    const mod = await import("@/lib/ocr/gemini");
    runBizLicenseOcr = mod.runBizLicenseOcr;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("D-32 happy path: Gemini returns a single regNumber field → ok=true, candidateRegNumbers=['1234567890']", async () => {
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: "사업자등록번호: 123-45-67890 홍길동 서울특별시 강남구" }]
          }
        }
      ]
    };

    let requestBody: Record<string, unknown> | null = null;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (_input, init) => {
        if (init?.body) requestBody = JSON.parse(init.body as string);
        return {
          ok: true,
          status: 200,
          json: async () => mockResponse,
        };
      }),
    );

    const result = await runBizLicenseOcr(FAKE_BUFFER, FAKE_MIME);
    expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.candidateRegNumbers).toContain("1234567890");
        expect(result.fullText).toBeTruthy();
        expect(result.candidateOwnerNames).toContain("홍길동");
        const reqBody = requestBody as
        | {
            contents?: Array<{
              parts?: Array<{
                inline_data?: {
                  mime_type?: string;
                };
              }>;
            }>;
          }
        | null;
      expect(reqBody?.contents?.[0]?.parts?.[1]?.inline_data?.mime_type).toBe(
        "image/png",
      );
    }
  });

  it("D-32 multiple candidates: inferText contains two regNumber-shaped strings → both in candidateRegNumbers (digit-only)", async () => {
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: "123-45-67890 기타: 987-65-43210 대표자 홍길동" }]
          }
        }
      ]
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
        expect(result.candidateOwnerNames).toContain("홍길동");
        expect(result.candidateRegNumbers).toContain("1234567890");
      expect(result.candidateRegNumbers).toContain("9876543210");
    }
  });

  it("D-32 sends application/pdf mime_type for PDF input", async () => {
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: "사업자등록번호: 123-45-67890" }],
          },
        },
      ],
    };
    let requestBody: Record<string, unknown> | null = null;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (_input, init) => {
        if (init?.body) requestBody = JSON.parse(init.body as string);
        return {
          ok: true,
          status: 200,
          json: async () => mockResponse,
        };
      }),
    );

    const result = await runBizLicenseOcr(FAKE_BUFFER, "application/pdf");
    expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.candidateRegNumbers).toContain("1234567890");
        expect(result.candidateOwnerNames).toEqual([]);
        const reqBody = requestBody as
        | {
            contents?: Array<{
              parts?: Array<{
                inline_data?: {
                  mime_type?: string;
                };
              }>;
            }>;
          }
        | null;
      expect(reqBody?.contents?.[0]?.parts?.[1]?.inline_data?.mime_type).toBe(
        "application/pdf",
      );
    }
  });

  it("D-33 parser-level no-match: inferText has no 10-digit sequence → ok=true, candidateRegNumbers=[]", async () => {
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: "대표자 홍길동 서울특별시 2023년 1월" }]
          }
        }
      ]
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
    }
  });

  it("D-33 timeout: fetch rejects with AbortError → { ok: false, reason: 'timeout' }", async () => {
    const abortError = new DOMException("The operation was aborted.", "AbortError");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(abortError),
    );

    const result = await runBizLicenseOcr(FAKE_BUFFER, FAKE_MIME);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("timeout");
  });

  it("D-33 API error 500: Gemini returns non-ok status → { ok: false, reason: 'api_error' }", async () => {
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
    if (!result.ok) expect(result.reason).toBe("api_error");
  });

  it("D-33 missing env vars: GOOGLE_GEMINI_API_KEY unset → { ok: false, reason: 'missing_api_key' }", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("GOOGLE_GEMINI_API_KEY", "");
    
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await runBizLicenseOcr(FAKE_BUFFER, FAKE_MIME);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing_api_key");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("D-33 unparseable response: Gemini returns 200 but malformed JSON structure → { ok: false, reason: 'unparseable' }", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ unexpected: "schema" }), // missing .candidates array
      }),
    );

    const result = await runBizLicenseOcr(FAKE_BUFFER, FAKE_MIME);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unparseable");
  });
});
