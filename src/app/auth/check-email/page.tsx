// Server Component — no client JS needed. Plain landing page displayed after
// signup / magic link request, instructing the user to check their inbox.
export default function CheckEmailPage() {
  return (
    <div className="mx-auto max-w-md p-6 text-center">
      <div className="rounded-[28px] border border-border-soft bg-surface p-8 shadow-soft-md">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-3xl">
          📮
        </div>
        <h1 className="mt-5 text-[22px] font-extrabold tracking-[-0.035em] text-ink">
          이메일을 확인해 주세요
        </h1>
        <p className="mt-3 text-[13px] font-medium leading-relaxed text-muted-foreground">
          가입 확인 링크를 이메일로 보냈습니다.
          <br />
          메일함을 확인해 주세요.
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
