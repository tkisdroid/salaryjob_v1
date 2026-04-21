import { Info, Wallet } from "lucide-react";
import { requireBusiness } from "@/lib/dal";
import { getBizSettlementTotals, getBizSettlements } from "@/lib/db/queries";
import { SettlementCard } from "@/components/shared/settlement-card";

export default async function BizSettlementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireBusiness();
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  const [totals, settlements] = await Promise.all([
    getBizSettlementTotals(session.id),
    getBizSettlements(session.id, { page, limit: 20 }),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8 pb-24">
      <h1 className="flex items-center gap-2 text-[24px] font-extrabold tracking-[-0.035em] text-ink">
        <Wallet className="h-[22px] w-[22px] text-brand-deep" />
        정산 히스토리
      </h1>

      <div className="mb-4 mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-[22px] border border-border-soft bg-surface p-4">
          <p className="text-[11px] font-bold tracking-tight text-muted-foreground">
            누적 지급
          </p>
          <p className="tabnum mt-1 text-[20px] font-extrabold tracking-[-0.025em] text-ink">
            {totals.allTimeTotal.toLocaleString("ko-KR")}원
          </p>
          <p className="tabnum mt-1 text-[11px] font-semibold text-muted-foreground">
            {totals.allTimeCount}건
          </p>
        </div>
        <div className="rounded-[22px] border border-border bg-[color-mix(in_oklch,var(--brand)_6%,var(--surface))] p-4">
          <p className="text-[11px] font-bold tracking-tight text-muted-foreground">
            이번 달 지급
          </p>
          <p className="tabnum mt-1 text-[20px] font-extrabold tracking-[-0.025em] text-brand-deep">
            {totals.thisMonthTotal.toLocaleString("ko-KR")}원
          </p>
          <p className="tabnum mt-1 text-[11px] font-semibold text-muted-foreground">
            {totals.thisMonthCount}건
          </p>
        </div>
      </div>

      <div className="rounded-[22px] border border-border-soft bg-[color-mix(in_oklch,var(--brand)_6%,var(--surface))] p-5 mb-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[14px] font-extrabold tracking-tight text-ink">
              자동 정산 안내
            </h2>
            <p className="mt-1.5 text-[12.5px] font-medium leading-relaxed text-muted-foreground">
              근무 완료 후 정산은 플랫폼에서 자동으로 처리됩니다. 별도의 결제 수단 등록이나
              수동 이체는 필요하지 않습니다. 근무자에게는 원천징수(3.3%) 후 금액이 자동 송금됩니다.
            </p>
            <p className="mt-1 text-[11px] font-semibold text-brand-deep">
              실제 결제 수단 연동은 v2에서 제공될 예정입니다.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {settlements.length === 0 ? (
          <div className="rounded-[22px] border border-border bg-surface p-8 text-center text-[13px] font-semibold text-muted-foreground">
            아직 지급 내역이 없어요
          </div>
        ) : (
          settlements.map((s) => (
            <SettlementCard
              key={s.id}
              side="biz"
              jobTitle={s.job.title}
              counterpartyName={
                s.worker.workerProfile?.nickname ??
                s.worker.workerProfile?.name ??
                "근무자"
              }
              checkOutAt={s.checkOutAt}
              earnings={s.earnings ?? 0}
              settlementStatus={
                s.status === "settled" || s.status === "completed"
                  ? "settled"
                  : null
              }
            />
          ))
        )}
      </div>
    </main>
  );
}
