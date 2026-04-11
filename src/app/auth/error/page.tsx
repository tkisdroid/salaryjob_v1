import { supabaseAuthErrorToKorean } from "@/lib/errors/auth-errors";

export default async function AuthErrorPage({
  searchParams,
}: {
  // OAuth + magic-link actions pass `reason=`; legacy callers may still use
  // `error=`. Accept both and always translate through the Korean mapper so
  // no raw English string ever lands on the page.
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const raw = params.reason ?? params.error;
  const message = raw
    ? supabaseAuthErrorToKorean(decodeURIComponent(raw))
    : "알 수 없는 오류가 발생했습니다";

  return (
    <div className="p-6 text-center">
      <h1 className="text-xl font-bold mb-2">인증 오류</h1>
      <p className="text-muted-foreground">{message}</p>
      <a
        href="/login"
        className="inline-block mt-4 text-sm text-brand hover:underline"
      >
        로그인으로 돌아가기 →
      </a>
    </div>
  );
}
