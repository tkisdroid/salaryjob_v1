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

function isJobExpired(workDate: string, startTime: string): boolean {
  const workDateTime = new Date(`${workDate}T${startTime}:00`);
  return workDateTime.getTime() < Date.now();
}

// ── 타이포 토큰 (랜딩 토큰 계열로 정합) ────────────────────────────────────
const T = {
  h1: "text-[22px] sm:text-[26px] font-extrabold leading-[1.25] tracking-[-0.022em]",
  h2: "text-[15px] font-bold tracking-[-0.008em] text-foreground",
  body: "text-[15px] leading-[1.7] text-muted-foreground",
  bodySm: "text-[14px] leading-[1.65] text-muted-foreground",
  micro: "text-[12px] text-muted-foreground",
  kpi: "text-[17px] font-extrabold leading-[1.2] tracking-[-0.01em]",
  numeric: "font-mono tabular-nums tracking-tight",
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
    <main className="mx-auto max-w-2xl px-5 sm:px-6 pb-28 pt-4">
      {/* ── Back button ─────────────────────────────────────────────── */}
      <nav className="mb-5">
        <BackButton
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
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
            "mb-4 rounded-xl border border-dashed px-4 py-3 text-center text-[13px] font-semibold",
            isExpired
              ? "border-border bg-muted text-muted-foreground"
              : "border-[var(--amber)]/30 bg-[var(--amber-light)] text-[var(--amber-deep)]",
          )}
        >
          {isExpired ? "만료된 공고입니다" : "모집이 마감되었습니다"}
        </div>
      )}

      {/* ── Business info + badge ──────────────────────────────────── */}
      <header className="mb-5 flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-xl"
          aria-hidden="true"
        >
          {job.business.logo}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold tracking-[-0.012em] truncate">
            {job.business.name}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {categoryLabel(job.category)}
          </p>
        </div>
        {job.isUrgent && !isExpired && (
          <span className="shrink-0 rounded-full bg-[var(--urgent)]/10 px-3 py-1 text-[12px] font-bold text-[var(--amber-deep)]">
            급구
          </span>
        )}
      </header>

      {/* ── Job title ───────────────────────────────────────────────── */}
      <h1 className={cn("mb-6", T.h1)}>{job.title}</h1>

      {/* ── Key info grid (4 cards, 통일된 value 크기) ──────────────── */}
      <section className="mb-7 grid grid-cols-2 gap-3">
        <InfoCard icon={<Wallet className="h-4 w-4" />} label="예상 수입">
          <p className={cn("text-brand", T.kpi, T.numeric)}>
            {formatMoney(earnings)}
          </p>
          <p className={cn("mt-1", T.micro)}>
            시급 <span className={T.numeric}>{formatMoney(job.hourlyPay)}</span>
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
              <span className={cn("font-bold", T.numeric)}>{spotsLeft}</span>명
              남음 · 총 <span className={T.numeric}>{job.headcount}</span>명
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
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[15px] font-semibold tracking-[-0.008em] text-foreground">
            {job.business.address}
          </p>
          {job.business.addressDetail && (
            <p className={cn("mt-1", T.micro)}>{job.business.addressDetail}</p>
          )}
        </div>
      </section>

      {/* ── Description ─────────────────────────────────────────────── */}
      <section className="mb-7">
        <h2 className={cn("mb-2.5", T.h2)}>업무 소개</h2>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className={cn("whitespace-pre-wrap", T.body)}>
            {job.description}
          </p>
          {job.duties.length > 0 && (
            <ul className="mt-4 space-y-2.5">
              {job.duties.map((d, i) => (
                <li
                  key={`${d}-${i}`}
                  className={cn("flex items-start gap-2", T.bodySm, "text-foreground")}
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
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
          <div className="rounded-2xl border border-border bg-card p-5">
            <ul className="space-y-2.5">
              {job.requirements.map((r, i) => (
                <li
                  key={`${r}-${i}`}
                  className={cn("flex items-start gap-2", T.bodySm, "text-foreground")}
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
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
              className="rounded-full border border-border px-2.5 py-0.5 text-[12px] font-medium text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </section>
      )}

      {/* ── Sticky CTA ──────────────────────────────────────────────── */}
      {!ctaDisabled && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-3 sm:px-6">
            {/* 요약 — 데스크톱/큰 모바일에서 가격 미리보기 */}
            <div className="hidden min-w-0 flex-1 sm:block">
              <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                예상 수입
              </p>
              <p className={cn("text-[17px] font-extrabold text-brand", T.numeric)}>
                {formatMoney(earnings)}
              </p>
            </div>

            <Link
              href={applyCtaHref}
              className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-brand px-6 text-[15px] font-semibold text-primary-foreground shadow-[0_6px_20px_hsl(var(--brand)/0.22)] transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-none sm:px-7"
            >
              원탭 지원하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {!user && (
            <p className="px-5 pb-3 text-center text-[12px] text-muted-foreground sm:px-6">
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
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[12px] font-medium">{label}</span>
      </div>
      {children}
    </div>
  );
}
