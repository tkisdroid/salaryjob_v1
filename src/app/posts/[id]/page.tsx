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
    <main className="mx-auto max-w-2xl p-4 pb-32">
      <nav className="mb-4">
        <Link href="/" className="text-sm text-brand hover:underline">
          ← 목록으로
        </Link>
      </nav>

      {isExpired && (
        <div className="mb-3 rounded border border-gray-300 bg-gray-100 p-3 text-center text-sm font-semibold text-gray-700">
          만료된 공고입니다
        </div>
      )}

      <header className="mb-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight">{job.title}</h1>
          {job.isUrgent && !isExpired && (
            <span className="shrink-0 rounded bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
              급구
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {job.business.logo} {job.business.name} · {categoryLabel(job.category)}
        </p>
      </header>

      {/* Earnings highlight — POST-05 */}
      <section className="mb-6 rounded-xl border border-border bg-card p-5">
        <p className="text-xs text-muted-foreground mb-1">예상 수입</p>
        <p className="text-3xl font-bold text-brand">{formatMoney(earnings)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          시급 {formatMoney(job.hourlyPay)} × {job.workHours}시간
          {job.nightShiftAllowance && " + 심야 할증"}
          {job.transportFee > 0 && ` + 교통비 ${formatMoney(job.transportFee)}`}
        </p>
      </section>

      {/* Key info grid */}
      <section className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">근무일</div>
          <div className="text-sm font-semibold">
            {formatWorkDate(job.workDate)}
          </div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">근무 시간</div>
          <div className="text-sm font-semibold">
            {job.startTime}~{job.endTime} ({job.workHours}h)
          </div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">모집 인원</div>
          <div className="text-sm font-semibold">
            {spotsLeft}명 남음 / {job.headcount}명
          </div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">교통비</div>
          <div className="text-sm font-semibold">
            {formatMoney(job.transportFee)}
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="mb-5">
        <h2 className="mb-2 text-sm font-bold">업무 소개</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {job.description}
        </p>
      </section>

      {job.duties.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-bold">주요 업무</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {job.duties.map((d, i) => (
              <li key={`${d}-${i}`}>{d}</li>
            ))}
          </ul>
        </section>
      )}

      {job.requirements.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-sm font-bold">지원 조건</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {job.requirements.map((r, i) => (
              <li key={`${r}-${i}`}>{r}</li>
            ))}
          </ul>
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

      {!isExpired && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-2xl p-3">
            <Link
              href={applyCtaHref}
              className="block w-full rounded-xl bg-brand p-3 text-center font-bold text-white shadow-lg shadow-brand/20 hover:bg-brand-dark"
            >
              원탭 지원하기
            </Link>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              로그인 후 즉시 확정됩니다
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
