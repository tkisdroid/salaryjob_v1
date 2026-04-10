// RED BASELINE (Wave 0): until Plan 04-05 implements signCheckoutToken/verifyCheckoutToken.
// REQ: SHIFT-02 — 체크아웃 QR payload는 jose HS256으로 서명되며 4가지 공격을 거부해야 한다.

import { describe, it, expect, beforeAll } from "vitest";
import { signCheckoutToken, verifyCheckoutToken } from "@/lib/qr";

describe("SHIFT-02 checkout QR JWT (jose HS256)", () => {
  beforeAll(() => {
    process.env.APPLICATION_JWT_SECRET =
      "test-secret-32bytes-hex-placeholder-padding-9999";
  });

  it("verifies a valid token signed with HS256", async () => {
    const token = await signCheckoutToken({
      jobId: "11111111-1111-1111-1111-111111111111",
      businessId: "22222222-2222-2222-2222-222222222222",
      nonce: "abc",
      ttlSeconds: 300,
    });
    const payload = await verifyCheckoutToken(token);
    expect(payload.jobId).toBe("11111111-1111-1111-1111-111111111111");
    expect(payload.businessId).toBe("22222222-2222-2222-2222-222222222222");
    expect(payload.nonce).toBe("abc");
  });

  it("rejects an expired token", async () => {
    const token = await signCheckoutToken({
      jobId: "11111111-1111-1111-1111-111111111111",
      businessId: "22222222-2222-2222-2222-222222222222",
      nonce: "abc",
      ttlSeconds: -60,
    });
    await expect(verifyCheckoutToken(token)).rejects.toThrow();
  });

  it("rejects a tampered signature", async () => {
    const token = await signCheckoutToken({
      jobId: "11111111-1111-1111-1111-111111111111",
      businessId: "22222222-2222-2222-2222-222222222222",
      nonce: "abc",
      ttlSeconds: 300,
    });
    // Flip last char of signature segment
    const parts = token.split(".");
    const sig = parts[2];
    const flipped = sig.slice(0, -1) + (sig.slice(-1) === "A" ? "B" : "A");
    const tampered = `${parts[0]}.${parts[1]}.${flipped}`;
    await expect(verifyCheckoutToken(tampered)).rejects.toThrow();
  });

  it("rejects alg=none confusion attack", async () => {
    // Manually craft a none-alg token
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }))
      .toString("base64url");
    const body = Buffer.from(
      JSON.stringify({
        jobId: "11111111-1111-1111-1111-111111111111",
        businessId: "22222222-2222-2222-2222-222222222222",
        nonce: "abc",
        exp: Math.floor(Date.now() / 1000) + 300,
      }),
    ).toString("base64url");
    const noneToken = `${header}.${body}.`;
    await expect(verifyCheckoutToken(noneToken)).rejects.toThrow();
  });
});
