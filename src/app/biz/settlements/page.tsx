import { requireBusiness } from "@/lib/dal";
import { getBizSettlementTotals, getBizSettlements } from "@/lib/db/queries";
import { SettlementCard } from "@/components/shared/settlement-card";
import { Card, CardContent } from "@/components/ui/card";

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
    <main className="mx-auto max-w-3xl p-4 pb-24">
      <h1 className="mb-4 text-xl font-bold">정산 히스토리</h1>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">누적 지급</p>
            <p className="text-xl font-bold">
              {totals.allTimeTotal.toLocaleString("ko-KR")}원
            </p>
            <p className="text-[10px] text-muted-foreground">
              {totals.allTimeCount}건
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">이번 달 지급</p>
            <p className="text-xl font-bold">
              {totals.thisMonthTotal.toLocaleString("ko-KR")}원
            </p>
            <p className="text-[10px] text-muted-foreground">
              {totals.thisMonthCount}건
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        {settlements.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              아직 지급 내역이 없어요
            </CardContent>
          </Card>
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
