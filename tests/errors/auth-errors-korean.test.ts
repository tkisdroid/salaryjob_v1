/**
 * Regression test: every Supabase/auth error surface must return a Korean
 * string. Never leak raw English to the user.
 */
import { describe, it, expect } from "vitest";
import { supabaseAuthErrorToKorean } from "@/lib/errors/auth-errors";

describe("supabaseAuthErrorToKorean", () => {
  const cases: Array<[string, RegExp]> = [
    ["Password should be at least 8 characters.", /비밀번호.*8자/],
    ["Password is too short", /비밀번호.*8자/],
    ["password should contain one uppercase letter", /비밀번호.*영문.*숫자/],
    ["Password is too weak", /비밀번호.*영문.*숫자/],
    ["Invalid email format", /이메일.*입력/],
    ["User already registered", /이미 가입/],
    ["Invalid login credentials", /이메일.*비밀번호.*올바르지/],
    ["Email not confirmed", /이메일 인증/],
    ["OTP expired", /인증 링크.*만료/],
    ["Rate limit exceeded", /잠시 후/],
    ["User not found", /등록되지 않은/],
    ["OAuth provider error", /소셜 로그인/],
    ["fetch failed", /네트워크/],
    ["Session expired", /세션.*만료/],
  ];

  it.each(cases)(
    "maps %j to a Korean message matching %p",
    (input, expected) => {
      const result = supabaseAuthErrorToKorean(input);
      expect(result).toMatch(expected);
      // Must be Korean — no ASCII letters except punctuation/spaces/digits.
      // Allow numerals and common punctuation, require at least one Hangul char.
      expect(result).toMatch(/[가-힣]/);
    },
  );

  it("returns a Korean fallback for unknown messages instead of leaking English", () => {
    const result = supabaseAuthErrorToKorean("Some totally unexpected error");
    expect(result).toMatch(/[가-힣]/);
    expect(result).not.toMatch(/unexpected/i);
  });
});
