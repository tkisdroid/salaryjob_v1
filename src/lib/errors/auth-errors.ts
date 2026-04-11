/**
 * Korean mapping for Supabase Auth + Zod validation errors.
 *
 * Problem: Supabase returns raw English strings like "Password should be
 * at least 6 characters." or "Invalid login credentials", and Zod's default
 * messages are also English. The app is Korean-only, so every user-facing
 * error must be translated before it reaches the form.
 *
 * Strategy:
 *   1. Recognize Supabase error messages by stable substrings (their string
 *      content is the public contract — code names are not stable on the
 *      auth API) and return the Korean equivalent.
 *   2. For anything we do not recognize, return a generic Korean fallback
 *      instead of the raw English string — the worst case is vague but
 *      never English.
 */

/**
 * Map a Supabase auth error.message to a Korean user-facing string.
 * Never returns the original English text — unknown errors get a safe
 * generic fallback.
 */
export function supabaseAuthErrorToKorean(message: string): string {
  const m = message.toLowerCase();

  // --- Password strength / length (signup) ---------------------------------
  if (
    m.includes("password should be at least") ||
    m.includes("password is too short") ||
    (m.includes("password") && m.includes("characters"))
  ) {
    return "비밀번호는 최소 8자 이상이어야 합니다";
  }
  if (
    (m.includes("password") && m.includes("weak")) ||
    m.includes("password should contain")
  ) {
    return "비밀번호가 너무 약합니다. 영문/숫자/기호를 섞어주세요";
  }

  // --- Email format / already registered -----------------------------------
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

  // --- Login credentials ---------------------------------------------------
  if (
    m.includes("invalid login credentials") ||
    m.includes("invalid credentials") ||
    m.includes("invalid email or password")
  ) {
    return "이메일 또는 비밀번호가 올바르지 않습니다";
  }
  if (m.includes("email not confirmed")) {
    return "이메일 인증이 완료되지 않았습니다. 받은편지함을 확인해주세요";
  }

  // --- OTP / magic link / OAuth --------------------------------------------
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

  // --- Session / network ---------------------------------------------------
  if (m.includes("network") || m.includes("fetch failed")) {
    return "네트워크 연결을 확인해주세요";
  }
  if (m.includes("session") && m.includes("expired")) {
    return "세션이 만료되었습니다. 다시 로그인해주세요";
  }

  // --- Fallback ------------------------------------------------------------
  // Never leak English. Log the original for devs and return a generic KR string.
  if (process.env.NODE_ENV !== "production") {
    console.warn("[supabaseAuthErrorToKorean] unmapped message:", message);
  }
  return "요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요";
}
