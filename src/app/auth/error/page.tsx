export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="p-6 text-center">
      <h1 className="text-xl font-bold mb-2">인증 오류</h1>
      <p className="text-muted-foreground">
        {params.error ? decodeURIComponent(params.error) : '알 수 없는 오류가 발생했습니다.'}
      </p>
      <a href="/login" className="inline-block mt-4 text-sm text-brand hover:underline">
        로그인으로 돌아가기 →
      </a>
    </div>
  );
}
