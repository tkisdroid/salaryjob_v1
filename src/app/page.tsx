import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Sparkles,
  CheckCircle2,
  Shield,
  Star,
  MessageCircle,
  ArrowRight,
  Zap,
  Users,
  Timer,
} from "lucide-react";

export default function LandingPage() {
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
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">로그인</Link>
            </Button>
            <Button size="sm" className="bg-brand hover:bg-brand-dark text-white" asChild>
              <Link href="/signup">시작하기</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-light/20 via-transparent to-transparent" />
        <div className="relative max-w-5xl mx-auto px-4 pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
              내가 원할 때,{" "}
              <span className="text-brand">내 근처에서,</span>
              <br />
              바로 일하기
            </h1>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              빈 시간을 등록하면 AI가 딱 맞는 일자리를 찾아드려요.
              <br className="hidden md:block" />
              지원부터 급여까지, 탭 한 번으로 끝.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Button
                size="lg"
                className="bg-brand hover:bg-brand-dark text-white text-base h-12 px-8"
                asChild
              >
                <Link href="/signup?role=worker">
                  🙋 일하고 싶어요
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base h-12 px-8 border-2"
                asChild
              >
                <Link href="/signup?role=employer">🏢 사람을 구해요</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
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

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 py-16 md:py-24">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          이렇게 쉬워요
        </h2>
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {[
            {
              icon: Clock,
              step: "1",
              title: "빈 시간을 등록하세요",
              desc: "수업 끝나고 3시간, 주말 오전만 — 내 스케줄대로",
            },
            {
              icon: Sparkles,
              step: "2",
              title: "AI가 맞춤 공고를 찾아요",
              desc: "위치, 시간, 관심분야까지 딱 맞는 일자리만",
            },
            {
              icon: CheckCircle2,
              step: "3",
              title: "탭 한 번으로 지원 끝",
              desc: "지원하고, 일하고, 바로 받으세요",
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
      </section>

      {/* Trust signals */}
      <section className="bg-muted/50 border-y border-border">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "사업자 인증 필수",
                desc: "국세청 API로 검증된 업체만 구인 가능",
              },
              {
                icon: Star,
                title: "양방향 리뷰",
                desc: "구직자와 업체가 서로 평가해서 신뢰 형성",
              },
              {
                icon: MessageCircle,
                title: "실시간 채팅",
                desc: "매칭 즉시 채팅방 생성, 빠른 소통",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border"
              >
                <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <h3 className="font-semibold mb-0.5">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
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
        <Button
          size="lg"
          className="bg-brand hover:bg-brand-dark text-white text-base h-12 px-10"
          asChild
        >
          <Link href="/signup">
            무료로 시작하기 <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
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
