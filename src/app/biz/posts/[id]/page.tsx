import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronLeft,
  MapPin,
  Clock,
  Wallet,
  Calendar,
  LayoutList,
  Users,
  Trash2,
  Flame,
  ChevronRight,
  Tag,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireBusiness } from "@/lib/dal";
import { getJobById } from "@/lib/db/queries";
import { prisma } from "@/lib/db";
import { deleteJob } from "../actions";
import { CheckoutQrModal } from "@/components/biz/checkout-qr-modal";

/* ── Helpers ── */

function statusPill(
  filled: number,
  headcount: number,
): { className: string; label: string } {
  if (filled >= headcount) {
    return { className: "bg-surface-2 text-muted-foreground", label: "마감" };
  }
  return { className: "bg-brand text-ink", label: "모집 중" };
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
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-[22px] border border-border bg-surface p-6 text-center">
          <p className="mb-4 text-[14px] font-semibold text-muted-foreground">
            공고를 찾을 수 없습니다.
          </p>
          <Button variant="ghost-premium" size="sm" asChild>
            <Link href="/biz/posts">
              <ChevronLeft className="h-4 w-4" /> 목록으로
            </Link>
          </Button>
        </div>
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

  const pill = statusPill(job.filled, job.headcount);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start gap-3">
        <Link
          href="/biz/posts"
          aria-label="뒤로"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-surface text-ink transition-colors hover:border-ink hover:bg-surface-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-[10px] font-extrabold tracking-tight ${pill.className}`}
            >
              {pill.label}
            </span>
            {job.isUrgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-lime-chip px-[9px] py-[3px] text-[10px] font-extrabold tracking-tight text-lime-chip-fg">
                <Flame className="h-3 w-3" />
                급구
              </span>
            )}
          </div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.035em] text-ink">
            {job.title}
          </h1>
          <p className="mt-1 text-[12px] font-semibold text-muted-foreground">
            {job.business.logo} {job.business.name}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6 flex flex-wrap gap-2">
        <form action={handleDelete}>
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-destructive/30 bg-surface px-3.5 text-[12.5px] font-bold text-destructive transition-colors hover:bg-destructive/5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            삭제
          </button>
        </form>

        <CheckoutQrModal
          jobId={job.id}
          trigger={
            <button
              type="button"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-[12.5px] font-bold text-ink transition-colors hover:border-ink hover:bg-surface-2"
            >
              <QrCode className="h-3.5 w-3.5" />
              퇴근 QR 열기
            </button>
          }
        />

        <Link
          href={`/biz/posts/${id}/applicants`}
          className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12.5px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark"
        >
          <Users className="h-3.5 w-3.5" />
          지원자 보기{" "}
          <span className="tabnum">({job.appliedCount})</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <div className="rounded-[22px] border border-border-soft bg-surface p-5">
            <h2 className="mb-3 text-[14px] font-extrabold tracking-tight text-ink">
              공고 상세
            </h2>
            <div>
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink">
                {job.description}
              </p>

              {job.duties.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-[11.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    주요 업무
                  </p>
                  <ul className="list-inside list-disc space-y-0.5 text-[13.5px] text-ink">
                    {job.duties.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {job.requirements.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-[11.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    지원 조건
                  </p>
                  <ul className="list-inside list-disc space-y-0.5 text-[13.5px] text-ink">
                    {job.requirements.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {job.dressCode && (
                <div className="mt-4">
                  <p className="mb-1 text-[11.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    복장
                  </p>
                  <p className="text-[13.5px] text-ink">{job.dressCode}</p>
                </div>
              )}

              {job.whatToBring.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-[11.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    준비물
                  </p>
                  <ul className="list-inside list-disc space-y-0.5 text-[13.5px] text-ink">
                    {job.whatToBring.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {job.tags.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {job.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-bold tracking-tight text-ink"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[22px] border border-border-soft bg-surface p-5">
            <h2 className="mb-4 text-[14px] font-extrabold tracking-tight text-ink">
              공고 정보
            </h2>
            <div className="space-y-4">
              {[
                {
                  icon: LayoutList,
                  label: "카테고리",
                  value: job.category,
                },
                {
                  icon: MapPin,
                  label: "근무 위치",
                  value: `${job.business.address}${job.business.addressDetail ? ` ${job.business.addressDetail}` : ""}`,
                },
                {
                  icon: Wallet,
                  label: "급여",
                  value: `시급 ${job.hourlyPay.toLocaleString()}원${job.transportFee > 0 ? ` · 교통비 ${job.transportFee.toLocaleString()}원` : ""}`,
                },
                {
                  icon: Clock,
                  label: "근무 시간",
                  value: `${job.startTime} ~ ${job.endTime} (${job.workHours}시간)`,
                },
                {
                  icon: Users,
                  label: "모집 인원",
                  value: `${job.filled}/${job.headcount}명`,
                },
                {
                  icon: Calendar,
                  label: "근무일",
                  value: job.workDate,
                },
              ].map((row) => (
                <div key={row.label} className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep">
                    <row.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                      {row.label}
                    </p>
                    <p className="mt-1 text-[13.5px] font-bold tracking-tight text-ink">
                      {row.value}
                    </p>
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
