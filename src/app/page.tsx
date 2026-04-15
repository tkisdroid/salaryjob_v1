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

const NAV_HOVER =
  "hover:text-foreground transition-colors relative rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background after:content-[''] after:absolute after:w-full after:h-[2px] after:bottom-[-4px] after:left-0 after:bg-brand after:scale-x-0 after:origin-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-left";

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

  const valueCards = [
    {
      Icon: IconOneTap,
      title: "원탭 지원",
      description:
        "이력서도 면접도 없어요. 조건이 맞으면 버튼 한 번으로 지원이 끝납니다.",
    },
    {
      Icon: IconNearby,
      title: "내 주변만",
      description:
        "위치 기반으로 걸어갈 수 있는 거리의 일만 골라서 보여드려요.",
    },
    {
      Icon: IconInstantPay,
      title: "즉시 정산",
      description:
        "근무가 끝나면 시급·교통비·야간 할증까지 계산해 바로 입금됩니다.",
    },
    {
      Icon: IconVerified,
      title: "검증된 사업장",
      description:
        "실제 근무한 사람들의 평점과 리뷰로 안심하고 지원할 수 있어요.",
    },
  ];

  const workerFlow = [
    {
      number: "01",
      title: "내 주변 일자리 탐색",
      description: "집에서 가까운 순서로, 오늘 가능한 일부터 먼저 보여드려요.",
      Icon: IconExplore,
    },
    {
      number: "02",
      title: "원탭으로 지원",
      description: "시급과 근무 시간만 확인하면 끝. 서류 없이 바로 확정됩니다.",
      Icon: IconApply,
    },
    {
      number: "03",
      title: "근무는 QR 체크인",
      description: "매장에서 QR만 찍으면 출근 인증. 복잡한 절차 없이 시작해요.",
      Icon: IconCheckin,
    },
    {
      number: "04",
      title: "끝나면 즉시 정산",
      description: "시간과 금액이 자동 계산돼 계좌로 바로 입금됩니다.",
      Icon: IconSettlement,
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

  const trustStats = [
    {
      value: `${jobs.length}+`,
      label: "실시간 공고",
      hint: "지금 이 시간 모집 중",
    },
    {
      value: `${uniqueBusinesses}+`,
      label: "참여 사업장",
      hint: "인증 완료된 매장",
    },
    {
      value: averageHourlyPay > 0 ? formatWon(averageHourlyPay) : "—",
      label: "평균 시급",
      hint: "공개 공고 기준",
    },
    {
      value: "3분",
      label: "지원까지",
      hint: "탐색부터 원탭 지원까지",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Link href="/" className="flex items-center gap-2 group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <CeleryMark className="h-10 w-10 text-brand transition-transform duration-300 group-hover:rotate-12" />
            <div className="leading-tight">
              <p className="text-base font-bold tracking-tight text-foreground">
                샐러리잡
              </p>
              <p className="text-[10px] text-muted-foreground">
                내 주변 로컬 잡
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#worker" className={NAV_HOVER}>
              일자리 찾기
            </a>
            <a href="#business" className={NAV_HOVER}>
              사업자 등록
            </a>
            <a href="#flow" className={NAV_HOVER}>
              이용 방법
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
              className={cn(
                buttonVariants({ size: "sm" }),
                "rounded-full bg-brand px-4 text-primary-foreground shadow-sm hover:bg-brand-dark shadow-[0_4px_16px_hsl(var(--brand)/0.15)]",
              )}
            >
              시작하기
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ─── Hero ────────────────────────────────────────────────────── */}
        <section className="relative border-b border-border/60 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-light via-background to-mint-bg" />
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand/5 blur-3xl animate-float" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-brand/[0.08] blur-3xl animate-float [animation-delay:1.5s]" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 sm:px-6 py-20 md:grid-cols-[1.15fr_0.85fr] md:py-28">
            <div className="max-w-2xl">
              <Reveal>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-light px-4 py-1.5 text-xs font-semibold text-brand-deep">
                  <IconSparkle className="h-3.5 w-3.5" />
                  샐러리처럼 산뜻한 로컬 잡 플랫폼
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <h1 className="text-[32px] font-extrabold leading-[1.15] tracking-tight text-foreground sm:text-[42px] md:text-[56px]">
                  <span className="block">내 주변 일자리,</span>
                  <span className="block text-brand-deep">
                    더 가볍고 빠르게
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={0.2}>
                <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-base md:text-lg">
                  이력서도 면접도 필요 없어요.
                  <br className="hidden sm:block" />
                  오늘 가능한 일부터 안정적인 근무까지,
                  <br className="hidden sm:block" />
                  탭 한 번으로 지원하고 근무 후 바로 정산받으세요.
                </p>
              </Reveal>

              <Reveal delay={0.3}>
                <div className="mt-7 flex w-full flex-col gap-2.5 sm:flex-row sm:gap-3">
                  <Link
                    href="/login?next=/home"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "h-12 w-full rounded-full bg-brand px-6 text-sm font-semibold text-primary-foreground hover:bg-brand-dark sm:w-auto sm:text-base shadow-[0_6px_24px_hsl(var(--brand)/0.2)]",
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
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "h-12 w-full rounded-full border-brand/30 bg-card px-6 text-sm font-semibold text-brand-deep hover:bg-brand-light sm:w-auto sm:text-base",
                    )}
                  >
                    사업자로 시작하기
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={0.4}>
                <ul className="mt-6 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-3 sm:gap-2.5">
                  {["이력서·면접 제로", "당일 근무 가능", "근무 후 즉시 정산"].map(
                    (text) => (
                      <li
                        key={text}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand" />
                        <span className="truncate">{text}</span>
                      </li>
                    ),
                  )}
                </ul>
              </Reveal>
            </div>

            {/* Hero illustration — phone mockup (desktop only) */}
            <Reveal delay={0.3} className="hidden md:flex items-center justify-center">
              <div className="animate-float-soft">
                <div className="absolute inset-0 rounded-[2.5rem] bg-brand/10 blur-2xl scale-95" />
                <div className="relative w-72 h-[500px] rounded-[2.5rem] border-[6px] border-foreground/10 bg-card shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-brand/15 to-brand/5 p-4 flex items-center gap-3">
                    <CeleryMark className="h-8 w-8 text-brand" />
                    <div>
                      <p className="text-sm font-bold">샐러리잡</p>
                      <p className="text-[10px] text-muted-foreground">
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
                            <p className="text-[10px] text-muted-foreground">
                              {job.business.name}
                            </p>
                            <p className="text-sm font-bold mt-0.5">
                              {job.title}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDayLabel(job.workDate)} {job.startTime}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                              <span className="text-[10px] text-muted-foreground">
                                시급
                              </span>
                              <span className="text-sm font-bold text-brand">
                                {formatWon(job.hourlyPay)}
                              </span>
                            </div>
                          </div>
                        ))
                      : [
                          { name: "커피빈 강남점", role: "바리스타", pay: "13,000원/시간", time: "오늘 14:00~18:00" },
                          { name: "올리브영 역삼점", role: "진열 알바", pay: "12,500원/시간", time: "내일 09:00~13:00" },
                          { name: "GS25 선릉역점", role: "편의점 알바", pay: "11,000원/시간", time: "오늘 18:00~22:00" },
                        ].map((job) => (
                          <div
                            key={job.name}
                            className="rounded-2xl border border-border bg-card p-3 hover:shadow-md transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5"
                          >
                            <p className="text-[10px] text-muted-foreground">
                              {job.name}
                            </p>
                            <p className="text-sm font-bold mt-0.5">
                              {job.role}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {job.time}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                              <span className="text-[10px] text-muted-foreground">
                                시급
                              </span>
                              <span className="text-sm font-bold text-brand">
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
        <section className="border-b border-border/60" aria-label="서비스 현황">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 py-12 md:py-16">
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {trustStats.map((stat, i) => (
                <li key={stat.label}>
                  <Reveal delay={i * 0.07}>
                    <div className="rounded-2xl border border-border bg-card p-5 text-center transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)]">
                      <p className="text-2xl font-extrabold text-brand md:text-3xl">
                        <span className="sr-only">{stat.label}: </span>
                        {stat.value}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground" aria-hidden="true">
                        {stat.label}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {stat.hint}
                      </p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ─── Value Cards (FOR WORKERS) ──────────────────────────────── */}
        <section id="worker" className="border-b border-border/60">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 py-16 md:py-20">
            <Reveal>
              <div className="mb-10 text-center">
                <p className="text-xs font-semibold text-brand uppercase tracking-widest">
                  FOR WORKERS
                </p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">
                  왜 샐러리잡인가요?
                </h2>
                <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
                  복잡한 과정 없이, 내 주변 일자리를 가장 빠르게 연결합니다.
                </p>
              </div>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {valueCards.map((card, i) => (
                <Reveal key={card.title} delay={0.08 + i * 0.07}>
                  <div className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand transition-[background-color,color,transform] duration-300 group-hover:bg-brand group-hover:text-primary-foreground group-hover:scale-110">
                      <card.Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-bold">{card.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {card.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How it works ────────────────────────────────────────────── */}
        <section id="flow" className="border-b border-border/60 bg-mint-bg/30">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 py-16 md:py-20">
            <Reveal>
              <div className="mb-10 text-center">
                <p className="text-xs font-semibold text-brand uppercase tracking-widest">
                  HOW IT WORKS
                </p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">
                  이렇게 쉬워요
                </h2>
              </div>
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {workerFlow.map((step, i) => (
                <Reveal key={step.number} delay={0.06 + i * 0.08}>
                  <div className="group relative flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
                    <span className="text-3xl font-black text-brand/15 transition-colors duration-300 group-hover:text-brand/30">
                      {step.number}
                    </span>
                    <div className="mt-2 flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand transition-[background-color,color,transform] duration-300 group-hover:bg-brand group-hover:text-primary-foreground group-hover:scale-110">
                      <step.Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-base font-bold">{step.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={0.4}>
              <div className="mt-10 text-center">
                <Link
                  href="/login?next=/home"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-12 rounded-full bg-brand px-8 text-sm font-semibold text-primary-foreground hover:bg-brand-dark sm:text-base",
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
        <section id="business" className="border-b border-border/60">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 py-16 md:py-20">
            <Reveal>
              <div className="mb-10 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-light px-4 py-1.5 text-xs font-semibold text-brand-deep mb-4">
                  <IconStore className="h-3.5 w-3.5" />
                  사업자 전용
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
                  인력이 급할 땐, 샐러리잡
                </h2>
                <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
                  공고를 올리면 주변 인력이 바로 지원합니다. 관리부터 정산까지 한
                  곳에서.
                </p>
              </div>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {businessValue.map((card, i) => (
                <Reveal key={card.title} delay={0.08 + i * 0.07}>
                  <div className="group rounded-2xl border border-border bg-card p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-light text-teal transition-[background-color,color,transform] duration-300 group-hover:bg-teal group-hover:text-primary-foreground group-hover:scale-110">
                      <card.Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-bold">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {card.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={0.3}>
              <div className="mt-10 text-center">
                <Link
                  href="/signup?role=business"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-12 rounded-full bg-brand px-8 text-sm font-semibold text-primary-foreground hover:bg-brand-dark sm:text-base shadow-[0_6px_24px_hsl(var(--brand)/0.2)]",
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
        <section className="mx-auto max-w-6xl px-5 sm:px-6 py-14 md:py-20">
          <Reveal>
            <div className="mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                Live feed
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">
                지금 공개된 공고
              </h2>
              <p className="mt-3 text-muted-foreground">
                실제 서비스 홈에서 사용하는 목록을 그대로 보여드려요.
              </p>
            </div>
          </Reveal>

          <div className="rounded-[28px] border border-border bg-card p-4 md:p-6">
            <JobListInfinite
              initialJobs={jobs}
              initialCursor={nextCursor}
              jobHrefBase="/posts"
            />
          </div>
        </section>

        {/* ─── Final CTA ───────────────────────────────────────────────── */}
        <section className="border-t border-border/60 bg-brand-light">
          <div className="mx-auto max-w-5xl px-5 sm:px-6 py-16 text-center md:py-24">
            <CeleryMark className="mx-auto h-16 w-16 text-brand" />
            <h2 className="mt-6 text-2xl font-extrabold tracking-tight sm:text-[28px] md:text-[38px]">
              지금 샐러리잡 시작하기
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
              이력서도 면접도 긴 대기도 없이, 탭 한 번으로 지원하고
              근무 후 바로 정산까지. 오늘 가능한 일부터 확인해 보세요.
            </p>
            <div className="mx-auto mt-8 flex w-full max-w-md flex-col justify-center gap-2.5 sm:max-w-none sm:flex-row sm:gap-3">
              <Link
                href="/login?next=/home"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 w-full rounded-full bg-brand px-6 text-sm font-semibold text-primary-foreground hover:bg-brand-dark sm:w-auto sm:text-base shadow-[0_6px_24px_hsl(var(--brand)/0.2)]",
                )}
              >
                가까운 일자리 찾기
              </Link>
              <Link
                href="/signup?role=business"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 w-full rounded-full border-brand/30 bg-card px-6 text-sm font-semibold text-brand-deep hover:bg-mint-bg sm:w-auto sm:text-base",
                )}
              >
                사업장 등록하기
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Footer ──────────────────────────────────────────────────── */}
        <Reveal>
          <footer className="bg-foreground/[0.03]">
            <div className="mx-auto max-w-6xl px-5 sm:px-6 py-12">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                <div className="flex items-center gap-2">
                  <CeleryMark className="h-8 w-8 text-brand" />
                  <span className="text-sm font-bold">샐러리잡</span>
                </div>
                <div className="flex gap-6 text-xs text-muted-foreground">
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
              <p className="mt-6 text-center text-[10px] text-muted-foreground">
                &copy; {new Date().getFullYear()} 샐러리잡. All rights reserved.
              </p>
            </div>
          </footer>
        </Reveal>
      </main>
    </div>
  );
}
