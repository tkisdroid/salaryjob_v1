import { describe, expect, it } from "vitest";
import {
  getNaverSdkBlockedMessage,
  getNaverSdkLoadErrorMessage,
} from "@/lib/hooks/use-naver-maps-sdk";

describe("getNaverSdkBlockedMessage", () => {
  it("blocks random vercel preview origins when app url points elsewhere", () => {
    expect(
      getNaverSdkBlockedMessage({
        currentOrigin: "https://salaryjob-v1-git-feature-123.vercel.app",
        appUrl: "https://www.gignow.kr",
      }),
    ).toContain("Vercel preview 도메인");
  });

  it("allows configured origins even when hosted on vercel", () => {
    expect(
      getNaverSdkBlockedMessage({
        currentOrigin: "https://salaryjob-v1.vercel.app",
        appUrl: "https://salaryjob-v1.vercel.app",
      }),
    ).toBeNull();
  });

  it("allows non-preview origins", () => {
    expect(
      getNaverSdkBlockedMessage({
        currentOrigin: "http://localhost:3000",
        appUrl: "http://localhost:3000",
      }),
    ).toBeNull();
  });
});

describe("getNaverSdkLoadErrorMessage", () => {
  it("includes the current origin when available", () => {
    expect(
      getNaverSdkLoadErrorMessage("https://www.gignow.kr"),
    ).toContain("https://www.gignow.kr");
  });

  it("falls back to a generic setup message without an origin", () => {
    expect(getNaverSdkLoadErrorMessage(null)).toContain("NCP 콘솔");
  });
});
