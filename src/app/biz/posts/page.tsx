import Link from "next/link";
import {
  Plus,
  Users,
  Calendar,
  Sparkles,
  FileText,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireBusiness } from "@/lib/dal";
import {
  getBusinessProfilesByUserId,
  getJobsByBusinessIds,
} from "@/lib/db/queries";
import type { Job } from "@/lib/types/job";

/* ── Helpers ── */

function statusBadgeProps(job: Job): { className: string; label: string } {
  if (job.filled >= job.headcount) {
    return {
      className: "bg-muted text-muted-foreground border-border",
      label: "마감",
    };
  }
  return { className: "bg-teal/10 text-teal border-teal/20", label: "모집 중" };
}

/* ── Post Card ── */

function PostCard({ job }: { job: Job }) {
  const badge = statusBadgeProps(job);
  return (
    <Card className="hover:ring-2 hover:ring-teal/20 transition-all">
      <CardContent>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
              >
                {badge.label}
              </span>
              {job.isUrgent && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20">
                  <Zap className="w-3 h-3 fill-red-600" />
                  급구
                </span>
              )}
              <Link
                href={`/biz/posts/${job.id}`}
                className="text-sm font-semibold text-foreground hover:text-teal transition-colors"
              >
                {job.title}
              </Link>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span>시급 {job.hourlyPay.toLocaleString()}원</span>
              <span>{job.business.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {job.workDate} {job.startTime}~{job.endTime}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {job.filled}/{job.headcount}명
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Empty State ── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-teal/10 mb-4">
        <FileText className="w-8 h-8 text-teal" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">
        아직 등록된 공고가 없어요
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        첫 공고를 등록해보세요 — 매칭은 자동으로 시작됩니다.
      </p>
      <Button className="bg-teal text-white hover:bg-teal/90" asChild>
        <Link href="/biz/posts/new">
          <Sparkles className="w-4 h-4" />
          공고 작성하기
        </Link>
      </Button>
    </div>
  );
}

/* ── Page ── */

export default async function BizPostsPage() {
  const session = await requireBusiness();
  const profiles = await getBusinessProfilesByUserId(session.id);
  const businessIds = profiles.map((p) => p.id);
  const jobs = await getJobsByBusinessIds(businessIds);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">공고 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            등록한 공고를 관리하고 지원자를 확인하세요.
          </p>
        </div>
        <Button className="bg-teal text-white hover:bg-teal/90" asChild>
          <Link href="/biz/posts/new">
            <Plus className="w-4 h-4" />
            새 공고 등록
          </Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3 mt-4">
          {jobs.map((job) => (
            <PostCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
