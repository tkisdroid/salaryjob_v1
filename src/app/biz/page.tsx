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
        <div className="rounded-[28px] border-2 border-dashed border-border bg-surface p-10 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[18px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))]">
            <Building2 className="h-7 w-7 text-brand-deep" />
          </div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.035em] text-ink">
            사업자 프로필이 없습니다
          </h1>
          <p className="mt-2 text-[13px] font-medium text-muted-foreground">
            대시보드를 사용하려면 먼저 사업장 정보를 등록해야 합니다.
          </p>
          <Link
            href="/biz/profile"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-[13px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark"
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
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] border border-border-soft bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-2xl">
            {primaryProfile.logo}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[20px] font-extrabold tracking-[-0.035em] text-ink md:text-[24px]">
                {primaryProfile.name}
              </h1>
              {primaryProfile.verified && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-[9px] py-[3px] text-[10px] font-extrabold tracking-tight text-white">
                  <ShieldCheck className="h-3 w-3 text-brand" />
                  인증 완료
                </span>
              )}
            </div>
            <p className="mt-1 text-[12px] font-semibold text-muted-foreground">
              {primaryProfile.address}
            </p>
          </div>
        </div>
        <Link
          href="/biz/posts/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[13px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark"
        >
          <Plus className="h-4 w-4" />
          공고 등록
        </Link>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-[22px] border border-border-soft bg-surface p-4 transition-colors hover:border-ink">
          <p className="text-[11.5px] font-bold tracking-tight text-muted-foreground">
            전체 공고
          </p>
          <p className="tabnum mt-1 text-[24px] font-extrabold tracking-[-0.03em] text-ink">
            {jobs.length}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
            모집 중 {openJobs.length}건
          </p>
        </div>
        <div className="rounded-[22px] border border-border bg-[color-mix(in_oklch,var(--brand)_6%,var(--surface))] p-4 transition-colors hover:border-ink">
          <p className="text-[11.5px] font-bold tracking-tight text-muted-foreground">
            긴급 공고
          </p>
          <p className="tabnum mt-1 text-[24px] font-extrabold tracking-[-0.03em] text-brand-deep">
            {urgentJobs.length}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
            즉시 확인이 필요한 공고
          </p>
        </div>
        <div className="rounded-[22px] border border-border-soft bg-surface p-4 transition-colors hover:border-ink">
          <p className="text-[11.5px] font-bold tracking-tight text-muted-foreground">
            충원율
          </p>
          <p className="tabnum mt-1 text-[24px] font-extrabold tracking-[-0.03em] text-ink">
            {fillRate}%
          </p>
          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
            {totalFilled}/{totalHeadcount}명 매칭
          </p>
        </div>
        <div className="col-span-2 rounded-[22px] border border-border-soft bg-surface p-4 transition-colors hover:border-ink xl:col-span-1">
          <p className="text-[11.5px] font-bold tracking-tight text-muted-foreground">
            예상 총 지급
          </p>
          <p className="tabnum mt-1 text-[24px] font-extrabold tracking-[-0.03em] text-ink">
            {formatMoney(forecastBudget)}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
            등록된 공고 기준 합계
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_1.8fr]">
        <div className="rounded-[22px] border border-border-soft bg-surface">
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <h2 className="text-[14px] font-extrabold tracking-[-0.02em] text-ink">
              빠른 작업
            </h2>
            <Settings className="h-4 w-4 text-text-subtle" />
          </div>
          <div>
            {[
              { href: "/biz/posts", label: "공고 관리", desc: "등록한 공고와 지원자를 확인합니다.", Icon: FileText },
              { href: "/biz/workers", label: "인재 탐색", desc: "지원자와 추천 인재 프로필을 확인합니다.", Icon: Users },
              { href: "/biz/settlements", label: "정산 확인", desc: "지급 현황과 정산 내역을 확인합니다.", Icon: Wallet },
            ].map((item, idx) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-2 ${
                  idx > 0 ? "border-t border-border-soft" : ""
                }`}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep">
                  <item.Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-extrabold tracking-tight text-ink">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[11.5px] font-medium text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-text-subtle" />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[22px] border border-border-soft bg-surface">
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <div>
              <h2 className="text-[14px] font-extrabold tracking-[-0.02em] text-ink">
                최근 공고
              </h2>
              <p className="mt-0.5 text-[11.5px] font-medium text-muted-foreground">
                대시보드에서 바로 상세와 지원자를 확인할 수 있습니다.
              </p>
            </div>
            <Link
              href="/biz/posts"
              className="shrink-0 text-[11.5px] font-bold text-brand-deep hover:underline"
            >
              전체 보기
            </Link>
          </div>

          {recentJobs.length === 0 ? (
            <div className="mx-5 my-4 rounded-[18px] border-2 border-dashed border-border bg-surface p-8 text-center">
              <p className="text-[14px] font-extrabold text-ink">
                등록된 공고가 없습니다.
              </p>
              <p className="mt-1 text-[12.5px] font-medium text-muted-foreground">
                첫 공고를 등록하면 여기에서 바로 확인할 수 있습니다.
              </p>
              <Link
                href="/biz/posts/new"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-ink px-5 text-[13px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark"
              >
                공고 작성하기
              </Link>
            </div>
          ) : (
            <div>
              {recentJobs.map((job, idx) => {
                const isFilled = job.filled >= job.headcount;
                return (
                  <div
                    key={job.id}
                    className={`px-5 py-4 ${idx > 0 ? "border-t border-border-soft" : ""}`}
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <span
                        className={`rounded-[6px] px-2 py-1 text-[10px] font-extrabold tracking-tight ${
                          isFilled
                            ? "bg-surface-2 text-muted-foreground"
                            : "bg-brand text-ink"
                        }`}
                      >
                        {isFilled ? "충원 완료" : "모집 중"}
                      </span>
                      {job.isUrgent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-lime-chip px-[9px] py-[3px] text-[10px] font-extrabold tracking-tight text-lime-chip-fg">
                          <Flame className="h-3 w-3" />
                          긴급
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/biz/posts/${job.id}`}
                      className="block text-[14.5px] font-extrabold tracking-[-0.02em] text-ink hover:text-brand-deep"
                    >
                      {job.title}
                    </Link>
                    <p className="mt-1 text-[11.5px] font-medium text-muted-foreground">
                      {formatWorkSummary(job)}
                    </p>
                    <p className="tabnum text-[11.5px] font-semibold text-muted-foreground">
                      {job.filled}/{job.headcount}명 · 지원 {job.appliedCount}건
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/biz/posts/${job.id}`}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-surface px-3.5 text-[12px] font-bold text-ink transition-colors hover:border-ink hover:bg-surface-2"
                      >
                        공고 상세
                      </Link>
                      <Link
                        href={`/biz/posts/${job.id}/applicants`}
                        className="inline-flex h-9 items-center justify-center rounded-full bg-ink px-3.5 text-[12px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark"
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
