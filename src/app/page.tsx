import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { getJobsPaginated } from "@/lib/db/queries";
import { JobListInfinite } from "@/components/worker/job-list-infinite";
import { formatWorkDate, calculateEarnings } from "@/lib/job-utils";
import { formatMoney } from "@/lib/format";
import {
  Clock,
  CheckCircle2,
  Shield,
  Star,
  ArrowRight,
  Zap,
  Users,
  Timer,
  Smartphone,
  Wallet,
  MapPin,
  MessageSquareQuote,
} from "lucide-react";

export default async function LandingPage() {
  const { jobs: allJobs, nextCursor } = await getJobsPaginated({ limit: 20 });
  const featuredJobs = allJobs.slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="font-bold text-lg">GigNow</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-brand hover:bg-brand-dark text-white"
              )}
            >
              시작하기
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-light/20 via-transparent to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-brand/10 text-brand text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <Zap className="w-3 h-3" /> 면접 없이, 오늘 바로 근무
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
              내가 원할 때,{" "}
              <span className="text-brand">내 근처에서,</span>
              <br />
              바로 일하기
            </h1>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              탭 한 번으로 지원 확정.
              <br className="hidden md:block" />
              근무 끝나면 <span className="font-semibold text-foreground">즉시 계좌 입금</span>까지.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link
                href="/signup?role=worker"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-brand hover:bg-brand-dark text-white text-base h-12 px-8"
                )}
              >
                🙋 일하고 싶어요
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link
                href="/signup?role=employer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "text-base h-12 px-8 border-2"
                )}
              >
                🏢 사람을 구해요
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live Stats Bar */}
      <section className="bg-brand/5 border-y border-brand/10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-6 md:gap-12 text-sm">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand" />
              <span className="text-muted-foreground">오늘 매칭</span>
              <span className="font-bold text-brand">847건</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Users className="w-4 h-4 text-brand" />
              <span className="text-muted-foreground">활동 구직자</span>
              <span className="font-bold text-brand">2,341명</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-brand" />
              <span className="text-muted-foreground">평균 매칭</span>
              <span className="font-bold text-brand">23분</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Jobs Preview */}
      <section className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">오늘 모집 중</h2>
            <p className="text-sm text-muted-foreground mt-1">
              지금 지원하면 바로 근무할 수 있어요
            </p>
          </div>
          <Link
            href="/signup?role=worker"
            className="text-sm text-brand font-medium hover:underline"
          >
            전체 보기 →
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {featuredJobs.map((job) => (
            <div
              key={job.id}
              className="rounded-2xl border border-border bg-card p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-2xl">
                  {job.business.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    {job.business.name}
                  </p>
                  <h3 className="font-bold text-sm line-clamp-1">
                    {job.title}
                  </h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-medium">
                      {job.business.rating}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({job.business.reviewCount})
                    </span>
                  </div>
                </div>
                {job.isUrgent && (
                  <span className="shrink-0 bg-red-500/10 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    급구
                  </span>
                )}
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>
                    {formatWorkDate(job.workDate)} {job.startTime}~{job.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{job.business.address}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground">예상 수입</p>
                  <p className="font-bold text-brand">
                    {formatMoney(calculateEarnings(job))}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  시급 {formatMoney(job.hourlyPay)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Full paginated job list — POST-04 */}
      <section className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">지금 모집 중인 공고</h2>
          <p className="text-sm text-muted-foreground mt-1">
            로그인 없이 둘러보세요. 관심 있는 공고를 탭하면 상세로 이동합니다.
          </p>
        </div>
        <JobListInfinite initialJobs={allJobs} initialCursor={nextCursor} />
      </section>

      {/* How it works */}
      <section className="bg-muted/30 border-y border-border">
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
            이렇게 쉬워요
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            가입부터 입금까지 네 단계면 끝
          </p>
          <div className="grid md:grid-cols-4 gap-8 md:gap-6">
            {[
              {
                icon: Smartphone,
                step: "1",
                title: "공고 찾기",
                desc: "내 근처, 내 시간에 맞는 일자리",
              },
              {
                icon: CheckCircle2,
                step: "2",
                title: "원탭 확정",
                desc: "면접·이력서 없이 즉시 확정",
              },
              {
                icon: Clock,
                step: "3",
                title: "QR 체크인",
                desc: "출근해서 QR로 근무 시작",
              },
              {
                icon: Wallet,
                step: "4",
                title: "즉시 입금",
                desc: "근무 끝나면 계좌로 바로 송금",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4 relative">
                  <item.icon className="w-7 h-7 text-brand" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="max-w-5xl mx-auto px-4 py-16 md:py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          믿고 일할 수 있는 이유
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: Shield,
              title: "국세청 사업자 인증",
              desc: "검증된 업체만 구인 등록이 가능합니다",
            },
            {
              icon: Star,
              title: "양방향 평점",
              desc: "구직자와 업체 모두 서로를 평가합니다",
            },
            {
              icon: Wallet,
              title: "즉시 입금 보장",
              desc: "근무 완료 즉시 본인 계좌로 송금",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 p-5 rounded-xl bg-card border border-border"
            >
              <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-brand" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-brand/5 border-y border-brand/10">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <MessageSquareQuote className="w-10 h-10 text-brand mx-auto mb-4" />
          <p className="text-lg md:text-xl leading-relaxed text-foreground">
            "수업 끝나고 3시간 빈 시간에 카페 알바 했어요.
            <br />
            끝나자마자 6만원이 계좌에 들어와서 너무 신기했어요."
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            — 김**, 대학생 · 누적 23건
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          지금 시작하세요
        </h2>
        <p className="text-muted-foreground mb-8">
          가입은 2분이면 끝나요. 바로 내 주변 일자리를 확인해보세요.
        </p>
        <Link
          href="/signup?role=worker"
          className={cn(
            buttonVariants({ size: "lg" }),
            "bg-brand hover:bg-brand-dark text-white text-base h-12 px-10"
          )}
        >
          무료로 시작하기 <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-brand flex items-center justify-center">
                <span className="text-white font-bold text-xs">G</span>
              </div>
              <span>GigNow</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                이용약관
              </Link>
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                개인정보처리방침
              </Link>
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                고객센터
              </Link>
            </div>
            <p>&copy; 2026 GigNow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
