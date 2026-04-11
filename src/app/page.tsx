import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquareQuote,
  Shield,
  Smartphone,
  Star,
  Timer,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { JobListInfinite } from "@/components/worker/job-list-infinite";
import { buttonVariants } from "@/components/ui/button-variants";
import { getJobsPaginated } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

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
  const urgentJobs = jobs.filter((job) => job.isUrgent).length;

  const benefits = [
    {
      icon: Wallet,
      title: "일 끝나면 바로 정산",
      description: "근무가 끝난 뒤 지급 상태를 바로 확인할 수 있습니다.",
    },
    {
      icon: MapPin,
      title: "내 주변 공고 중심 탐색",
      description: "위치 기반 탐색으로 실제 이동 가능한 일자리만 빠르게 찾습니다.",
    },
    {
      icon: Shield,
      title: "사업자 정보 확인",
      description: "평점, 리뷰, 인증 상태를 함께 보고 지원 여부를 판단할 수 있습니다.",
    },
    {
      icon: Smartphone,
      title: "모바일 중심 지원 흐름",
      description: "회원가입, 지원, 출근 확인까지 휴대폰에서 바로 처리합니다.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "조건에 맞는 공고 확인",
      description: "시급, 날짜, 위치, 태그를 보고 바로 비교합니다.",
    },
    {
      number: "02",
      title: "지원 후 확정 상태 확인",
      description: "지원 내역과 진행 상태가 한 화면에 정리됩니다.",
    },
    {
      number: "03",
      title: "근무 완료 후 정산과 리뷰",
      description: "실제 근무 기록을 기준으로 정산과 리뷰가 이어집니다.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-white">
              <span className="text-sm font-bold">G</span>
            </div>
            <div>
              <p className="text-lg font-bold">GigNow</p>
              <p className="text-xs text-muted-foreground">
                가까운 단기 일자리 플랫폼
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              로그인
            </Link>
            <Link
              href="/signup?role=worker"
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-brand text-white hover:bg-brand-dark",
              )}
            >
              무료로 시작
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.12),_transparent_35%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-[1.2fr_0.8fr] md:py-24">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-4 py-2 text-sm font-medium text-brand">
                <Zap className="h-4 w-4" />
                오늘 바로 시작할 수 있는 공고 중심
              </div>

              <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl">
                내가 원할 때,
                <br />
                내 근처에서,
                <br />
                바로 일하기
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                GigNow는 단기 근무 공고 탐색부터 지원, 출근 확인, 정산,
                리뷰까지 한 흐름으로 연결합니다. 구직자와 사업자 모두 실제
                현장에서 바로 쓸 수 있는 속도와 단순함에 집중했습니다.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup?role=worker"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-12 bg-brand px-8 text-base text-white hover:bg-brand-dark",
                  )}
                >
                  구직자로 시작
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/signup?role=business"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "h-12 px-8 text-base",
                  )}
                >
                  사업자로 공고 올리기
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-2">
                  <CheckCircle2 className="h-4 w-4 text-brand" />
                  지원부터 정산까지 한 앱에서 처리
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-2">
                  <Clock className="h-4 w-4 text-brand" />
                  긴급 공고와 빠른 매칭 흐름 지원
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-2">
                  <Star className="h-4 w-4 text-brand" />
                  실제 리뷰와 평점 기반 판단
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-brand">실시간 현황</p>
                  <h2 className="mt-1 text-2xl font-bold">오늘 기준 홈 피드</h2>
                </div>
                <div className="rounded-2xl bg-brand/10 px-3 py-1 text-sm font-medium text-brand">
                  업데이트 중
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-sm text-muted-foreground">공개 공고</p>
                  <p className="mt-2 text-3xl font-bold">{jobs.length}</p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-sm text-muted-foreground">긴급 공고</p>
                  <p className="mt-2 text-3xl font-bold">{urgentJobs}</p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-sm text-muted-foreground">참여 사업장</p>
                  <p className="mt-2 text-3xl font-bold">{uniqueBusinesses}</p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <p className="text-sm text-muted-foreground">평균 시급</p>
                  <p className="mt-2 text-3xl font-bold">
                    {formatWon(averageHourlyPay)}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-brand/5 p-4">
                <p className="text-sm font-medium text-brand">
                  실제 사용 흐름 기준으로 설계
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  공고 목록, 상세 페이지, 지원, 체크인, 정산, 리뷰 흐름이 서로
                  끊기지 않도록 화면과 액션이 연결되어 있습니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border/50 bg-brand/5">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 text-sm md:grid-cols-4">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-brand" />
              <div>
                <p className="text-muted-foreground">빠른 대응 공고</p>
                <p className="font-semibold">긴급 태그와 상태 표시</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-brand" />
              <div>
                <p className="text-muted-foreground">사업자/구직자 양방향</p>
                <p className="font-semibold">역할별 가입과 대시보드</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5 text-brand" />
              <div>
                <p className="text-muted-foreground">실제 일정 기반</p>
                <p className="font-semibold">날짜와 시간 정보 우선 표시</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-brand" />
              <div>
                <p className="text-muted-foreground">정산 흐름 연동</p>
                <p className="font-semibold">근무 완료 후 지급 상태 확인</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-brand">추천 공고</p>
              <h2 className="mt-2 text-3xl font-bold">지금 모집 중인 공고</h2>
              <p className="mt-2 text-muted-foreground">
                홈 피드 상단에 노출되는 최신 공고를 먼저 확인해보세요.
              </p>
            </div>
            <Link href="/signup?role=worker" className="text-sm font-medium text-brand">
              전체 공고 보기
            </Link>
          </div>

          {featuredJobs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {featuredJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/posts/${job.id}`}
                  className="group rounded-3xl border bg-card p-5 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {job.business.name}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold">{job.title}</h3>
                    </div>
                    {job.isUrgent && (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                        긴급
                      </span>
                    )}
                  </div>

                  <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-brand" />
                      시급 {formatWon(job.hourlyPay)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-brand" />
                      {formatDayLabel(job.workDate)} {job.startTime} - {job.endTime}
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-brand" />
                      모집 {job.headcount}명 / 현재 {job.filled}명 확정
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-brand" />
                      {job.business.address}
                    </p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {job.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed p-8 text-center text-muted-foreground">
              현재 노출할 공고가 없습니다.
            </div>
          )}
        </section>

        <section className="border-y border-border/60 bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-brand">왜 GigNow인가</p>
              <h2 className="mt-2 text-3xl font-bold">
                실제 현장에서 바로 필요한 기능만 남겼습니다
              </h2>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {benefits.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-3xl border bg-background p-6"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10">
                      <Icon className="h-6 w-6 text-brand" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
                    <p className="mt-2 leading-7 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold text-brand">이용 흐름</p>
              <h2 className="mt-2 text-3xl font-bold">
                사용자와 관리자 모두 이해하기 쉬운 구조
              </h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                구직자는 공고 탐색과 지원에 집중하고, 사업자는 공고 등록과 지원자
                검토에 집중할 수 있도록 역할별 동선을 나눴습니다.
              </p>
            </div>

            <div className="space-y-4">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="flex gap-4 rounded-3xl border bg-card p-5"
                >
                  <div className="text-3xl font-bold text-brand/70">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                    <p className="mt-2 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 md:pb-20">
          <div className="mb-8">
            <p className="text-sm font-semibold text-brand">전체 피드 미리보기</p>
            <h2 className="mt-2 text-3xl font-bold">실제 목록 동작 기반 검증 구간</h2>
            <p className="mt-2 text-muted-foreground">
              아래 목록은 서버에서 받아온 초기 공고와 무한 스크롤 컴포넌트를
              그대로 사용합니다.
            </p>
          </div>

          <div className="rounded-3xl border bg-card p-4 md:p-6">
            <JobListInfinite
              initialJobs={jobs}
              initialCursor={nextCursor}
              jobHrefBase="/posts"
            />
          </div>
        </section>

        <section className="border-y border-brand/10 bg-brand/5">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center">
            <MessageSquareQuote className="mx-auto mb-4 h-10 w-10 text-brand" />
            <p className="text-lg leading-8 text-foreground md:text-xl">
              &ldquo;갑자기 비는 시간에 근처 공고를 보고 바로 지원했어요.
              <br />
              근무 종료 후 정산 상태까지 한 번에 확인돼서 흐름이 끊기지 않았습니다.&rdquo;
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              실제 서비스 흐름 기준으로 정리한 대표 사용자 경험
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="rounded-[2rem] border bg-card px-6 py-10 text-center shadow-sm md:px-10">
            <p className="text-sm font-semibold text-brand">지금 시작하기</p>
            <h2 className="mt-2 text-3xl font-bold">
              구직자도, 사업자도 바로 사용할 수 있게 정리했습니다
            </h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-muted-foreground">
              회원가입 이후 역할별 화면으로 이어지고, 공개 홈에서는 실제 공고와
              상세 진입이 동작하도록 구성했습니다.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/signup?role=worker"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 bg-brand px-8 text-white hover:bg-brand-dark",
                )}
              >
                구직자 가입
              </Link>
              <Link
                href="/signup?role=business"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 px-8",
                )}
              >
                사업자 가입
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
