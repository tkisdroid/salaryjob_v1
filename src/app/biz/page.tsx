import Link from "next/link";
import {
  Plus,
  Users,
  TrendingUp,
  Zap,
  AlertCircle,
  Clock,
  Sparkles,
  Star,
  ChevronRight,
  Eye,
  CheckCircle2,
  Activity,
  Calendar,
  UserCheck,
  Hourglass,
  Wallet,
  MapPin,
  BadgeCheck,
} from "lucide-react";
import { formatMoney } from "@/lib/format";

const BUSINESS = {
  name: "스타벅스 역삼점",
  logo: "☕",
  verified: true,
  rating: 4.8,
  reviewCount: 342,
};

const TODAY_STATS = {
  activePosts: 3,
  todayFilled: 4,
  todayHeadcount: 5,
  workingNow: 2,
  newApplications: 8,
  avgFillMinutes: 17,
};

const MONTH_SUMMARY = {
  totalHires: 47,
  totalPaid: 5_280_000,
  avgRating: 4.8,
  fillRate: 94,
};

type WorkerShiftStatus = "confirmed" | "en_route" | "checked_in" | "completed";

const TODAY_SHIFTS: ReadonlyArray<{
  id: string;
  workerName: string;
  workerInitial: string;
  rating: number;
  postTitle: string;
  startTime: string;
  endTime: string;
  status: WorkerShiftStatus;
  payout: number;
}> = [
  {
    id: "s1",
    workerName: "김지훈",
    workerInitial: "김",
    rating: 4.8,
    postTitle: "주말 카페 바리스타 보조",
    startTime: "10:00",
    endTime: "15:00",
    status: "checked_in",
    payout: 68000,
  },
  {
    id: "s2",
    workerName: "박서연",
    workerInitial: "박",
    rating: 4.9,
    postTitle: "주말 카페 바리스타 보조",
    startTime: "10:00",
    endTime: "15:00",
    status: "en_route",
    payout: 68000,
  },
  {
    id: "s3",
    workerName: "이민호",
    workerInitial: "이",
    rating: 4.6,
    postTitle: "평일 오전 바리스타",
    startTime: "07:00",
    endTime: "12:00",
    status: "confirmed",
    payout: 65000,
  },
  {
    id: "s4",
    workerName: "최유나",
    workerInitial: "최",
    rating: 4.7,
    postTitle: "평일 오전 바리스타",
    startTime: "07:00",
    endTime: "12:00",
    status: "completed",
    payout: 65000,
  },
];

const STATUS_STYLE: Record<
  WorkerShiftStatus,
  { label: string; className: string; dot: string }
> = {
  confirmed: {
    label: "확정",
    className: "bg-blue-500/10 text-blue-600",
    dot: "bg-blue-500",
  },
  en_route: {
    label: "이동중",
    className: "bg-amber-500/10 text-amber-600",
    dot: "bg-amber-500",
  },
  checked_in: {
    label: "근무중",
    className: "bg-green-500/10 text-green-600",
    dot: "bg-green-500 animate-pulse",
  },
  completed: {
    label: "완료",
    className: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

const RECOMMENDED_WORKERS = [
  {
    id: "w1",
    name: "장민석",
    initial: "장",
    rating: 4.9,
    jobs: 34,
    skills: ["카페", "POS", "바리스타"],
    distance: "0.5km",
    reason: "카페 34회 근무 · 근거리",
  },
  {
    id: "w2",
    name: "한지원",
    initial: "한",
    rating: 4.8,
    jobs: 18,
    skills: ["서빙", "에스프레소"],
    distance: "1.2km",
    reason: "평균 평점 4.8 · 즉시 가능",
  },
  {
    id: "w3",
    name: "오세림",
    initial: "오",
    rating: 4.7,
    jobs: 12,
    skills: ["카페", "주말"],
    distance: "2.1km",
    reason: "주말 근무 선호 · 노쇼 0",
  },
];

const ACTIVE_POSTS = [
  {
    id: "p1",
    title: "주말 카페 바리스타 보조",
    workDate: "오늘",
    startTime: "10:00",
    endTime: "15:00",
    filled: 2,
    headcount: 2,
    views: 128,
    applications: 3,
    status: "filled" as const,
  },
  {
    id: "p2",
    title: "평일 오전 바리스타",
    workDate: "내일",
    startTime: "07:00",
    endTime: "12:00",
    filled: 0,
    headcount: 1,
    views: 45,
    applications: 2,
    status: "matching" as const,
  },
  {
    id: "p3",
    title: "주말 마감 청소 도우미",
    workDate: "4/13 (토)",
    startTime: "21:00",
    endTime: "23:00",
    filled: 1,
    headcount: 3,
    views: 87,
    applications: 1,
    status: "matching" as const,
  },
];

export default function BizDashboardPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-3xl">
            {BUSINESS.logo}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl md:text-2xl font-bold">{BUSINESS.name}</h1>
              {BUSINESS.verified && (
                <BadgeCheck className="w-5 h-5 text-brand" />
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="font-medium text-foreground">
                {BUSINESS.rating}
              </span>
              <span>· 리뷰 {BUSINESS.reviewCount} · 완료율 98%</span>
            </div>
          </div>
        </div>
        <Link
          href="/biz/posts/new"
          className="h-11 px-4 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold flex items-center gap-1.5 shadow-lg shadow-brand/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">공고 등록</span>
        </Link>
      </header>

      {/* Real-time KPI row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-muted-foreground">오늘 근무중</p>
            <Activity className="w-3.5 h-3.5 text-green-500" />
          </div>
          <p className="text-2xl font-bold">
            {TODAY_STATS.workingNow}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              / {TODAY_STATS.todayHeadcount}명
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            충원율{" "}
            {Math.round(
              (TODAY_STATS.todayFilled / TODAY_STATS.todayHeadcount) * 100
            )}
            %
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-muted-foreground">새 지원</p>
            <Users className="w-3.5 h-3.5 text-brand" />
          </div>
          <p className="text-2xl font-bold text-brand">
            {TODAY_STATS.newApplications}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">24시간 이내</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-muted-foreground">평균 매칭</p>
            <Hourglass className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">
            {TODAY_STATS.avgFillMinutes}
            <span className="text-sm font-normal text-muted-foreground">분</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">이번 달 평균</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-muted-foreground">진행중 공고</p>
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{TODAY_STATS.activePosts}</p>
          <p className="text-[10px] text-muted-foreground mt-1">활성 공고</p>
        </div>
      </section>

      {/* Quick action: urgent post */}
      <section>
        <Link
          href="/biz/posts/new?urgent=1"
          className="block rounded-2xl border-2 border-red-500/20 bg-gradient-to-r from-red-500/5 to-orange-500/5 p-5 hover:shadow-md hover:border-red-500/40 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-white fill-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-red-600">
                지금 당장 사람이 필요한가요?
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                급구 공고를 등록하면 평균 5분 내 매칭됩니다
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-red-500" />
          </div>
        </Link>
      </section>

      {/* Today's Shifts - Real-time */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-bold">오늘의 근무 현황</h2>
            <span className="text-[11px] font-bold bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              LIVE
            </span>
          </div>
          <Link
            href="/biz/workers"
            className="text-xs text-brand font-medium flex items-center gap-0.5"
          >
            전체 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
          {TODAY_SHIFTS.map((shift) => {
            const style = STATUS_STYLE[shift.status];
            return (
              <div
                key={shift.id}
                className="p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-brand/10 text-brand font-bold flex items-center justify-center shrink-0">
                  {shift.workerInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm truncate">
                      {shift.workerName}
                    </p>
                    <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span>{shift.rating}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {shift.postTitle} · {shift.startTime}~{shift.endTime}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${style.className}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {style.label}
                  </span>
                  <p className="text-[11px] font-bold text-muted-foreground">
                    {formatMoney(shift.payout)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* AI Recommended Workers */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-bold">AI 추천 인재</h2>
            <span className="text-[11px] text-muted-foreground">
              활성 공고 기반
            </span>
          </div>
          <Link
            href="/biz/workers"
            className="text-xs text-brand font-medium flex items-center gap-0.5"
          >
            더보기 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {RECOMMENDED_WORKERS.map((w) => (
            <Link
              key={w.id}
              href={`/biz/workers/${w.id}`}
              className="rounded-2xl border border-border bg-card p-4 hover:border-brand/40 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-brand/10 text-brand font-bold flex items-center justify-center shrink-0">
                  {w.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{w.name}</p>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-foreground">
                      {w.rating}
                    </span>
                    <span>· {w.jobs}회</span>
                    <span>·</span>
                    <MapPin className="w-3 h-3" />
                    <span>{w.distance}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {w.skills.map((s) => (
                  <span
                    key={s}
                    className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium"
                  >
                    #{s}
                  </span>
                ))}
              </div>
              <div className="pt-2 border-t border-border flex items-center gap-1 text-[11px] text-brand font-medium">
                <Zap className="w-3 h-3 fill-brand" />
                {w.reason}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Active Posts */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">내 공고 현황</h2>
          <Link
            href="/biz/posts"
            className="text-xs text-brand font-medium flex items-center gap-0.5"
          >
            전체 <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
          {ACTIVE_POSTS.map((post) => {
            const fillPct = Math.round((post.filled / post.headcount) * 100);
            const isFilled = post.status === "filled";
            return (
              <Link
                key={post.id}
                href={`/biz/posts/${post.id}`}
                className="block p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isFilled
                            ? "bg-brand/10 text-brand"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {isFilled ? "충원 완료" : "매칭 중"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {post.workDate} · {post.startTime}~{post.endTime}
                      </span>
                    </div>
                    <p className="font-bold text-sm truncate">{post.title}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <UserCheck className="w-3 h-3" />
                    {post.filled}/{post.headcount}명
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Users className="w-3 h-3" />
                    지원 {post.applications}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Eye className="w-3 h-3" />
                    조회 {post.views}
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isFilled ? "bg-brand" : "bg-amber-500"
                    }`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Monthly Summary */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-brand" />
          <h2 className="text-lg font-bold">이번 달 요약</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">총 채용 인원</p>
            <p className="text-2xl font-bold mt-1">{MONTH_SUMMARY.totalHires}명</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">지급 인건비</p>
            <p className="text-2xl font-bold mt-1">
              {formatMoney(MONTH_SUMMARY.totalPaid)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">평균 평점 받음</p>
            <p className="text-2xl font-bold mt-1 flex items-center gap-1">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              {MONTH_SUMMARY.avgRating}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">충원 성공률</p>
            <p className="text-2xl font-bold mt-1 text-brand">
              {MONTH_SUMMARY.fillRate}%
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
