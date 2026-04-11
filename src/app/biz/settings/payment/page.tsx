import Link from "next/link";
import { ArrowLeft, CreditCard, Landmark, Wallet } from "lucide-react";

export default function BizPaymentSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/biz/settings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        설정으로 돌아가기
      </Link>

      <div className="mt-6 rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10">
            <CreditCard className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">결제 수단 관리</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              정산 계좌와 결제 관련 안내를 확인합니다.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center gap-3">
              <Landmark className="h-5 w-5 text-brand" />
              <div>
                <p className="font-semibold">정산 계좌</p>
                <p className="text-sm text-muted-foreground">
                  사업자 프로필과 연결된 정산 계좌 정보를 고객센터에서 확인할 수
                  있습니다.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-brand" />
              <div>
                <p className="font-semibold">정산 내역 보기</p>
                <p className="text-sm text-muted-foreground">
                  공고별 지급 내역은 정산 페이지에서 바로 확인할 수 있습니다.
                </p>
                <Link
                  href="/biz/settlements"
                  className="mt-2 inline-flex text-sm font-medium text-brand hover:underline"
                >
                  정산 페이지 열기
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
