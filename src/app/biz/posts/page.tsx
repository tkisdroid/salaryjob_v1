import Link from "next/link";
import { Calendar, FileText, Flame, Plus, Sparkles, Users, Zap } from "lucide-react";
import { requireBusiness } from "@/lib/dal";
import {
  getBusinessProfilesByUserId,
  getJobsByBusinessIds,
} from "@/lib/db/queries";
import type { Job } from "@/lib/types/job";

function statusBadgeProps(job: Job): { className: string; label: string } {
  if (job.filled >= job.headcount) {
    return {
      className: "border-border bg-muted text-muted-foreground",
      label: "마감",
    };
  }

  return {
    className: "border-brand/30 bg-brand/5 text-brand",
    label: "모집 중",
  };
}

function PostCard({ job }: { job: Job }) {
  const badge = statusBadgeProps(job);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
      {/* Tags */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${badge.className}`}
        >
          {badge.label}
        </span>
        {job.isUrgent && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-[color:var(--urgent)]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[color:var(--urgent)]">
            <Flame className="h-3 w-3" />
            긴급
          </span>
        )}
      </div>

      {/* Title */}
      <Link
        href={`/biz/posts/${job.id}`}
        className="text-sm font-bold tracking-tight text-foreground transition-colors hover:text-brand"
      >
        {job.title}
      </Link>

      {/* Info */}
      <p className="text-xs text-muted-foreground mt-1.5">
        시급 {job.hourlyPay.toLocaleString()}원{"\u3000"}{job.business.name}
      </p>

      <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {job.workDate} {job.startTime}~{job.endTime}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {job.filled}/{job.headcount}명
        </span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10">
        <FileText className="h-8 w-8 text-brand" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-foreground">
        아직 등록된 공고가 없습니다
      </h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        첫 공고를 등록하면 지원자 모집이 바로 시작됩니다.
      </p>
      <Link
        href="/biz/posts/new"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
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
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">공고 관리</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            등록한 공고와 지원자 현황을 확인합니다.
          </p>
        </div>
        <Link
          href="/biz/posts/new"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl bg-foreground px-3 text-xs font-semibold text-background transition-colors hover:bg-foreground/90"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
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
