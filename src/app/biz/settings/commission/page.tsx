import Link from "next/link";
import { ArrowLeft, Percent, ReceiptText } from "lucide-react";

export default function BizCommissionSettingsPage() {
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
            <Percent className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">수수료 안내</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              공고 운영 시 적용되는 기본 비용 기준을 확인합니다.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="rounded-2xl border border-border p-4">
            <p className="font-semibold">기본 정책</p>
            <p className="mt-1 text-sm text-muted-foreground">
              실제 결제 금액과 수수료는 계약 상태, 지급 방식, 프로모션 적용 여부에
              따라 달라질 수 있습니다.
            </p>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center gap-3">
              <ReceiptText className="h-5 w-5 text-brand" />
              <div>
                <p className="font-semibold">확인 경로</p>
                <p className="text-sm text-muted-foreground">
                  개별 공고의 지급액과 인원 수는 공고 상세에서 즉시 확인할 수
                  있습니다.
                </p>
                <Link
                  href="/biz/posts"
                  className="mt-2 inline-flex text-sm font-medium text-brand hover:underline"
                >
                  공고 관리 열기
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
