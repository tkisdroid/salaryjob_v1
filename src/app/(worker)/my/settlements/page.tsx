import Link from "next/link";
import {
  MOCK_APPLICATIONS,
  MOCK_CURRENT_WORKER,
  calculateEarnings,
} from "@/lib/mock-data";
import { formatMoney } from "@/lib/format";
import {
  ArrowLeft,
  Wallet,
  CheckCircle2,
  Clock,
  TrendingUp,
  Zap,
  Download,
  Calendar,
  Info,
} from "lucide-react";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${d
    .getHours()
    .toString()
    .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function WorkerSettlementsPage() {
  const worker = MOCK_CURRENT_WORKER;
  // Settled and pending settlements
  const allPastJobs = MOCK_APPLICATIONS.filter(
    (a) => a.status === "completed"
  );
  const settled = allPastJobs.filter((a) => a.settlementStatus === "settled");
  const pending = allPastJobs.filter(
    (a) => a.settlementStatus === "pending" || a.settlementStatus === null
  );

  // This month income
  const now = new Date();
  const thisMonthSettled = settled.filter((a) => {
    if (!a.settledAt) return false;
    const d = new Date(a.settledAt);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });
  const thisMonthTotal = thisMonthSettled.reduce(
    (sum, a) => sum + (a.earnings ?? 0),
    0
  );
  const allTimeTotal = settled.reduce(
    (sum, a) => sum + (a.earnings ?? 0),
    0
  );
  // Fastest settlement in this dataset
  const avgSettleMinutes = 2; // Timee 즉시 정산 평균

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/my"
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <p className="text-sm font-bold flex-1">정산 내역</p>
          <button className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center">
            <Download className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-5">
        {/* Hero: this month */}
        <section className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white p-5 shadow-lg shadow-brand/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm opacity-90 flex items-center gap-1.5">
              <Wallet className="w-4 h-4" /> 이번 달 총 수입
            </p>
            <TrendingUp className="w-4 h-4 opacity-80" />
          </div>
          <p className="text-3xl font-bold tracking-tight">
            {formatMoney(thisMonthTotal)}
          </p>
          <p className="text-[11px] opacity-80 mt-1">
            {thisMonthSettled.length}건 정산 완료 · 누적 {formatMoney(allTimeTotal)}
          </p>

          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center gap-2 text-[11px]">
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>
                평균 정산 <strong>{avgSettleMinutes}분</strong> · 근무 완료 즉시
                본인 계좌 입금
              </span>
            </div>
          </div>
        </section>

        {/* Pending */}
        {pending.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                입금 대기 ({pending.length})
              </h2>
            </div>
            <div className="space-y-2">
              {pending.map((app) => {
                const amount = app.earnings ?? calculateEarnings(app.job);
                return (
                  <div
                    key={app.id}
                    className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-xl shrink-0">
                        {app.job.business.logo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-muted-foreground truncate">
                          {app.job.business.name}
                        </p>
                        <p className="text-xs font-medium line-clamp-1">
                          {app.job.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-amber-700">
                          <Clock className="w-3 h-3" />
                          <span>곧 입금 예정</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-amber-700">
                          {formatMoney(amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Settled */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-brand" />
              입금 완료 ({settled.length})
            </h2>
            <button className="text-[11px] text-muted-foreground flex items-center gap-0.5">
              <Calendar className="w-3 h-3" />
              전체 기간
            </button>
          </div>

          {settled.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center">
              <Wallet className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                아직 정산 내역이 없어요
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {settled.map((app) => (
                <div
                  key={app.id}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-xl shrink-0">
                      {app.job.business.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] text-muted-foreground truncate">
                          {app.job.business.name}
                        </p>
                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand/10 text-brand">
                          완료
                        </span>
                      </div>
                      <p className="text-xs font-medium line-clamp-1 mt-0.5">
                        {app.job.title}
                      </p>
                      {app.settledAt && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDateTime(app.settledAt)} 입금
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">
                        {app.checkInAt && formatDate(app.checkInAt)}
                      </p>
                      <p className="text-sm font-bold text-brand mt-0.5">
                        {formatMoney(app.earnings ?? 0)}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {app.actualHours}시간 근무
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Info banner */}
        <div className="rounded-xl bg-muted/50 p-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed text-muted-foreground">
              <p className="font-bold mb-1 text-foreground">
                GigNow 즉시 정산 안내
              </p>
              <p>
                체크아웃 확인 즉시 3.3% 원천징수 후 본인 명의 계좌로 자동 송금됩니다.
                연말정산용 원천징수영수증은 매년 1월 MY 페이지에서 다운로드할 수
                있어요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
