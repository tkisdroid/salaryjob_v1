import Link from "next/link";
import { ArrowLeft, FileText, Percent } from "lucide-react";

export default function BizCommissionSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/biz/settings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm font-semibold">설정으로 돌아가기</span>
      </Link>

      <div className="mt-6 space-y-4">
        {/* Header card */}
        <div className="rounded-2xl border border-border bg-brand/5 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand shrink-0">
              <Percent className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">수수료 안내</h1>
              <p className="text-xs text-muted-foreground mt-1">공고 운영 시 적용되는 기본 비용 기준을 확인합니다.</p>
            </div>
          </div>
        </div>

        {/* 기본 정책 */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold">기본 정책</h2>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            실제 결제 금액과 수수료는 계약 상태, 지급 방식, 프로모션 적용 여부에
            따라 달라질 수 있습니다.
          </p>
        </div>

        {/* 확인 경로 */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand shrink-0 mt-0.5">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">확인 경로</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                개별 공고의 지급액과 인원 수는 공고 상세에서 즉시 확인할 수
                있습니다.
              </p>
              <Link
                href="/biz/posts"
                className="inline-block mt-2 text-xs font-semibold text-brand hover:underline"
              >
                공고 관리 열기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
