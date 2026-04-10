import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Wallet,
  Calendar,
  Users,
  Trash2,
  Zap,
  ChevronRight,
  Building2,
  Tag,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireBusiness } from "@/lib/dal";
import { getJobById } from "@/lib/db/queries";
import { prisma } from "@/lib/db";
import { deleteJob } from "../actions";

/* ── Helpers ── */

function statusBadge(
  filled: number,
  headcount: number,
): { className: string; label: string } {
  if (filled >= headcount) {
    return { className: "bg-muted text-muted-foreground", label: "마감" };
  }
  return { className: "bg-teal/10 text-teal", label: "모집 중" };
}

/* ── Page ── */

export default async function BizPostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireBusiness();
  const { id } = await params;
  const job = await getJobById(id);

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <p className="mb-4 text-sm text-muted-foreground">
          공고를 찾을 수 없습니다.
        </p>
        <Button variant="outline" asChild>
          <Link href="/biz/posts">
            <ArrowLeft className="w-4 h-4" /> 목록으로
          </Link>
        </Button>
      </div>
    );
  }

  // Application-layer owner check — Prisma bypasses RLS, so this is the
  // primary defense. getJobById returns the adapted UI shape without
  // authorId, so fetch the minimal row explicitly.
  const rawJob = await prisma.job.findUnique({
    where: { id },
    select: { authorId: true },
  });
  if (!rawJob || rawJob.authorId !== session.id) {
    // Non-owner attempting biz-side detail view — redirect to the public
    // /posts/{id} route (they can still read the listing).
    redirect(`/posts/${id}`);
  }

  async function handleDelete() {
    "use server";
    const result = await deleteJob(id);
    if ("success" in result) {
      redirect("/biz/posts");
    }
    // Error case: revalidate path so the user sees the latest state;
    // detailed error messaging is a Phase 3+ UX polish item.
  }

  const badge = statusBadge(job.filled, job.headcount);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/biz/posts">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
            {job.isUrgent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600">
                <Zap className="w-3 h-3 fill-red-600" />
                급구
              </span>
            )}
            <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {job.business.logo} {job.business.name}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <form action={handleDelete}>
          <Button
            variant="outline"
            type="submit"
            className="text-destructive border-destructive/30 hover:bg-destructive/5"
          >
            <Trash2 className="w-4 h-4" />
            삭제
          </Button>
        </form>
        <Button
          className="bg-teal text-white hover:bg-teal/90 ml-auto"
          asChild
        >
          <Link href={`/biz/posts/${id}/applicants`}>
            <Users className="w-4 h-4" />
            지원자 보기 ({job.appliedCount})
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>공고 상세</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                {job.description}
              </p>

              {job.duties.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-bold text-muted-foreground mb-2">
                    주요 업무
                  </p>
                  <ul className="list-inside list-disc text-sm text-foreground space-y-0.5">
                    {job.duties.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {job.requirements.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-muted-foreground mb-2">
                    지원 조건
                  </p>
                  <ul className="list-inside list-disc text-sm text-foreground space-y-0.5">
                    {job.requirements.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {job.dressCode && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-muted-foreground mb-1">
                    복장
                  </p>
                  <p className="text-sm text-foreground">{job.dressCode}</p>
                </div>
              )}

              {job.whatToBring.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-muted-foreground mb-2">
                    준비물
                  </p>
                  <ul className="list-inside list-disc text-sm text-foreground space-y-0.5">
                    {job.whatToBring.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {job.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-5">
                  {job.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      <Tag className="w-3 h-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">공고 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">카테고리</p>
                  <p className="text-sm font-medium">{job.category}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">근무 위치</p>
                  <p className="text-sm font-medium">
                    {job.business.address}
                    {job.business.addressDetail
                      ? ` ${job.business.addressDetail}`
                      : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Wallet className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">급여</p>
                  <p className="text-sm font-medium">
                    시급 {job.hourlyPay.toLocaleString()}원
                    {job.transportFee > 0
                      ? ` · 교통비 ${job.transportFee.toLocaleString()}원`
                      : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">근무 시간</p>
                  <p className="text-sm font-medium">
                    {job.startTime} ~ {job.endTime} ({job.workHours}시간)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">모집 인원</p>
                  <p className="text-sm font-medium">
                    {job.filled}/{job.headcount}명
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">근무일</p>
                  <p className="text-sm font-medium">{job.workDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
