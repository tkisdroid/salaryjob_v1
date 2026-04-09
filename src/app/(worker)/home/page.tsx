import Link from "next/link";
import {
  Sparkles,
  Flame,
  MapPin,
  Clock,
  ChevronRight,
  CheckCircle2,
  Circle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const AI_RECOMMENDATIONS = [
  {
    id: "ai-1",
    title: "카페 바리스타",
    company: "블루보틀 강남점",
    pay: "시급 13,000원",
    distance: "0.8km",
    tags: ["카페", "주말"],
    urgent: false,
  },
  {
    id: "ai-2",
    title: "행사 스태프",
    company: "이벤트플러스",
    pay: "시급 15,000원",
    distance: "1.2km",
    tags: ["행사", "단기"],
    urgent: true,
  },
  {
    id: "ai-3",
    title: "물류 분류 작업",
    company: "쿠팡 풀필먼트",
    pay: "시급 12,500원",
    distance: "2.5km",
    tags: ["물류", "야간"],
    urgent: false,
  },
];

const URGENT_POSTS = [
  {
    id: "urg-1",
    title: "편의점 야간 대타",
    company: "GS25 역삼점",
    pay: "시급 12,000원",
    remainingMinutes: 45,
    tags: ["편의점", "야간"],
  },
  {
    id: "urg-2",
    title: "식당 홀서빙 (점심)",
    company: "명동교자 본점",
    pay: "시급 13,500원",
    remainingMinutes: 120,
    tags: ["음식점", "점심"],
  },
  {
    id: "urg-3",
    title: "택배 상하차",
    company: "한진택배 송파허브",
    pay: "시급 14,000원",
    remainingMinutes: 30,
    tags: ["물류", "새벽"],
  },
];

const NEARBY_POSTS = [
  {
    id: "near-1",
    title: "서빙 알바",
    company: "스타벅스 선릉점",
    distance: "0.3km",
    pay: "시급 11,500원",
  },
  {
    id: "near-2",
    title: "매장 정리",
    company: "올리브영 강남역점",
    distance: "0.5km",
    pay: "시급 11,000원",
  },
  {
    id: "near-3",
    title: "전단지 배포",
    company: "마케팅허브",
    distance: "0.7km",
    pay: "시급 12,000원",
  },
  {
    id: "near-4",
    title: "카운터 근무",
    company: "다이소 테헤란로점",
    distance: "1.1km",
    pay: "시급 11,000원",
  },
];

const ONBOARDING_STEPS = [
  { label: "가입", done: true },
  { label: "관심직종", done: false },
  { label: "가용시간", done: false },
  { label: "프로필사진", done: false },
  { label: "첫지원", done: false },
];

const IS_FIRST_VISIT = true;
const NEW_POSTS_COUNT = 12;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRemainingTime(minutes: number): string {
  if (minutes < 60) return `${minutes}분 남음`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}시간 ${m}분 남음` : `${h}시간 남음`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WorkerHomePage() {
  const completedSteps = ONBOARDING_STEPS.filter((s) => s.done).length;
  const progressPercent = Math.round(
    (completedSteps / ONBOARDING_STEPS.length) * 100
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
      {/* Greeting */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          안녕하세요! <span aria-hidden="true">&#128075;</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          오늘 새 공고{" "}
          <span className="font-semibold text-brand">
            {NEW_POSTS_COUNT}건
          </span>
        </p>
      </header>

      {/* Onboarding Checklist (first visit) */}
      {IS_FIRST_VISIT && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">시작 체크리스트</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {completedSteps}/{ONBOARDING_STEPS.length} 완료
            </p>

            <ol className="flex flex-wrap gap-x-1 gap-y-2 text-sm">
              {ONBOARDING_STEPS.map((step, i) => (
                <li key={step.label} className="flex items-center gap-1">
                  {step.done ? (
                    <CheckCircle2 className="w-4 h-4 text-brand" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span
                    className={
                      step.done ? "text-foreground" : "text-muted-foreground"
                    }
                  >
                    {step.label}
                  </span>
                  {i < ONBOARDING_STEPS.length - 1 && (
                    <span className="text-muted-foreground mx-1">&rarr;</span>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-brand" />
            AI 추천
          </h2>
          <Link
            href="/explore"
            className="text-sm text-muted-foreground hover:text-brand flex items-center gap-0.5"
          >
            더보기
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
          {AI_RECOMMENDATIONS.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
              className="snap-start shrink-0 w-[260px]"
            >
              <Card className="h-full hover:ring-brand/30 transition-shadow">
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium leading-snug">{post.title}</h3>
                    {post.urgent && (
                      <Badge
                        variant="destructive"
                        className="shrink-0 animate-urgent"
                      >
                        급구
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {post.company}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-brand">
                      {post.pay}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />
                      {post.distance}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {post.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Urgent Posts */}
      <section>
        <h2 className="text-lg font-semibold flex items-center gap-1.5 mb-3">
          <Flame className="w-5 h-5 text-destructive" />
          급구 공고
        </h2>

        <div className="space-y-3">
          {URGENT_POSTS.map((post) => (
            <Link key={post.id} href={`/posts/${post.id}`}>
              <Card className="animate-urgent hover:ring-brand/30 transition-shadow">
                <CardContent className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="shrink-0">
                        급구
                      </Badge>
                      <h3 className="font-medium truncate">{post.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {post.company}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs">
                      <span className="font-semibold text-brand">
                        {post.pay}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {post.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-destructive font-medium shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    {formatRemainingTime(post.remainingMinutes)}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Nearby Posts */}
      <section>
        <h2 className="text-lg font-semibold flex items-center gap-1.5 mb-3">
          <MapPin className="w-5 h-5 text-teal" />
          내 주변
        </h2>

        <div className="space-y-2">
          {NEARBY_POSTS.map((post) => (
            <Link key={post.id} href={`/posts/${post.id}`}>
              <Card
                size="sm"
                className="hover:ring-brand/30 transition-shadow"
              >
                <CardContent className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm truncate">
                      {post.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {post.company}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-semibold text-brand">
                      {post.pay}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-0.5 justify-end">
                      <MapPin className="w-3 h-3" />
                      {post.distance}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-4 text-center">
          <Button variant="outline" asChild>
            <Link href="/explore">
              더 많은 공고 보기
              <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
