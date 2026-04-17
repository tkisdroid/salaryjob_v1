import { describe, expect, it } from "vitest";
import {
  getKakaoSdkBlockedMessage,
  getKakaoSdkLoadErrorMessage,
} from "@/lib/hooks/use-kakao-maps-sdk";

describe("getKakaoSdkBlockedMessage", () => {
  it("blocks random vercel preview origins when app url points elsewhere", () => {
    expect(
      getKakaoSdkBlockedMessage({
        currentOrigin: "https://salaryjob-v1-git-feature-123.vercel.app",
        appUrl: "https://www.gignow.kr",
      }),
    ).toContain("Vercel preview 도메인");
  });

  it("allows configured origins even when hosted on vercel", () => {
    expect(
      getKakaoSdkBlockedMessage({
        currentOrigin: "https://salaryjob-v1.vercel.app",
        appUrl: "https://salaryjob-v1.vercel.app",
      }),
    ).toBeNull();
  });

  it("allows non-preview origins", () => {
    expect(
      getKakaoSdkBlockedMessage({
        currentOrigin: "http://localhost:3000",
        appUrl: "http://localhost:3000",
      }),
    ).toBeNull();
  });
});

describe("getKakaoSdkLoadErrorMessage", () => {
  it("includes the current origin when available", () => {
    expect(
      getKakaoSdkLoadErrorMessage("https://www.gignow.kr"),
    ).toContain("https://www.gignow.kr");
  });

  it("falls back to a generic setup message without an origin", () => {
    expect(getKakaoSdkLoadErrorMessage(null)).toContain("카카오 개발자 콘솔");
  });
});
