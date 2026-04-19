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
import { JobLocationCard } from "./job-location-card";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  MapPin,
  Wallet,
  Banknote,
  Users,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

const DETAIL_PAGE_WIDTH = "max-w-3xl";

function isJobExpired(workDate: string, startTime: string): boolean {
  const workDateTime = new Date(`${workDate}T${startTime}:00`);
  return workDateTime.getTime() < Date.now();
}

// ── 타이포 토큰 (Premium 디자인 정합) ─────────────────────────────────────
const T = {
  h1: "text-[22px] sm:text-[28px] font-extrabold leading-[1.2] tracking-[-0.035em] text-ink",
  h2: "text-[15px] font-extrabold tracking-[-0.02em] text-ink",
  body: "text-[15px] leading-[1.7] text-muted-foreground",
  bodySm: "text-[14px] leading-[1.65] text-muted-foreground",
  micro: "text-[12px] font-medium text-muted-foreground",
  kpi: "text-[17px] font-extrabold leading-[1.2] tracking-[-0.025em] text-ink",
  numeric: "tabular-nums tracking-tight",
};

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

  const isExpired = isJobExpired(job.workDate, job.startTime);
  const earnings = calculateEarnings(job);
  const spotsLeft = Math.max(0, job.headcount - job.filled);
  const isFull = spotsLeft === 0;
  const ctaDisabled = isExpired || isFull;

  return (
    <main
      className={cn("mx-auto w-full px-5 pb-28 pt-4 sm:px-6", DETAIL_PAGE_WIDTH)}
    >
      {/* ── Back button (premium ink-hover pill) ─────────────────────── */}
      <nav className="mb-5">
        <BackButton
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-[13px] font-bold text-ink transition-colors hover:border-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          fallbackHref="/"
          ariaLabel="공고 목록으로 돌아가기"
        >
          <ArrowLeft className="h-4 w-4" />
          목록으로
        </BackButton>
      </nav>

      {(isExpired || isFull) && (
        <div
          role="status"
          className={cn(
            "mb-4 rounded-[14px] border border-dashed px-4 py-3 text-center text-[13px] font-bold",
            isExpired
              ? "border-border bg-surface-2 text-muted-foreground"
              : "border-[var(--amber)]/30 bg-[var(--amber-light)] text-[var(--amber-deep)]",
          )}
        >
          {isExpired ? "만료된 공고입니다" : "모집이 마감되었습니다"}
        </div>
      )}

      {/* ── Business header with brand-tint logo + lime-chip 급구 ─── */}
      <header className="mb-5 flex items-center gap-3">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] border border-border-soft bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-xl"
          aria-hidden="true"
        >
          {job.business.logo}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold tracking-[-0.02em] text-ink">
            {job.business.name}
          </p>
          <p className="text-[12px] font-semibold text-muted-foreground">
            {categoryLabel(job.category)}
          </p>
        </div>
        {job.isUrgent && !isExpired && (
          <span className="shrink-0 rounded-full bg-lime-chip px-3 py-1 text-[11px] font-extrabold tracking-tight text-lime-chip-fg">
            급구
          </span>
        )}
      </header>

      {/* ── Job title (premium 28px extrabold) ───────────────────────── */}
      <h1 className={cn("mb-6", T.h1)}>{job.title}</h1>

      {/* ── Key info grid (4 cards, 통일된 value 크기) ──────────────── */}
      <section className="mb-7 grid grid-cols-2 gap-3">
        <InfoCard icon={<Wallet className="h-4 w-4" />} label="예상 수입" highlight>
          <p className={cn("text-brand-deep", T.kpi, T.numeric)}>
            {formatMoney(earnings)}
          </p>
          <p className={cn("mt-1", T.micro)}>
            시급{" "}
            <span className={cn(T.numeric, "font-bold text-ink")}>
              {formatMoney(job.hourlyPay)}
            </span>
          </p>
        </InfoCard>

        <InfoCard icon={<Clock className="h-4 w-4" />} label="근무 시간">
          <p className={T.kpi}>
            <span className={T.numeric}>{job.workHours}</span>시간
          </p>
          <p className={cn("mt-1", T.micro, T.numeric)}>
            {job.startTime}~{job.endTime}
          </p>
        </InfoCard>

        <InfoCard icon={<CalendarDays className="h-4 w-4" />} label="근무일">
          <p className={T.kpi}>{formatWorkDate(job.workDate)}</p>
          <p className={cn("mt-1 flex items-center gap-1", T.micro)}>
            <Users className="h-3 w-3" />
            <span>
              <span className={cn("font-extrabold text-ink", T.numeric)}>
                {spotsLeft}
              </span>
              명 남음 · 총{" "}
              <span className={T.numeric}>{job.headcount}</span>명
            </span>
          </p>
        </InfoCard>

        <InfoCard icon={<Banknote className="h-4 w-4" />} label="교통비">
          <p className={cn(T.kpi, T.numeric)}>
            {formatMoney(job.transportFee)}
          </p>
          {job.nightShiftAllowance && (
            <p className={cn("mt-1", T.micro)}>＋ 심야 할증 포함</p>
          )}
        </InfoCard>
      </section>

      {/* ── Location ───────────────────────────────────────────────── */}
      <section className="mb-7">
        <h2 className={cn("mb-2.5 flex items-center gap-1.5", T.h2)}>
          <MapPin className="h-4 w-4 text-muted-foreground" />
          근무 장소
        </h2>
        <JobLocationCard
          businessName={job.business.name}
          address={job.business.address}
          addressDetail={job.business.addressDetail}
          lat={job.business.lat}
          lng={job.business.lng}
        />
      </section>

      {/* ── Description ─────────────────────────────────────────────── */}
      <section className="mb-7">
        <h2 className={cn("mb-2.5", T.h2)}>업무 소개</h2>
        <div className="rounded-[22px] border border-border-soft bg-surface p-5">
          <p className={cn("whitespace-pre-wrap", T.body)}>
            {job.description}
          </p>
          {job.duties.length > 0 && (
            <ul className="mt-4 space-y-2.5">
              {job.duties.map((d, i) => (
                <li
                  key={`${d}-${i}`}
                  className={cn("flex items-start gap-2", T.bodySm, "text-ink")}
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-deep" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Requirements ────────────────────────────────────────────── */}
      {job.requirements.length > 0 && (
        <section className="mb-7">
          <h2 className={cn("mb-2.5", T.h2)}>지원 조건</h2>
          <div className="rounded-[22px] border border-border-soft bg-surface p-5">
            <ul className="space-y-2.5">
              {job.requirements.map((r, i) => (
                <li
                  key={`${r}-${i}`}
                  className={cn("flex items-start gap-2", T.bodySm, "text-ink")}
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-deep" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Dress code & What to bring ──────────────────────────────── */}
      {(job.dressCode || job.whatToBring.length > 0) && (
        <section className="mb-7 grid gap-4 sm:grid-cols-2">
          {job.dressCode && (
            <div>
              <h2 className={cn("mb-2", T.h2)}>복장</h2>
              <p className={T.bodySm}>{job.dressCode}</p>
            </div>
          )}
          {job.whatToBring.length > 0 && (
            <div>
              <h2 className={cn("mb-2", T.h2)}>준비물</h2>
              <div className="flex flex-wrap gap-1.5">
                {job.whatToBring.map((w, i) => (
                  <span
                    key={`${w}-${i}`}
                    className="rounded-full bg-muted px-3 py-1 text-[12px] font-medium text-foreground"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Tags ────────────────────────────────────────────────────── */}
      {job.tags.length > 0 && (
        <section className="mb-7 flex flex-wrap gap-1.5">
          {job.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-[11.5px] font-bold tracking-tight text-ink"
            >
              #{t}
            </span>
          ))}
        </section>
      )}

      {/* ── Sticky CTA — premium: brand pill with arrow, ink-style footer ── */}
      {!ctaDisabled && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border-soft bg-[color-mix(in_oklch,var(--surface)_96%,transparent)] [backdrop-filter:saturate(1.6)_blur(16px)] pb-[env(safe-area-inset-bottom)]">
          <div
            className={cn(
              "mx-auto flex items-center gap-3 px-5 py-3 sm:px-6",
              DETAIL_PAGE_WIDTH,
            )}
          >
            {/* 요약 — 데스크톱/큰 모바일에서 가격 미리보기 */}
            <div className="hidden min-w-0 flex-1 sm:block">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                예상 수입
              </p>
              <p className={cn("text-[18px] font-extrabold text-brand-deep", T.numeric)}>
                {formatMoney(earnings)}
              </p>
            </div>

            <Link
              href={applyCtaHref}
              className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-brand px-6 text-[15px] font-bold text-ink transition-all hover:bg-brand-dark hover:text-white hover:shadow-soft-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-none sm:px-7"
            >
              원탭 지원하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {!user && (
            <p className="px-5 pb-3 text-center text-[12px] font-semibold text-muted-foreground sm:px-6">
              로그인 후 즉시 확정됩니다
            </p>
          )}
        </div>
      )}
    </main>
  );
}

// ── InfoCard primitive ─────────────────────────────────────────────────────
function InfoCard({
  icon,
  label,
  children,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border p-4 transition-colors",
        highlight
          ? "border-border bg-[color-mix(in_oklch,var(--brand)_6%,var(--surface))]"
          : "border-border-soft bg-surface",
      )}
    >
      <div className="mb-2 flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[12px] font-bold tracking-tight">{label}</span>
      </div>
      {children}
    </div>
  );
}
