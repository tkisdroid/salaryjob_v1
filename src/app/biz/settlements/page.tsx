import { Wallet } from "lucide-react";
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
