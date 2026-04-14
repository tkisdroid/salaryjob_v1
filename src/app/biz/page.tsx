import Link from "next/link";
import {
  Building2,
  ChevronRight,
  FileText,
  Flame,
  Plus,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { requireBusiness } from "@/lib/dal";
import {
  getBusinessProfilesByUserId,
  getJobsByBusinessIds,
} from "@/lib/db/queries";
import { formatMoney } from "@/lib/format";
import type { Job } from "@/lib/types/job";

function estimateJobBudget(job: Job) {
  return job.headcount * (job.hourlyPay * job.workHours + job.transportFee);
}

function formatWorkSummary(job: Job) {
  return `${job.workDate} · ${job.startTime}~${job.endTime}`;
}

export default async function BizDashboardPage() {
  const session = await requireBusiness();
  const profiles = await getBusinessProfilesByUserId(session.id);
  const jobs = await getJobsByBusinessIds(profiles.map((profile) => profile.id));
  const primaryProfile = profiles[0] ?? null;

  if (!primaryProfile) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-3xl">
            <Building2 className="h-7 w-7 text-brand" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">사업자 프로필이 없습니다</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            대시보드를 사용하려면 먼저 사업장 정보를 등록해야 합니다.
          </p>
          <Link
            href="/biz/profile"
            className="mt-5 inline-flex h-12 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand/90"
          >
            사업자 프로필 등록
          </Link>
        </div>
      </div>
    );
  }

  const openJobs = jobs.filter((job) => job.filled < job.headcount);
  const urgentJobs = jobs.filter((job) => job.isUrgent);
  const totalHeadcount = jobs.reduce((sum, job) => sum + job.headcount, 0);
  const totalFilled = jobs.reduce((sum, job) => sum + job.filled, 0);
  const fillRate =
    totalHeadcount === 0 ? 0 : Math.round((totalFilled / totalHeadcount) * 100);
  const forecastBudget = jobs.reduce(
    (sum, job) => sum + estimateJobBudget(job),
    0,
  );
  const recentJobs = jobs.slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-2xl shrink-0">
            {primaryProfile.logo}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight truncate md:text-2xl">{primaryProfile.name}</h1>
              {primaryProfile.verified && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
                  <ShieldCheck className="h-3 w-3" />
                  인증 완료
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {primaryProfile.address}
            </p>
          </div>
        </div>
        <Link
          href="/biz/posts/new"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          공고 등록
        </Link>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
          <p className="text-[10px] text-muted-foreground font-medium">전체 공고</p>
          <p className="mt-1 text-xl font-extrabold tracking-tight">{jobs.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            모집 중 {openJobs.length}건
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
          <p className="text-[10px] text-muted-foreground font-medium">긴급 공고</p>
          <p className="mt-1 text-xl font-extrabold tracking-tight text-brand">
            {urgentJobs.length}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            즉시 확인이 필요한 공고
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
          <p className="text-[10px] text-muted-foreground font-medium">충원율</p>
          <p className="mt-1 text-xl font-extrabold tracking-tight">{fillRate}%</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {totalFilled}/{totalHeadcount}명 매칭
          </p>
        </div>
        <div className="col-span-2 xl:col-span-1 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
          <p className="text-[10px] text-muted-foreground font-medium">예상 총 지급</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight">{formatMoney(forecastBudget)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            등록된 공고 기준 합계
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1.8fr]">
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <h2 className="text-sm font-bold">빠른 작업</h2>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border">
            <Link
              href="/biz/posts"
              className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-accent/50 active:bg-accent group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand shrink-0 transition-transform group-hover:scale-105">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">공고 관리</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  등록한 공고와 지원자를 확인합니다.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
            <Link
              href="/biz/workers"
              className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-accent/50 active:bg-accent group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand shrink-0 transition-transform group-hover:scale-105">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">인재 탐색</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  지원자와 추천 인재 프로필을 확인합니다.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
            <Link
              href="/biz/settlements"
              className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-accent/50 active:bg-accent group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand shrink-0 transition-transform group-hover:scale-105">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">정산 확인</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  지급 현황과 정산 내역을 확인합니다.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <div>
              <h2 className="text-sm font-bold">최근 공고</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                대시보드에서 바로 상세와 지원자를 확인할 수 있습니다.
              </p>
            </div>
            <Link
              href="/biz/posts"
              className="text-[11px] font-semibold text-brand hover:underline shrink-0"
            >
              전체 보기
            </Link>
          </div>

          {recentJobs.length === 0 ? (
            <div className="mx-5 my-4 rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="font-bold">등록된 공고가 없습니다.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                첫 공고를 등록하면 여기에서 바로 확인할 수 있습니다.
              </p>
              <Link
                href="/biz/posts/new"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
              >
                공고 작성하기
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentJobs.map((job) => {
                const isFilled = job.filled >= job.headcount;
                return (
                  <div key={job.id} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isFilled
                            ? "bg-muted text-muted-foreground"
                            : "bg-brand/10 text-brand"
                        }`}
                      >
                        {isFilled ? "충원 완료" : "모집 중"}
                      </span>
                      {job.isUrgent && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-[color:var(--urgent)]/10 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--urgent)]">
                          <Flame className="h-3 w-3" />
                          긴급
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/biz/posts/${job.id}`}
                      className="block text-sm font-bold hover:text-brand"
                    >
                      {job.title}
                    </Link>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatWorkSummary(job)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {job.filled}/{job.headcount}명 · 지원 {job.appliedCount}건
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Link
                        href={`/biz/posts/${job.id}`}
                        className="inline-flex h-8 items-center justify-center rounded-xl border border-border px-3 text-xs font-medium transition-colors hover:bg-muted"
                      >
                        공고 상세
                      </Link>
                      <Link
                        href={`/biz/posts/${job.id}/applicants`}
                        className="inline-flex h-8 items-center justify-center rounded-xl bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
                      >
                        지원자 보기
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
