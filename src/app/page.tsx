import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Leaf,
  MapPin,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { JobListInfinite } from "@/components/worker/job-list-infinite";
import { buttonVariants } from "@/components/ui/button-variants";
import { getJobsPaginated } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

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
      icon: Clock,
      title: "원탭 지원",
      description:
        "이력서도 면접도 없어요. 조건이 맞으면 버튼 한 번으로 지원이 끝납니다.",
    },
    {
      icon: MapPin,
      title: "내 주변만",
      description:
        "위치 기반으로 걸어갈 수 있는 거리의 일만 골라서 보여드려요.",
    },
    {
      icon: Wallet,
      title: "즉시 정산",
      description:
        "근무가 끝나면 시급·교통비·야간 할증까지 계산해 바로 입금됩니다.",
    },
    {
      icon: ShieldCheck,
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
      icon: Search,
    },
    {
      number: "02",
      title: "원탭으로 지원",
      description: "시급과 근무 시간만 확인하면 끝. 서류 없이 바로 확정됩니다.",
      icon: Sparkles,
    },
    {
      number: "03",
      title: "근무는 QR 체크인",
      description: "매장에서 QR만 찍으면 출근 인증. 복잡한 절차 없이 시작해요.",
      icon: Briefcase,
    },
    {
      number: "04",
      title: "끝나면 즉시 정산",
      description: "시간과 금액이 자동 계산돼 계좌로 바로 입금됩니다.",
      icon: ReceiptText,
    },
  ];

  const workerValue = [
    {
      label: "오늘 시작할 수 있는 일",
      hint: "긴급 모집 공고부터 우선 노출",
    },
    {
      label: "도보 10분 이내",
      hint: "내 위치 기준 거리순 정렬",
    },
    {
      label: "시급이 명확한 일",
      hint: "시급·교통비·할증 모두 공개",
    },
    {
      label: "리뷰가 좋은 매장",
      hint: "실제 근무자 평점 기반 추천",
    },
  ];

  const businessValue = [
    {
      icon: Users,
      title: "몇 분 안에 인력 확보",
      description:
        "공고 등록 후 평균 수 분 내 지원이 들어옵니다. 급할 때도 걱정 없어요.",
    },
    {
      icon: CheckCircle2,
      title: "지원자 한눈에 관리",
      description:
        "누가 지원했고 누가 확정됐는지 카드 한 장으로 정리해 보여드려요.",
    },
    {
      icon: ReceiptText,
      title: "근태·정산 자동 연동",
      description:
        "체크인부터 정산까지 모든 기록이 자동으로 이어집니다.",
    },
    {
      icon: Sparkles,
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
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand text-white shadow-sm">
              <Leaf className="h-4 w-4" />
            </div>
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
            <Link href="/#worker" className="hover:text-foreground">
              일자리 찾기
            </Link>
            <Link href="/#business" className="hover:text-foreground">
              사업자 등록
            </Link>
            <Link href="/#flow" className="hover:text-foreground">
              이용 방법
            </Link>
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
                "rounded-full bg-brand px-4 text-white shadow-sm hover:bg-brand-dark",
              )}
            >
              시작하기
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ─── Hero ────────────────────────────────────────────────────── */}
        <section className="relative border-b border-border/60 bg-mint-bg/50">
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 sm:px-6 py-16 md:grid-cols-[1.15fr_0.85fr] md:py-24">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-light px-4 py-1.5 text-xs font-semibold text-brand-deep">
                <Sparkles className="h-3.5 w-3.5" />
                샐러리처럼 산뜻한 로컬 잡 플랫폼
              </div>

              <h1 className="text-[32px] font-bold leading-[1.2] tracking-tight text-foreground sm:text-[42px] md:text-[56px]">
                <span className="block">내 주변 일자리,</span>
                <span className="block text-brand">더 가볍고 빠르게</span>
              </h1>

              <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-base md:text-lg">
                이력서도 면접도 필요 없어요.
                <br className="hidden sm:block" />
                오늘 가능한 일부터 안정적인 근무까지,
                <br className="hidden sm:block" />
                탭 한 번으로 지원하고 근무 후 바로 정산받으세요.
              </p>

              <div className="mt-7 flex w-full flex-col gap-2.5 sm:flex-row sm:gap-3">
                <Link
                  href="/login?next=/home"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-12 w-full rounded-full bg-brand px-6 text-sm font-semibold text-white hover:bg-brand-dark sm:w-auto sm:text-base",
                  )}
                >
                  내 주변 일자리 보기
                  <ArrowRight className="ml-1 h-4 w-4" />
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

              <ul className="mt-6 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-3 sm:gap-2.5">
                <li className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand" />
                  <span className="truncate">이력서·면접 제로</span>
                </li>
                <li className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand" />
                  <span className="truncate">당일 근무 가능</span>
                </li>
                <li className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand" />
                  <span className="truncate">근무 후 즉시 정산</span>
                </li>
              </ul>
            </div>

            {/* Right — product preview card */}
            <div className="relative">
              <div className="rounded-[28px] border border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
                      오늘 피드 미리보기
                    </p>
                    <h2 className="mt-1 text-xl font-bold">지금 모집 중</h2>
                  </div>
                  <span className="rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-semibold text-brand-deep">
                    실시간
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {featuredJobs.length > 0 ? (
                    featuredJobs.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-2xl border border-border/70 bg-mint-bg/60 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[11px] text-muted-foreground">
                              {job.business.name}
                            </p>
                            <p className="truncate text-sm font-bold text-foreground">
                              {job.title}
                            </p>
                          </div>
                          {job.isUrgent ? (
                            <span className="shrink-0 rounded-full bg-urgent/15 px-2 py-0.5 text-[10px] font-bold text-[color:var(--urgent)]">
                              급구
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand-deep">
                              근처
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Wallet className="h-3 w-3" />
                            {formatWon(job.hourlyPay)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDayLabel(job.workDate)} {job.startTime}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/80 p-5 text-center text-xs text-muted-foreground">
                      오늘 공개된 공고가 아직 없어요
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-2xl bg-mint-bg/80 p-4">
                  <p className="text-[11px] font-semibold text-brand-deep">
                    즉시 정산
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    근무가 끝나면 앱 안에서 정산 상태를 바로 확인할 수 있어요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 핵심 가치 카드 ──────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 sm:px-6 py-14 md:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              Why 샐러리잡
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-[28px] md:text-[34px]">
              복잡하지 않게, 필요한 일만 빠르게
            </h2>
            <p className="mt-3 text-muted-foreground">
              샐러리잡은 일하는 사람과 사업장을 가장 짧은 거리로 잇습니다.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {valueCards.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-[24px] border border-border bg-card p-6 transition-colors hover:border-brand/40 hover:bg-mint-bg/40"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-light text-brand-deep">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ─── 서비스 흐름 ─────────────────────────────────────────────── */}
        <section id="flow" className="border-y border-border/60 bg-mint-bg/50">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 py-14 md:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                How it works
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-[28px] md:text-[34px]">
                탐색부터 정산까지 4단계로 끝내요
              </h2>
              <p className="mt-3 text-muted-foreground">
                복잡한 다이어그램 없이, 단계마다 한 가지에만 집중하세요.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {workerFlow.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.number}
                    className="flex h-full flex-col rounded-[24px] border border-border bg-card p-6"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold tracking-widest text-brand">
                        {step.number}
                      </span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-brand-deep">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <h3 className="mt-5 text-base font-bold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── 구직자 중심 섹션 ───────────────────────────────────────── */}
        <section id="worker" className="mx-auto max-w-6xl px-5 sm:px-6 py-14 md:py-20">
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                For workers
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-[28px] md:text-[34px]">
                가까운 일자리부터 바로 확인하세요
              </h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                내 위치를 기준으로 오늘 가능한 일, 집 근처 일, 급여가 명확한
                일을 먼저 보여드려요. 조건이 맞으면 이력서 없이 바로 지원할 수
                있어요.
              </p>
              <Link
                href="/login?next=/home"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-7 h-12 rounded-full bg-brand px-6 text-white hover:bg-brand-dark",
                )}
              >
                구직자로 시작하기
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {workerValue.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-border bg-card p-5 transition-colors hover:border-brand/40"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-light text-brand-deep">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-sm font-bold">{item.label}</p>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {item.hint}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 사업자 중심 섹션 ────────────────────────────────────────── */}
        <section id="business" className="border-y border-border/60 bg-card">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 py-14 md:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                For businesses
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-[28px] md:text-[34px]">
                사업장에 맞는 인력을 더 빠르게 연결합니다
              </h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                공고 등록부터 지원자 검토, 근무·정산 관리까지. 반복되는 채용은
                저장해서 다음에도 한 번의 탭으로 끝내세요.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {businessValue.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-[24px] border border-border bg-mint-bg/40 p-6"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-base font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 flex justify-start">
              <Link
                href="/signup?role=business"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 rounded-full border border-brand/30 bg-brand-light px-6 text-brand-deep hover:bg-brand-light/80",
                )}
              >
                사업자로 공고 올리기
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── 실제 공고 피드 (신뢰 지표) ────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 sm:px-6 py-14 md:py-20">
          <div className="mb-10 grid gap-6 md:grid-cols-[1fr_1.2fr] md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                Live feed
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-[28px] md:text-[34px]">
                지금 공개된 공고
              </h2>
              <p className="mt-3 text-muted-foreground">
                실제 서비스 홈에서 사용하는 목록을 그대로 보여드려요.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {trustStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[20px] border border-border bg-card px-4 py-4 text-center"
                >
                  <p className="text-2xl font-bold text-brand">{stat.value}</p>
                  <p className="mt-1 text-[11px] font-medium text-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {stat.hint}
                  </p>
                </div>
              ))}
            </div>
          </div>

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
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white">
              <Leaf className="h-5 w-5" />
            </div>
            <h2 className="mt-6 text-2xl font-bold tracking-tight sm:text-[28px] md:text-[38px]">
              지금 샐러리잡 시작하기
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
              이력서, 면접, 긴 대기 없이. 오늘 바로 일하고 바로 정산받으세요.
            </p>
            <div className="mx-auto mt-8 flex w-full max-w-md flex-col justify-center gap-2.5 sm:max-w-none sm:flex-row sm:gap-3">
              <Link
                href="/login?next=/home"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 w-full rounded-full bg-brand px-6 text-sm font-semibold text-white hover:bg-brand-dark sm:w-auto sm:text-base",
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
        <footer className="border-t border-border bg-card">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 sm:px-6 py-10 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white">
                <Leaf className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-sm font-bold">샐러리잡</p>
                <p className="text-[11px] text-muted-foreground">
                  내 주변 로컬 잡 플랫폼
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-5 text-xs text-muted-foreground">
              <Link href="/#worker" className="hover:text-foreground">
                구직자
              </Link>
              <Link href="/#business" className="hover:text-foreground">
                사업자
              </Link>
              <Link href="/login" className="hover:text-foreground">
                로그인
              </Link>
              <Link href="/signup" className="hover:text-foreground">
                회원가입
              </Link>
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Store className="h-3 w-3" />
              샐러리잡 © {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
