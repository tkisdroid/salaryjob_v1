import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Wallet,
  Calendar,
  LayoutList,
  Users,
  Trash2,
  Zap,
  ChevronRight,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireBusiness } from "@/lib/dal";
import { getJobById } from "@/lib/db/queries";
import { prisma } from "@/lib/db";
import { deleteJob } from "../actions";
import { CheckoutQrModal } from "@/components/biz/checkout-qr-modal";
import { QrCode } from "lucide-react";

/* ── Helpers ── */

function statusBadge(
  filled: number,
  headcount: number,
): { className: string; label: string } {
  if (filled >= headcount) {
    return { className: "bg-muted text-muted-foreground", label: "마감" };
  }
  return { className: "border-brand/30 bg-brand/5 text-brand", label: "모집 중" };
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
        <Link href="/biz/posts" className="text-foreground hover:text-brand transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${badge.className}`}
            >
              {badge.label}
            </span>
            {job.isUrgent && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[color:var(--urgent)]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[color:var(--urgent)]">
                <Zap className="h-3 w-3" />
                급구
              </span>
            )}
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">{job.title}</h1>
          </div>
          <p className="text-xs text-muted-foreground ml-0">
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
            size="sm"
            className="h-9 rounded-xl text-xs font-medium border-destructive/30 text-destructive hover:bg-destructive/5"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            삭제
          </Button>
        </form>

        <CheckoutQrModal
          jobId={job.id}
          trigger={
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-medium text-primary-foreground hover:bg-brand-dark"
            >
              <QrCode className="h-3.5 w-3.5" />
              퇴근 QR 열기
            </button>
          }
        />

        <Button size="sm" className="h-9 rounded-xl text-xs font-medium bg-foreground text-background hover:bg-foreground/90 ml-auto" asChild>
          <Link href={`/biz/posts/${id}/applicants`}>
            <Users className="h-3.5 w-3.5 mr-1" />
            지원자 보기 ({job.appliedCount})
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Link>
        </Button>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold mb-3">공고 상세</h2>
            <div>
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
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold mb-4">공고 정보</h2>
            <div className="space-y-4">
              {[
                { icon: LayoutList, label: "카테고리", value: job.category },
                { icon: MapPin, label: "근무 위치", value: `${job.business.address}${job.business.addressDetail ? ` ${job.business.addressDetail}` : ""}` },
                { icon: Wallet, label: "급여", value: `시급 ${job.hourlyPay.toLocaleString()}원${job.transportFee > 0 ? ` · 교통비 ${job.transportFee.toLocaleString()}원` : ""}` },
                { icon: Clock, label: "근무 시간", value: `${job.startTime} ~ ${job.endTime} (${job.workHours}시간)` },
                { icon: Users, label: "모집 인원", value: `${job.filled}/${job.headcount}명` },
                { icon: Calendar, label: "근무일", value: job.workDate },
              ].map((row) => (
                <div key={row.label} className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/5 text-muted-foreground shrink-0">
                    <row.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{row.label}</p>
                    <p className="text-sm font-semibold mt-0.5">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
