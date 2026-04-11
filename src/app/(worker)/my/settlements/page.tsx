import { requireWorker } from "@/lib/dal";
import {
  getWorkerSettlementTotals,
  getWorkerSettlements,
  getApplicationsByWorker,
} from "@/lib/db/queries";
import { SettlementCard } from "@/components/shared/settlement-card";
import { ReviewPromptBanner } from "@/components/worker/review-prompt-banner";
import { Card, CardContent } from "@/components/ui/card";

export default async function WorkerSettlementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireWorker();
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  const [totals, settlements, doneApps] = await Promise.all([
    getWorkerSettlementTotals(session.id),
    getWorkerSettlements(session.id, { page, limit: 20 }),
    getApplicationsByWorker(session.id, { bucket: "done" }),
  ]);

  // Unreviewed count: settled apps without reviewGiven=true
  const unreviewed = doneApps.filter(
    (a) => a.status === "settled" && !a.reviewGiven,
  );

  return (
    <main className="mx-auto max-w-xl p-4 pb-24">
      <h1 className="mb-4 text-xl font-bold">정산</h1>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">총수입</p>
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
            <p className="text-xs text-muted-foreground">이번 달</p>
            <p className="text-xl font-bold">
              {totals.thisMonthTotal.toLocaleString("ko-KR")}원
            </p>
            <p className="text-[10px] text-muted-foreground">
              {totals.thisMonthCount}건
            </p>
          </CardContent>
        </Card>
      </div>

      <ReviewPromptBanner
        unreviewedCount={unreviewed.length}
        firstUnreviewedAppId={unreviewed[0]?.id ?? null}
      />

      <div className="flex flex-col gap-3">
        {settlements.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              아직 정산 내역이 없어요
            </CardContent>
          </Card>
        ) : (
          settlements.map((s) => (
            <SettlementCard
              key={s.id}
              side="worker"
              jobTitle={s.job.title}
              counterpartyName={s.job.business.name}
              checkOutAt={s.checkOutAt}
              earnings={s.earnings ?? 0}
              settlementStatus={s.status === "settled" ? "settled" : null}
            />
          ))
        )}
      </div>
    </main>
  );
}
