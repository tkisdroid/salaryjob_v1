/**
 * Korean mapping for Supabase Auth + Zod validation errors.
 */

const PASSWORD_RULE_MESSAGE =
  "비밀번호는 8자 이상이며 영문과 숫자를 모두 포함해야 합니다.";

export function supabaseAuthErrorToKorean(message: string): string {
  const m = message.toLowerCase();

  if (
    m.includes("password should be at least") ||
    m.includes("password is too short") ||
    (m.includes("password") && m.includes("characters")) ||
    (m.includes("password") && m.includes("weak")) ||
    m.includes("password should contain") ||
    m.includes("password must contain")
  ) {
    return PASSWORD_RULE_MESSAGE;
  }

  if (m.includes("email") && m.includes("invalid")) {
    return "올바른 이메일 주소를 입력해주세요";
  }
  if (
    m.includes("user already registered") ||
    m.includes("already exists") ||
    (m.includes("email") && m.includes("already"))
  ) {
    return "이미 가입된 이메일입니다. 로그인해주세요";
  }

  if (
    m.includes("invalid login credentials") ||
    m.includes("invalid credentials") ||
    m.includes("invalid email or password")
  ) {
    return "이메일 또는 비밀번호가 올바르지 않습니다";
  }
  if (m.includes("email not confirmed")) {
    return "이메일 인증이 아직 완료되지 않았습니다";
  }

  if (m.includes("otp") && m.includes("expired")) {
    return "인증 링크가 만료되었습니다. 다시 요청해주세요";
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요";
  }
  if (m.includes("user not found")) {
    return "등록되지 않은 계정입니다";
  }
  if (m.includes("oauth") || m.includes("provider")) {
    return "소셜 로그인에 실패했습니다. 다시 시도해주세요";
  }

  if (m.includes("network") || m.includes("fetch failed")) {
    return "네트워크 연결을 확인해주세요";
  }
  if (m.includes("session") && m.includes("expired")) {
    return "로그인 세션이 만료되었습니다. 다시 로그인해주세요";
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn("[supabaseAuthErrorToKorean] unmapped message:", message);
  }

  return "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요";
}
