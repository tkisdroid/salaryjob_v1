import Link from "next/link";
import { Calendar, FileText, Plus, Sparkles, Users, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
    className: "border-teal/20 bg-teal/10 text-teal",
    label: "모집 중",
  };
}

function PostCard({ job }: { job: Job }) {
  const badge = statusBadgeProps(job);

  return (
    <Card className="transition-all hover:ring-2 hover:ring-teal/20">
      <CardContent>
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}
              >
                {badge.label}
              </span>
              {job.isUrgent && (
                <span className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">
                  <Zap className="h-3 w-3 fill-red-600" />
                  긴급
                </span>
              )}
              <Link
                href={`/biz/posts/${job.id}`}
                className="text-sm font-semibold text-foreground transition-colors hover:text-teal"
              >
                {job.title}
              </Link>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span>시급 {job.hourlyPay.toLocaleString()}원</span>
              <span>{job.business.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {job.workDate} {job.startTime}~{job.endTime}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {job.filled}/{job.headcount}명
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal/10">
        <FileText className="h-8 w-8 text-teal" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-foreground">
        아직 등록된 공고가 없습니다
      </h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        첫 공고를 등록하면 지원자 모집이 바로 시작됩니다.
      </p>
      <Link
        href="/biz/posts/new"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal px-4 text-sm font-medium text-white transition-colors hover:bg-teal/90"
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">공고 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            등록한 공고와 지원자 현황을 확인합니다.
          </p>
        </div>
        <Link
          href="/biz/posts/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-teal px-4 text-sm font-medium text-white transition-colors hover:bg-teal/90"
        >
          <Plus className="h-4 w-4" />
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
