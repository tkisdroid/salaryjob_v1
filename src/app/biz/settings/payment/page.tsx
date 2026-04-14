import Link from "next/link";
import { ArrowLeft, CreditCard, FileText, Landmark } from "lucide-react";

export default function BizPaymentSettingsPage() {
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
        {/* Title card */}
        <div className="rounded-2xl border border-border bg-brand/5 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand shrink-0">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">결제 수단 관리</h1>
              <p className="text-xs text-muted-foreground mt-1">정산 계좌와 결제 관련 안내를 확인합니다.</p>
            </div>
          </div>
        </div>

        {/* 정산 계좌 */}
        <div className="rounded-2xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand shrink-0 mt-0.5">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">정산 계좌</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                사업자 프로필과 연결된 정산 계좌 정보를 고객센터에서 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* 정산 내역 보기 */}
        <div className="rounded-2xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand shrink-0 mt-0.5">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">정산 내역 보기</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                공고별 지급 내역은 정산 페이지에서 바로 확인할 수 있습니다.
              </p>
              <Link
                href="/biz/settlements"
                className="inline-block mt-2 text-xs font-semibold text-brand hover:underline"
              >
                정산 페이지 열기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
