// Server Component — no client JS needed. Plain landing page displayed after
// signup / magic link request, instructing the user to check their inbox.
export default function CheckEmailPage() {
  return (
    <div className="max-w-md mx-auto p-6 text-center space-y-4">
      <h1 className="text-2xl font-bold">이메일을 확인해 주세요</h1>
      <p className="text-muted-foreground">
        가입 확인 링크를 이메일로 보냈습니다. 메일함을 확인해 주세요.
      </p>
      <a
        href="/login"
        className="inline-block mt-4 text-sm text-brand hover:underline"
      >
        로그인으로 돌아가기 →
      </a>
    </div>
  );
}
