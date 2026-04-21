import Link from "next/link";
import { ChevronLeft, Wallet } from "lucide-react";
import { requireWorker } from "@/lib/dal";
import {
  getWorkerSettlementTotals,
  getWorkerSettlements,
  getApplicationsByWorker,
} from "@/lib/db/queries";
import { SettlementCard } from "@/components/shared/settlement-card";
import { ReviewPromptBanner } from "@/components/worker/review-prompt-banner";

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

  const unreviewed = doneApps.filter(
    (a) => a.status === "settled" && !a.reviewGiven,
  );

  return (
    <main className="mx-auto max-w-xl px-4 pt-5 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/my"
          aria-label="뒤로"
          className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-surface-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.035em] text-ink">
          <Wallet className="h-[20px] w-[20px] text-brand-deep" />
          정산
        </h1>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-[22px] border border-border-soft bg-surface p-4">
          <p className="text-[11px] font-bold tracking-tight text-muted-foreground">
            총 실수령액
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
            이번 달
          </p>
          <p className="tabnum mt-1 text-[20px] font-extrabold tracking-[-0.025em] text-brand-deep">
            {totals.thisMonthTotal.toLocaleString("ko-KR")}원
          </p>
          <p className="tabnum mt-1 text-[11px] font-semibold text-muted-foreground">
            {totals.thisMonthCount}건
          </p>
        </div>
      </div>

      <ReviewPromptBanner
        unreviewedCount={unreviewed.length}
        firstUnreviewedAppId={unreviewed[0]?.id ?? null}
      />

      <div className="mt-4 flex flex-col gap-3">
        {settlements.length === 0 ? (
          <div className="rounded-[22px] border border-border bg-surface p-8 text-center text-[13px] font-semibold text-muted-foreground">
            아직 정산 내역이 없어요
          </div>
        ) : (
          settlements.map((s) => (
            <SettlementCard
              key={s.id}
              side="worker"
              jobTitle={s.job.title}
              counterpartyName={s.job.business.name}
              checkOutAt={s.checkOutAt}
              earnings={(s as any).netEarnings ?? s.earnings ?? 0}
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
