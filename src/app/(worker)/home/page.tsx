import Link from "next/link";
import {
  getJobsPaginated,
  getUrgentJobs,
  getCurrentWorker,
} from "@/lib/db/queries";
import { HomeJobList } from "./home-job-list";
import { formatWorkDate, calculateEarnings } from "@/lib/job-utils";
import { formatMoney, formatDistance } from "@/lib/format";
import {
  Clock,
  MapPin,
  Star,
  Zap,
  Bell,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const CATEGORIES = [
  { id: "food", label: "음식점", emoji: "☕" },
  { id: "retail", label: "판매", emoji: "🛍️" },
  { id: "logistics", label: "물류", emoji: "📦" },
  { id: "event", label: "행사", emoji: "🎪" },
  { id: "office", label: "사무", emoji: "💼" },
  { id: "cleaning", label: "청소", emoji: "✨" },
] as const;

export default async function WorkerHomePage() {
  const [urgentJobs, jobPage, worker] = await Promise.all([
    getUrgentJobs(),
    getJobsPaginated({ limit: 20 }),
    getCurrentWorker(),
  ]);
  const { jobs: recommendedJobs, nextCursor: recommendedCursor } = jobPage;

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground">안녕하세요</p>
            <p className="text-sm font-bold">
              {worker?.name ?? "게스트"}님 👋
            </p>
          </div>
          <Link
            href="/notifications"
            className="relative w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {/* Earnings Card */}
        <section className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white p-5 shadow-lg shadow-brand/20">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm opacity-90">이번 달 수입</p>
            <TrendingUp className="w-4 h-4 opacity-80" />
          </div>
          <p className="text-3xl font-bold">
            {formatMoney(worker?.thisMonthEarnings ?? 0)}
          </p>
          <div className="mt-4 pt-4 border-t border-white/20 flex justify-between text-sm">
            <div>
              <p className="opacity-80 text-xs">누적 근무</p>
              <p className="font-bold">{worker?.totalJobs ?? 0}회</p>
            </div>
            <div>
              <p className="opacity-80 text-xs">평점</p>
              <p className="font-bold flex items-center gap-1">
                <Star className="w-3 h-3 fill-white" />
                {worker?.rating ?? 0}
              </p>
            </div>
            <div>
              <p className="opacity-80 text-xs">완료율</p>
              <p className="font-bold">{worker?.completionRate ?? 0}%</p>
            </div>
          </div>
        </section>

        {/* Category Chips */}
        <section>
          <h2 className="text-sm font-bold mb-3">카테고리</h2>
          <div className="grid grid-cols-6 gap-2">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/search?category=${cat.id}`}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-xl">
                  {cat.emoji}
                </div>
                <span className="text-[10px] font-medium">{cat.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Urgent Jobs */}
        {urgentJobs.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-red-500 fill-red-500" />
                급구 · 오늘 바로 근무
              </h2>
              <Link
                href="/search?urgent=1"
                className="text-xs text-brand font-medium"
              >
                더보기 →
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 snap-x snap-mandatory">
              {urgentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/posts/${job.id}`}
                  className="shrink-0 w-64 snap-start rounded-2xl border-2 border-red-500/30 bg-card p-4 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-lg">
                      {job.business.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground truncate">
                        {job.business.name}
                      </p>
                      <h3 className="font-bold text-sm line-clamp-1">
                        {job.title}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatWorkDate(job.workDate)} {job.startTime}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {formatDistance(job.distanceM)}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      시급 {formatMoney(job.hourlyPay)}
                    </span>
                    <span className="font-bold text-red-600 text-sm">
                      {formatMoney(calculateEarnings(job))}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recommended — D-06 geolocation + distance sort via HomeJobList */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand" />내 주변 공고
            </h2>
          </div>
          <HomeJobList
            initialJobs={recommendedJobs}
            initialCursor={recommendedCursor}
          />
        </section>
      </div>
    </div>
  );
}
