import Link from "next/link";
import { ChevronLeft, CreditCard, FileText, Landmark } from "lucide-react";

export default function BizPaymentSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/biz/settings"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-[13px] font-bold text-ink transition-colors hover:border-ink hover:bg-surface-2"
      >
        <ChevronLeft className="h-4 w-4" />
        설정으로 돌아가기
      </Link>

      <div className="mt-5 space-y-4">
        <div className="rounded-[22px] border border-border bg-[color-mix(in_oklch,var(--brand)_6%,var(--surface))] p-6">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-[20px] font-extrabold tracking-[-0.025em] text-ink">
                결제 수단 관리
              </h1>
              <p className="mt-1 text-[12px] font-medium text-muted-foreground">
                정산 계좌와 결제 관련 안내를 확인합니다.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-border-soft bg-surface p-5 transition-colors hover:border-ink">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[14px] font-extrabold tracking-tight text-ink">
                정산 계좌
              </h2>
              <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-muted-foreground">
                사업자 프로필과 연결된 정산 계좌 정보를 고객센터에서 확인할 수
                있습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-border-soft bg-surface p-5 transition-colors hover:border-ink">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[14px] font-extrabold tracking-tight text-ink">
                정산 내역 보기
              </h2>
              <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-muted-foreground">
                공고별 지급 내역은 정산 페이지에서 바로 확인할 수 있습니다.
              </p>
              <Link
                href="/biz/settlements"
                className="mt-2 inline-block text-[12px] font-bold text-brand-deep hover:underline"
              >
                정산 페이지 열기 →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
