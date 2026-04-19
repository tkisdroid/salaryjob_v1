import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { CeleryMark } from "@/components/brand/celery-mark";
import { JobListInfinite } from "@/components/worker/job-list-infinite";
import { buttonVariants } from "@/components/ui/button-variants";
import { getJobsPaginated } from "@/lib/db/queries";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/shared/reveal";
import {
  IconOneTap,
  IconNearby,
  IconInstantPay,
  IconVerified,
  IconExplore,
  IconApply,
  IconCheckin,
  IconSettlement,
  IconTeam,
  IconManage,
  IconStore,
  IconSparkle,
} from "@/components/icons/animated-icons";

export const dynamic = "force-dynamic";

function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

function formatDayLabel(workDate: string): string {
  const date = new Date(workDate);
  return date.toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}

// ── 타이포 토큰 (Premium 정합) ────────────────────────────────────────────
const T = {
  h1: "text-[clamp(2.1rem,5.5vw+0.5rem,3.75rem)] font-extrabold leading-[1.1] tracking-[-0.045em] text-ink",
  h2: "text-[clamp(1.625rem,2.4vw+0.75rem,2.125rem)] font-extrabold leading-[1.15] tracking-[-0.035em] text-ink",
  h2Climax:
    "text-[clamp(1.875rem,3vw+0.75rem,2.625rem)] font-extrabold leading-[1.1] tracking-[-0.04em] text-ink",
  h3: "text-[17px] sm:text-[18px] font-extrabold leading-[1.35] tracking-[-0.02em] text-ink",
  eyebrow: "text-[11px] font-extrabold uppercase tracking-[0.2em] text-brand-deep",
  lead: "text-[15px] sm:text-base leading-[1.7] text-muted-foreground font-medium",
  body: "text-[15px] leading-[1.7] text-muted-foreground",
  bodySm: "text-sm leading-[1.7] text-muted-foreground",
  hint: "text-[12px] leading-[1.5] text-muted-foreground font-medium",
  numeric: "tabular-nums tracking-tight",
} as const;

const NAV_HOVER =
  "hover:text-ink transition-colors rounded-full px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:bg-surface-2";

// 카드 공통 — 프리미엄 surface + border-soft
const CARD_BASE =
  "group flex h-full flex-col rounded-[22px] border border-border-soft bg-surface p-6 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-ink hover:shadow-soft-md";

const ICON_TILE_BASE =
  "flex h-11 w-11 items-center justify-center rounded-[14px] transition-[background-color,color,transform] duration-300 group-hover:text-white group-hover:scale-110";

// semantic 분배: brand=속도/핵심, teal=신뢰/매장, amber=돈/시간, lime=인증
const iconTile = {
  brand: "bg-brand/10 text-brand group-hover:bg-brand",
  teal: "bg-teal-light text-[var(--teal-deep)] group-hover:bg-teal",
  amber:
    "bg-[var(--amber-light)] text-[var(--amber-deep)] group-hover:bg-[var(--amber)]",
  lime:
    "bg-[var(--lime-light)] text-[var(--lime-deep)] group-hover:bg-[var(--lime-accent)]",
} as const;

type Tone = keyof typeof iconTile;

// Section padding 공통 — Hero 제외 전 섹션 동일 리듬
const SECTION_PY = "py-20 md:py-24";
const SECTION_PY_TIGHT = "py-16 md:py-20"; // Stats 같은 band

export default async function LandingPage() {
  const { jobs, nextCursor } = await getJobsPaginated({ limit: 12 });
  const featuredJobs = jobs.slice(0, 3);
  const uniqueBusinesses = new Set(jobs.map((job) => job.businessId)).size;
  const averageHourlyPay =
    jobs.length > 0
      ? Math.round(
          jobs.reduce((sum, job) => sum + job.hourlyPay, 0) / jobs.length,
        )
      : 0;

  const valueCards: Array<{
    Icon: typeof IconOneTap;
    title: string;
    description: string;
    tone: Tone;
  }> = [
    {
      Icon: IconOneTap,
      title: "원탭 지원",
      description:
        "이력서도 면접도 없어요. 조건이 맞으면 버튼 한 번으로 지원이 끝납니다.",
      tone: "brand",
    },
    {
      Icon: IconNearby,
      title: "내 주변만",
      description:
        "위치 기반으로 걸어갈 수 있는 거리의 일만 골라서 보여드려요.",
      tone: "teal",
    },
    {
      Icon: IconInstantPay,
      title: "즉시 정산",
      description:
        "근무가 끝나면 시급·교통비·야간 할증까지 계산해 바로 입금됩니다.",
      tone: "amber",
    },
    {
      Icon: IconVerified,
      title: "검증된 사업장",
      description:
        "실제 근무한 사람들의 평점과 리뷰로 안심하고 지원할 수 있어요.",
      tone: "lime",
    },
  ];

  const workerFlow: Array<{
    number: string;
    title: string;
    description: string;
    Icon: typeof IconExplore;
    tone: Tone;
  }> = [
    {
      number: "01",
      title: "내 주변 일자리 탐색",
      description: "집에서 가까운 순서로, 오늘 가능한 일부터 먼저 보여드려요.",
      Icon: IconExplore,
      tone: "brand",
    },
    {
      number: "02",
      title: "원탭으로 지원",
      description: "시급과 근무 시간만 확인하면 끝. 서류 없이 바로 확정됩니다.",
      Icon: IconApply,
      tone: "lime", // 지원 확정 = 인증 성취 모멘트
    },
    {
      number: "03",
      title: "근무는 QR 체크인",
      description: "매장에서 QR만 찍으면 출근 인증. 복잡한 절차 없이 시작해요.",
      Icon: IconCheckin,
      tone: "teal",
    },
    {
      number: "04",
      title: "끝나면 즉시 정산",
      description: "시간과 금액이 자동 계산돼 계좌로 바로 입금됩니다.",
      Icon: IconSettlement,
      tone: "amber",
    },
  ];

  const businessValue = [
    {
      Icon: IconTeam,
      title: "몇 분 안에 인력 확보",
      description: "공고 등록 후 평균 수 분 내 지원이 들어옵니다.",
    },
    {
      Icon: IconManage,
      title: "지원자 한눈에 관리",
      description:
        "누가 지원했고 누가 확정됐는지 카드 한 장으로 정리해 보여드려요.",
    },
    {
      Icon: IconSettlement,
      title: "근태·정산 자동 연동",
      description: "체크인부터 정산까지 모든 기록이 자동으로 이어집니다.",
    },
    {
      Icon: IconApply,
      title: "반복 채용은 한 번에",
      description:
        "자주 쓰는 공고는 저장해두고 다음에도 탭 한 번으로 다시 올립니다.",
    },
  ];

  const trustStats: Array<{
    value: string;
    label: string;
    hint: string;
    tone: Tone;
  }> = [
    {
      value: `${jobs.length}+`,
      label: "실시간 공고",
      hint: "지금 이 시간 모집 중",
      tone: "brand",
    },
    {
      value: `${uniqueBusinesses}+`,
      label: "참여 사업장",
      hint: "인증 완료된 매장",
      tone: "teal",
    },
    {
      value: averageHourlyPay > 0 ? formatWon(averageHourlyPay) : "—",
      label: "평균 시급",
      hint: "공개 공고 기준",
      tone: "amber",
    },
    {
      value: "3분",
      label: "지원까지",
      hint: "탐색부터 원탭 지원까지",
      tone: "lime",
    },
  ];

  const statValueText: Record<Tone, string> = {
    brand: "text-brand",
    teal: "text-[var(--teal-deep)]",
    amber: "text-[var(--amber-deep)]",
    lime: "text-[var(--lime-deep)]",
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* ─── Header (premium: blur sticky + wordmark with dot) ──────── */}
      <header className="sticky top-0 z-50 border-b border-border-soft bg-[color-mix(in_oklch,var(--bg)_85%,transparent)] [backdrop-filter:saturate(1.4)_blur(12px)]">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-6">
          <Link
            href="/"
            className="group flex items-center gap-[11px] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="grid h-[38px] w-[38px] place-items-center rounded-[12px] border border-border bg-surface transition-transform duration-300 group-hover:-rotate-6">
              <CeleryMark className="h-[22px] w-[22px] text-brand" />
            </span>
            <div className="leading-tight">
              <p className="flex items-baseline gap-px text-[19px] font-extrabold tracking-[-0.035em] text-ink">
                샐러리잡
                <span className="ml-[3px] inline-block h-[5px] w-[5px] -translate-y-[1px] rounded-full bg-brand" />
              </p>
              <p className="mt-1 text-[10.5px] font-semibold tracking-tight text-muted-foreground">
                내 주변 로컬 잡
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1.5 text-[14px] font-semibold text-muted-foreground md:flex">
            <a href="#worker" className={NAV_HOVER}>
              일자리 찾기
            </a>
            <a href="#flow" className={NAV_HOVER}>
              이용 방법
            </a>
            <a href="#business" className={NAV_HOVER}>
              사업자 등록
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              로그인
            </Link>
            <Link
              href="/login?next=/home"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              시작하기
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ─── Hero ────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-light via-background to-mint-bg" />
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand/5 blur-3xl animate-float" />
          <div className="absolute -bottom-20 -left-12 w-72 h-72 rounded-full bg-brand/[0.08] blur-3xl animate-float [animation-delay:1.5s]" />
          {/* 온도 대비: lime 한 방울 */}
          <div className="absolute top-1/3 left-1/4 w-40 h-40 rounded-full bg-[var(--lime-accent)]/[0.08] blur-3xl animate-float [animation-delay:3s]" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 sm:px-6 py-20 md:grid-cols-[1.15fr_0.85fr] md:py-28">
            <div className="max-w-2xl">
              <Reveal>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-[14px] py-2 text-[12px] font-bold tracking-tight text-ink shadow-soft-sm">
                  <span className="inline-block h-[7px] w-[7px] rounded-full bg-brand shadow-[0_0_0_4px_color-mix(in_oklch,var(--brand)_25%,transparent)]" />
                  산뜻한 로컬 잡 플랫폼
                  <IconSparkle className="h-3.5 w-3.5 text-brand-deep" />
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <h1 className={T.h1}>
                  <span className="block">내 주변 일자리,</span>
                  <span className="block text-brand-deep">
                    더 가볍고 빠르게
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={0.2}>
                <p className={cn("mt-6 max-w-md", T.lead)}>
                  이력서도 면접도 없이, 오늘 가능한 일부터 탭 한 번으로.
                  근무가 끝나면 바로 정산까지.
                </p>
              </Reveal>

              <Reveal delay={0.3}>
                <div className="mt-8 flex w-full flex-col gap-2.5 sm:flex-row sm:gap-3">
                  <Link
                    href="/login?next=/home"
                    className={cn(
                      buttonVariants({ variant: "brand", size: "lg" }),
                      "h-12 w-full px-6 sm:w-auto",
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      내 주변 일자리 보기
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                  <Link
                    href="/signup?role=business"
                    className={cn(
                      buttonVariants({ variant: "ghost-premium", size: "lg" }),
                      "h-12 w-full px-6 sm:w-auto",
                    )}
                  >
                    사업자로 시작하기
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={0.4}>
                {/* 모바일: 세로 리스트 (텍스트 잘림 방지) · sm+: 가로 3칸 grid */}
                <ul className="mt-7 flex flex-col gap-1.5 text-[13px] text-muted-foreground sm:grid sm:grid-cols-3 sm:gap-2.5">
                  {["이력서·면접 제로", "당일 근무 가능", "근무 후 즉시 정산"].map(
                    (text) => (
                      <li
                        key={text}
                        className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand" />
                        <span className="font-medium">{text}</span>
                      </li>
                    ),
                  )}
                </ul>
              </Reveal>
            </div>

            {/* Hero illustration — phone mockup (desktop only) */}
            <Reveal
              delay={0.3}
              className="hidden md:flex items-center justify-center"
            >
              <div className="animate-float-soft">
                <div className="absolute inset-0 rounded-[2.5rem] bg-brand/10 blur-2xl scale-95" />
                <div className="relative w-72 h-[500px] rounded-[2.5rem] border-[6px] border-foreground/10 bg-card shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-brand/15 to-brand/5 p-4 flex items-center gap-3">
                    <CeleryMark className="h-8 w-8 text-brand" />
                    <div className="leading-tight">
                      <p className="text-[13px] font-bold tracking-[-0.01em]">
                        샐러리잡
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        내 주변 일자리
                      </p>
                    </div>
                  </div>
                  <div className="p-3 space-y-3">
                    {featuredJobs.length > 0
                      ? featuredJobs.map((job) => (
                          <div
                            key={job.id}
                            className="rounded-2xl border border-border bg-card p-3 hover:shadow-md transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5"
                          >
                            <p className="text-[11px] text-muted-foreground">
                              {job.business.name}
                            </p>
                            <p className="text-[13px] font-bold mt-0.5 tracking-[-0.01em]">
                              {job.title}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDayLabel(job.workDate)} {job.startTime}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                              <span className="text-[11px] text-muted-foreground">
                                시급
                              </span>
                              <span
                                className={cn(
                                  "text-[13px] font-bold text-brand",
                                  T.numeric,
                                )}
                              >
                                {formatWon(job.hourlyPay)}
                              </span>
                            </div>
                          </div>
                        ))
                      : [
                          {
                            name: "커피빈 강남점",
                            role: "바리스타",
                            pay: "13,000원/시간",
                            time: "오늘 14:00~18:00",
                          },
                          {
                            name: "올리브영 역삼점",
                            role: "진열 알바",
                            pay: "12,500원/시간",
                            time: "내일 09:00~13:00",
                          },
                          {
                            name: "GS25 선릉역점",
                            role: "편의점 알바",
                            pay: "11,000원/시간",
                            time: "오늘 18:00~22:00",
                          },
                        ].map((job) => (
                          <div
                            key={job.name}
                            className="rounded-2xl border border-border bg-card p-3 hover:shadow-md transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5"
                          >
                            <p className="text-[11px] text-muted-foreground">
                              {job.name}
                            </p>
                            <p className="text-[13px] font-bold mt-0.5 tracking-[-0.01em]">
                              {job.role}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {job.time}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                              <span className="text-[11px] text-muted-foreground">
                                시급
                              </span>
                              <span
                                className={cn(
                                  "text-[13px] font-bold text-brand",
                                  T.numeric,
                                )}
                              >
                                {job.pay}
                              </span>
                            </div>
                          </div>
                        ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ─── Trust Stats ─────────────────────────────────────────────── */}
        <section
          className="border-t border-border/60"
          aria-label="서비스 현황"
        >
          <div className={cn("mx-auto max-w-6xl px-5 sm:px-6", SECTION_PY_TIGHT)}>
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
              {trustStats.map((stat, i) => (
                <li key={stat.label} className="h-full">
                  <Reveal delay={i * 0.07} className="h-full">
                    <div className="flex h-full flex-col justify-center rounded-2xl border border-border bg-card px-5 py-6 text-center transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.07)]">
                      <p
                        className={cn(
                          "text-[28px] md:text-[32px] font-extrabold leading-none",
                          statValueText[stat.tone],
                          T.numeric,
                        )}
                      >
                        <span className="sr-only">{stat.label}: </span>
                        {stat.value}
                      </p>
                      <p
                        className="mt-2.5 text-[13px] font-semibold tracking-[-0.005em] text-foreground"
                        aria-hidden="true"
                      >
                        {stat.label}
                      </p>
                      <p className={cn("mt-1", T.hint)}>{stat.hint}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ─── Value Cards (FOR WORKERS) ──────────────────────────────── */}
        <section
          id="worker"
          className="border-t border-border/60 scroll-mt-20"
        >
          <div className={cn("mx-auto max-w-6xl px-5 sm:px-6", SECTION_PY)}>
            <Reveal>
              <div className="mb-12 text-center">
                <p className={T.eyebrow}>FOR WORKERS</p>
                <h2 className={cn("mt-3", T.h2)}>왜 샐러리잡인가요?</h2>
                <p className={cn("mt-4 max-w-lg mx-auto", T.body)}>
                  복잡한 과정 없이, 내 주변 일자리를 가장 빠르게 연결합니다.
                </p>
              </div>
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {valueCards.map((card, i) => (
                <Reveal
                  key={card.title}
                  delay={0.08 + i * 0.07}
                  className="h-full"
                >
                  <div className={CARD_BASE}>
                    <div className={cn(ICON_TILE_BASE, iconTile[card.tone])}>
                      <card.Icon className="h-5 w-5" />
                    </div>
                    <h3 className={cn("mt-5", T.h3)}>{card.title}</h3>
                    <p className={cn("mt-2 flex-1", T.bodySm)}>
                      {card.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How it works ────────────────────────────────────────────── */}
        <section
          id="flow"
          className="border-t border-border/60 bg-mint-bg/30 scroll-mt-20"
        >
          <div className={cn("mx-auto max-w-6xl px-5 sm:px-6", SECTION_PY)}>
            <Reveal>
              <div className="mb-12 text-center">
                <p className={T.eyebrow}>HOW IT WORKS</p>
                <h2 className={cn("mt-3", T.h2)}>이렇게 쉬워요</h2>
              </div>
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {workerFlow.map((step, i) => (
                <Reveal
                  key={step.number}
                  delay={0.06 + i * 0.08}
                  className="h-full"
                >
                  <div className={CARD_BASE}>
                    <div className="flex items-center gap-3">
                      <div className={cn(ICON_TILE_BASE, iconTile[step.tone])}>
                        <step.Icon className="h-5 w-5" />
                      </div>
                      <span
                        className={cn(
                          "text-[32px] leading-none font-extrabold text-foreground/15 transition-colors duration-300 group-hover:text-foreground/25",
                          T.numeric,
                        )}
                        aria-hidden="true"
                      >
                        {step.number}
                      </span>
                    </div>
                    <h3 className={cn("mt-5", T.h3)}>
                      <span className="sr-only">
                        {step.number} 단계:{" "}
                      </span>
                      {step.title}
                    </h3>
                    <p className={cn("mt-2 flex-1", T.bodySm)}>
                      {step.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={0.4}>
              <div className="mt-12 text-center">
                <Link
                  href="/login?next=/home"
                  className={cn(
                    buttonVariants({ variant: "brand", size: "lg" }),
                    "h-12 px-8",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    지금 바로 일하기
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ─── Business section ─────────────────────────────────────────── */}
        <section
          id="business"
          className="border-t border-border-soft scroll-mt-20 bg-surface-2"
        >
          <div className={cn("mx-auto max-w-6xl px-5 sm:px-6", SECTION_PY)}>
            <Reveal>
              <div className="mb-12 text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-[14px] py-2 text-[12px] font-bold tracking-tight text-ink shadow-soft-sm">
                  <IconStore className="h-3.5 w-3.5 text-brand-deep" />
                  사업자 전용
                </div>
                <h2 className={T.h2}>인력이 급할 땐, 샐러리잡</h2>
                <p className={cn("mt-4 max-w-lg mx-auto", T.body)}>
                  공고를 올리면 주변 인력이 바로 지원합니다. 관리부터 정산까지 한 곳에서.
                </p>
              </div>
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {businessValue.map((card, i) => (
                <Reveal
                  key={card.title}
                  delay={0.08 + i * 0.07}
                  className="h-full"
                >
                  <div className={CARD_BASE}>
                    <div className={cn(ICON_TILE_BASE, iconTile.teal)}>
                      <card.Icon className="h-5 w-5" />
                    </div>
                    <h3 className={cn("mt-5", T.h3)}>{card.title}</h3>
                    <p className={cn("mt-2 flex-1", T.bodySm)}>
                      {card.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={0.3}>
              <div className="mt-12 text-center">
                <Link
                  href="/signup?role=business"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-12 px-8",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    사업자로 시작하기
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ─── Live Feed ───────────────────────────────────────────────── */}
        <section className="border-t border-border-soft">
          <div className={cn("mx-auto max-w-6xl px-5 sm:px-6", SECTION_PY)}>
            <Reveal>
              <div className="mb-10">
                <p className={T.eyebrow}>LIVE FEED</p>
                <h2 className={cn("mt-3", T.h2)}>지금 공개된 공고</h2>
                <p className={cn("mt-4 max-w-xl", T.body)}>
                  바로 지원 가능한 공고를 실시간으로 확인하세요.
                </p>
              </div>
            </Reveal>

            <div className="rounded-[28px] border border-border-soft bg-surface p-4 md:p-6">
              <JobListInfinite
                initialJobs={jobs}
                initialCursor={nextCursor}
                jobHrefBase="/posts"
              />
            </div>
          </div>
        </section>

        {/* ─── Final CTA (ink surface with brand highlight) ──────────── */}
        <section className="border-t border-border-soft bg-ink text-white">
          <div className="mx-auto max-w-5xl px-5 sm:px-6 py-20 text-center md:py-28">
            <CeleryMark className="mx-auto h-14 w-14 text-brand" />
            <h2 className={cn("mt-7 text-white", T.h2Climax.replace("text-ink", ""))}>
              지금 <span className="text-brand">샐러리잡</span> 시작하기
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[15px] font-medium leading-[1.7] text-[color-mix(in_oklch,#fff_75%,transparent)]">
              탭 한 번으로 지원하고, 근무 후 바로 정산까지.
              <br className="hidden sm:block" />
              오늘 가능한 일부터 확인해 보세요.
            </p>
            <div className="mx-auto mt-9 flex w-full max-w-md flex-col justify-center gap-2.5 sm:max-w-none sm:flex-row sm:gap-3">
              <Link
                href="/login?next=/home"
                className={cn(
                  buttonVariants({ variant: "brand", size: "lg" }),
                  "h-12 w-full px-6 sm:w-auto",
                )}
              >
                <span className="flex items-center gap-1.5">
                  가까운 일자리 찾기
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
              <Link
                href="/signup?role=business"
                className="inline-flex h-12 w-full items-center justify-center rounded-full border border-[color-mix(in_oklch,#fff_20%,transparent)] bg-transparent px-6 text-[15px] font-bold text-white transition-all hover:bg-[color-mix(in_oklch,#fff_10%,transparent)] sm:w-auto"
              >
                사업장 등록하기
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Footer ──────────────────────────────────────────────────── */}
        <Reveal>
          <footer className="border-t border-border/60 bg-foreground/[0.02]">
            <div className="mx-auto max-w-6xl px-5 sm:px-6 py-12">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <CeleryMark className="h-7 w-7 text-brand" />
                  <span className="text-[14px] font-bold tracking-[-0.018em]">
                    샐러리잡
                  </span>
                </div>
                <div className="flex gap-6 text-[13px] text-muted-foreground">
                  <Link
                    href="/terms"
                    className="hover:text-foreground transition-colors"
                  >
                    이용약관
                  </Link>
                  <Link
                    href="/privacy"
                    className="hover:text-foreground transition-colors"
                  >
                    개인정보처리방침
                  </Link>
                  <Link
                    href="/licenses"
                    className="hover:text-foreground transition-colors"
                  >
                    오픈소스 라이선스
                  </Link>
                </div>
              </div>
              <p className={cn("mt-7 text-center", T.hint)}>
                &copy; {new Date().getFullYear()} 샐러리잡. All rights reserved.
              </p>
            </div>
          </footer>
        </Reveal>
      </main>
    </div>
  );
}
