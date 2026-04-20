import Link from "next/link";
import {
  Calendar,
  FileText,
  Flame,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { requireBusiness } from "@/lib/dal";
import {
  getBusinessProfilesByUserId,
  getJobsByBusinessIds,
} from "@/lib/db/queries";
import type { Job } from "@/lib/types/job";

function statusPill(job: Job): { className: string; label: string } {
  if (job.filled >= job.headcount) {
    return {
      className: "bg-surface-2 text-muted-foreground",
      label: "마감",
    };
  }
  return {
    className: "bg-brand text-ink",
    label: "모집 중",
  };
}

function PostCard({ job }: { job: Job }) {
  const pill = statusPill(job);
  const fillRate =
    job.headcount === 0
      ? 0
      : Math.min(100, Math.round((job.filled / job.headcount) * 100));

  return (
    <article className="rounded-[22px] border border-border-soft bg-surface p-[18px] transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-soft-md">
      <div className="mb-2.5 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-[10px] font-extrabold tracking-tight ${pill.className}`}
        >
          {pill.label}
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
        className="block text-[15.5px] font-extrabold tracking-[-0.025em] text-ink transition-colors hover:text-brand-deep"
      >
        {job.title}
      </Link>

      <p className="mt-1 text-[11.5px] font-semibold text-muted-foreground">
        시급{" "}
        <b className="tabnum font-bold text-ink">
          {job.hourlyPay.toLocaleString()}원
        </b>
        {"\u3000"}
        {job.business.name}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] font-semibold text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <b className="font-bold text-ink">
            {job.workDate} {job.startTime}~{job.endTime}
          </b>
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span className="tabnum">
            {job.filled}/{job.headcount}명
          </span>
        </span>
      </div>

      <div className="mt-3 h-[6px] overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-all ${
            fillRate === 100 ? "bg-muted-foreground/40" : "bg-brand"
          }`}
          style={{ width: `${fillRate}%` }}
        />
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-border bg-surface py-20 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-[20px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))]">
        <FileText className="h-8 w-8 text-brand-deep" />
      </div>
      <h3 className="mb-2 text-[17px] font-extrabold tracking-[-0.02em] text-ink">
        아직 등록된 공고가 없습니다
      </h3>
      <p className="mb-6 max-w-sm text-[13px] font-medium text-muted-foreground">
        첫 공고를 등록하면 지원자 모집이 바로 시작됩니다.
      </p>
      <Link
        href="/biz/posts/new"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[13px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark"
      >
        <Sparkles className="h-4 w-4" />
        공고 작성하기
      </Link>
    </div>
  );
}

export default async function BizPostsPage() {
  const session = await requireBusiness();
  const profiles = await getBusinessProfilesByUserId(session.id);
  const businessIds = profiles.map((profile) => profile.id);
  const jobs = await getJobsByBusinessIds(businessIds);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[24px] font-extrabold tracking-[-0.035em] text-ink">
            <FileText className="h-[22px] w-[22px] text-brand-deep" />
            공고 관리
          </h1>
          <p className="mt-1 text-[12.5px] font-medium text-muted-foreground">
            등록한 공고와 지원자 현황을 확인합니다.
          </p>
        </div>
        <Link
          href="/biz/posts/new"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-4 text-[13px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark"
        >
          <Plus className="h-4 w-4 shrink-0" />
          새 공고 등록
        </Link>
      </div>

      {jobs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-4 space-y-3">
          {jobs.map((job) => (
            <PostCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
