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
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">정산 히스토리</h1>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] text-muted-foreground">누적 지급</p>
          <p className="text-xl font-extrabold tracking-tight mt-1">
            {totals.allTimeTotal.toLocaleString("ko-KR")}원
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {totals.allTimeCount}건
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] text-muted-foreground">이번 달 지급</p>
          <p className="text-xl font-extrabold tracking-tight mt-1">
            {totals.thisMonthTotal.toLocaleString("ko-KR")}원
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {totals.thisMonthCount}건
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {settlements.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">아직 지급 내역이 없어요</p>
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
              settlementStatus={s.status === "settled" || s.status === "completed" ? "settled" : null}
            />
          ))
        )}
      </div>
    </main>
  );
}
