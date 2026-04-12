import Link from "next/link";
import {
  Building2,
  ChevronRight,
  FileText,
  Plus,
  Settings,
  Users,
  Wallet,
  Zap,
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
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
            <Building2 className="h-7 w-7 text-brand" />
          </div>
          <h1 className="text-2xl font-bold">사업자 프로필이 없습니다</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            대시보드를 사용하려면 먼저 사업장 정보를 등록해야 합니다.
          </p>
          <Link
            href="/biz/profile"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand/90"
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
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-3xl">
            {primaryProfile.logo}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{primaryProfile.name}</h1>
              {primaryProfile.verified && (
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                  인증 완료
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {primaryProfile.address}
            </p>
          </div>
        </div>
        <Link
          href="/biz/posts/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" />
          공고 등록
        </Link>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">전체 공고</p>
          <p className="mt-2 text-3xl font-bold">{jobs.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            모집 중 {openJobs.length}건
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">긴급 공고</p>
          <p className="mt-2 text-3xl font-bold text-[color:var(--urgent)]">
            {urgentJobs.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            즉시 확인이 필요한 공고
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">충원율</p>
          <p className="mt-2 text-3xl font-bold">{fillRate}%</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalFilled}/{totalHeadcount}명 매칭
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">예상 총 지급</p>
          <p className="mt-2 text-3xl font-bold">{formatMoney(forecastBudget)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            등록된 공고 기준 합계
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1.8fr]">
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">빠른 작업</h2>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 -mx-2 flex flex-col">
            <Link
              href="/biz/posts"
              className="group flex items-center justify-between gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-mint-bg"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                  <FileText className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="font-bold">공고 관리</p>
                  <p className="text-xs text-muted-foreground">
                    등록한 공고와 지원자를 확인합니다.
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/biz/workers"
              className="group flex items-center justify-between gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-mint-bg"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                  <Users className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="font-bold">인재 탐색</p>
                  <p className="text-xs text-muted-foreground">
                    지원자와 추천 인재 프로필을 확인합니다.
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/biz/settlements"
              className="group flex items-center justify-between gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-mint-bg"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                  <Wallet className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="font-bold">정산 확인</p>
                  <p className="text-xs text-muted-foreground">
                    지급 현황과 정산 내역을 확인합니다.
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight">최근 공고</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                대시보드에서 바로 상세와 지원자를 확인할 수 있습니다.
              </p>
            </div>
            <Link
              href="/biz/posts"
              className="text-sm font-bold text-brand hover:underline"
            >
              전체 보기
            </Link>
          </div>

          {recentJobs.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
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
            <ul className="mt-4 divide-y divide-border">
              {recentJobs.map((job) => {
                const isFilled = job.filled >= job.headcount;
                return (
                  <li key={job.id} className="py-4 first:pt-2 last:pb-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              isFilled
                                ? "bg-muted text-muted-foreground"
                                : "bg-brand/10 text-brand-deep"
                            }`}
                          >
                            {isFilled ? "충원 완료" : "모집 중"}
                          </span>
                          {job.isUrgent && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--urgent)]/10 px-2 py-0.5 text-[11px] font-bold text-[color:var(--urgent)]">
                              <Zap className="h-3 w-3 fill-[color:var(--urgent)]" />
                              긴급
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/biz/posts/${job.id}`}
                          className="mt-2 block truncate text-base font-bold tracking-tight hover:text-brand"
                        >
                          {job.title}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatWorkSummary(job)}
                        </p>
                      </div>
                      <div className="shrink-0 text-sm text-muted-foreground">
                        {job.filled}/{job.headcount}명 · 지원 {job.appliedCount}건
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/biz/posts/${job.id}`}
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-4 text-xs font-medium transition-colors hover:bg-muted"
                      >
                        공고 상세
                      </Link>
                      <Link
                        href={`/biz/posts/${job.id}/applicants`}
                        className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-4 text-xs font-bold text-white transition-colors hover:bg-brand-dark"
                      >
                        지원자 보기
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
