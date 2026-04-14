import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildLoginHref, canRoleAccessPath } from "@/lib/auth/routing";
import { getJobById } from "@/lib/db/queries";
import {
  calculateEarnings,
  formatWorkDate,
  categoryLabel,
} from "@/lib/job-utils";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/shared/back-button";
import { Clock, MapPin, Wallet, CheckCircle2 } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

function isJobExpired(workDate: string, startTime: string): boolean {
  const workDateTime = new Date(`${workDate}T${startTime}:00`);
  return workDateTime.getTime() < Date.now();
}

/**
 * Public job detail route — POST-04 + POST-05.
 *
 * Lives OUTSIDE the (worker) route group so middleware's isAuthPublic allows
 * anonymous access (see src/lib/supabase/middleware.ts — `/posts/` prefix).
 *
 * Calls calculateEarnings directly to satisfy POST-05 earnings display.
 * Renders an expiry badge (POST-06) when the job's workDate + startTime is
 * in the past, even if the row is still status='active' (covers the pg_cron
 * 5-minute lag).
 *
 * The "원탭 지원" button always routes to /login?next=/posts/{id} in Phase 3.
 * Phase 4 (APPL-01) upgrades this to a real applyToJob Server Action.
 */
export default async function PublicJobDetailPage({ params }: Props) {
  const { id } = await params;
  const job = await getJobById(id);

  if (!job) notFound();

  const applyHref = `/posts/${id}/apply`;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let applyCtaHref = buildLoginHref(applyHref);
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (canRoleAccessPath(dbUser?.role, applyHref)) {
      applyCtaHref = applyHref;
    }
  }

  // Render-time expiry check — independent of pg_cron sweep interval.
  const isExpired = isJobExpired(job.workDate, job.startTime);
  const earnings = calculateEarnings(job);
  const spotsLeft = Math.max(0, job.headcount - job.filled);

  return (
    <main className="mx-auto max-w-2xl px-4 py-4 pb-28">
      {/* Header */}
      <nav className="mb-4">
        <BackButton
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent transition-colors"
          fallbackHref="/"
          ariaLabel="공고 목록으로 돌아가기"
        >
          ← 뒤로
        </BackButton>
      </nav>

      {isExpired && (
        <div className="mb-3 rounded-xl border border-dashed border-border bg-muted p-3 text-center text-sm font-bold text-muted-foreground">
          만료된 공고입니다
        </div>
      )}

      {/* Business info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-xl">
          {job.business.logo}
        </div>
        <div>
          <p className="text-sm font-bold">{job.business.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {categoryLabel(job.category)}
          </p>
        </div>
        {job.isUrgent && !isExpired && (
          <span className="ml-auto shrink-0 rounded-full bg-[color:var(--urgent)]/10 px-2.5 py-1 text-xs font-bold text-[color:var(--urgent)]">
            급구
          </span>
        )}
      </div>

      {/* Job title */}
      <h1 className="text-xl font-extrabold mb-4">{job.title}</h1>

      {/* Key info grid — 4 cards with icons */}
      <section className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Wallet className="h-4 w-4" />
            <span className="text-[10px]">예상 수입</span>
          </div>
          <p className="text-lg font-extrabold text-brand">{formatMoney(earnings)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            시급 {formatMoney(job.hourlyPay)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-[10px]">근무 시간</span>
          </div>
          <p className="text-lg font-extrabold">{job.workHours}시간</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {job.startTime}~{job.endTime}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <MapPin className="h-4 w-4" />
            <span className="text-[10px]">근무일</span>
          </div>
          <p className="text-sm font-extrabold">{formatWorkDate(job.workDate)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {spotsLeft}명 남음 / {job.headcount}명
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <span className="text-[10px]">💰</span>
            <span className="text-[10px]">교통비</span>
          </div>
          <p className="text-lg font-extrabold">{formatMoney(job.transportFee)}</p>
          {job.nightShiftAllowance && (
            <p className="text-[10px] text-muted-foreground mt-0.5">+ 심야 할증</p>
          )}
        </div>
      </section>

      {/* Description */}
      <section className="mb-6">
        <h2 className="text-sm font-bold mb-2">업무 소개</h2>
        <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
          <p className="whitespace-pre-wrap">{job.description}</p>
          {job.duties.length > 0 && (
            <ul className="mt-3 space-y-2">
              {job.duties.map((d, i) => (
                <li key={`${d}-${i}`} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  {d}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {job.requirements.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-bold">지원 조건</h2>
          <div className="rounded-2xl border border-border bg-card p-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {job.requirements.map((r, i) => (
                <li key={`${r}-${i}`} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {job.dressCode && (
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-bold">복장</h2>
          <p className="text-sm text-muted-foreground">{job.dressCode}</p>
        </section>
      )}

      {job.whatToBring.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-bold">준비물</h2>
          <div className="flex flex-wrap gap-1.5">
            {job.whatToBring.map((w, i) => (
              <span
                key={`${w}-${i}`}
                className="rounded-full bg-muted px-2.5 py-1 text-xs"
              >
                {w}
              </span>
            ))}
          </div>
        </section>
      )}

      {job.tags.length > 0 && (
        <section className="mb-5">
          <div className="flex flex-wrap gap-1.5">
            {job.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border px-2 py-0.5 text-xs font-medium"
              >
                #{t}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold">근무 장소</h2>
        <p className="text-sm text-muted-foreground">{job.business.address}</p>
        {job.business.addressDetail && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {job.business.addressDetail}
          </p>
        )}
      </section>

      {/* Sticky CTA */}
      {!isExpired && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-2xl">
            <Link
              href={applyCtaHref}
              className="block w-full h-12 rounded-xl bg-brand text-center font-bold text-white shadow-lg shadow-brand/20 hover:bg-brand-dark leading-[3rem] text-base"
            >
              원탭 지원하기
            </Link>
            {!user && (
              <p className="mt-1 text-center text-xs text-muted-foreground">
                로그인 후 즉시 확정됩니다
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
