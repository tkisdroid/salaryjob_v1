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
    <div className="mx-auto max-w-md p-6 text-center">
      <div className="rounded-[28px] border border-border-soft bg-surface p-8 shadow-soft-md">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-destructive/10 text-3xl">
          ⚠️
        </div>
        <h1 className="mt-5 text-[22px] font-extrabold tracking-[-0.035em] text-ink">
          인증 오류
        </h1>
        <p className="mt-3 text-[13px] font-medium leading-relaxed text-muted-foreground">
          {message}
        </p>
        <a
          href="/login"
          className="mt-5 inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-[13px] font-bold text-ink transition-colors hover:border-ink hover:bg-surface-2"
        >
          로그인으로 돌아가기 →
        </a>
      </div>
    </div>
  );
}
