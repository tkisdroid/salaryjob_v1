import Link from "next/link";
import {
  getJobsByDistance,
  getUrgentJobs,
  getCurrentWorker,
} from "@/lib/db/queries";
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
import { HomeClient } from "./home-client";
import {
  isTimePreset,
  isTimeBucket,
  type TimePreset,
  type TimeBucket,
} from "@/lib/time-filters";

const CATEGORIES = [
  { id: "food", label: "음식점", emoji: "☕" },
  { id: "retail", label: "판매", emoji: "🛍️" },
  { id: "logistics", label: "물류", emoji: "📦" },
  { id: "event", label: "행사", emoji: "🎪" },
  { id: "office", label: "사무", emoji: "💼" },
  { id: "cleaning", label: "청소", emoji: "✨" },
] as const;

// Seoul City Hall — SSR fallback coordinate. The client-side geolocation
// hook (used by legacy HomeJobList) upgraded this after permission grant,
// but for Plan 04-07 the SSR rendering uses Seoul as the default center.
// Future work (Phase 5): read an optional ?lat&lng query param so the map
// view can deep-link to a worker's current position.
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 } as const;
const DEFAULT_RADIUS_KM = 3;
const VALID_RADII = new Set([1, 3, 5, 10]);

type RawSearchParams = Record<string, string | string[] | undefined>;

interface ParsedFilters {
  view: "list" | "map";
  radiusKm: number;
  preset?: TimePreset;
  buckets: TimeBucket[];
}

function parseFilters(params: RawSearchParams): ParsedFilters {
  const viewRaw = typeof params.view === "string" ? params.view : undefined;
  const view: "list" | "map" = viewRaw === "map" ? "map" : "list";

  const radiusRaw =
    typeof params.radius === "string" ? Number(params.radius) : NaN;
  const radiusKm = VALID_RADII.has(radiusRaw) ? radiusRaw : DEFAULT_RADIUS_KM;

  const presetRaw =
    typeof params.preset === "string" ? params.preset : undefined;
  const preset = isTimePreset(presetRaw) ? presetRaw : undefined;

  const bucketsRaw = params.buckets;
  const bucketArr = Array.isArray(bucketsRaw)
    ? bucketsRaw
    : typeof bucketsRaw === "string"
      ? [bucketsRaw]
      : [];
  const buckets: TimeBucket[] = bucketArr.filter(isTimeBucket);

  return { view, radiusKm, preset, buckets };
}

/**
 * Phase 4 Plan 04-07 — Worker /home page with SEARCH-02/03 filters.
 *
 * Server component that:
 *   1. Parses searchParams (Next.js 16: Promise<...>)
 *   2. Calls getJobsByDistance with timePreset + timeBuckets filters
 *   3. Hands the result + filter state to HomeClient for list/map rendering
 *
 * The Earnings / Categories / Urgent sections from Phase 3 are preserved
 * so the /home landing experience remains visually consistent; only the
 * "내 주변 공고" section has been replaced with HomeClient (which owns
 * the filter bar + list/map switch).
 */
export default async function WorkerHomePage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const [urgentJobs, nearby, worker] = await Promise.all([
    getUrgentJobs(),
    getJobsByDistance({
      userLat: DEFAULT_CENTER.lat,
      userLng: DEFAULT_CENTER.lng,
      radiusM: filters.radiusKm * 1000,
      limit: 50,
      timePreset: filters.preset,
      timeBuckets: filters.buckets,
    }),
    getCurrentWorker(),
  ]);

  const kakaoAvailable = Boolean(
    process.env.NEXT_PUBLIC_KAKAO_MAP_KEY &&
      process.env.NEXT_PUBLIC_KAKAO_MAP_KEY.trim() !== "",
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div>
            <p className="text-[10px] text-muted-foreground">안녕하세요</p>
            <p className="text-sm font-bold">{worker?.name ?? "게스트"}님 👋</p>
          </div>
          <Link
            href="/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-6 py-4">
        {/* Earnings Card */}
        <section className="mx-4">
          <div className="rounded-2xl bg-brand p-5 text-white">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm opacity-90">이번 달 수입</p>
              <TrendingUp className="h-4 w-4 opacity-80" />
            </div>
            <p className="text-3xl font-bold">
              {formatMoney(worker?.thisMonthEarnings ?? 0)}
            </p>
            <div className="mt-4 flex justify-between border-t border-white/20 pt-4 text-sm">
              <div>
                <p className="text-xs opacity-80">누적 근무</p>
                <p className="font-bold">{worker?.totalJobs ?? 0}회</p>
              </div>
              <div>
                <p className="text-xs opacity-80">평점</p>
                <p className="flex items-center gap-1 font-bold">
                  <Star className="h-3 w-3 fill-white" />
                  {worker?.rating ?? 0}
                </p>
              </div>
              <div>
                <p className="text-xs opacity-80">완료율</p>
                <p className="font-bold">{worker?.completionRate ?? 0}%</p>
              </div>
            </div>
          </div>
        </section>

        {/* Category Chips */}
        <section className="mx-4">
          <h2 className="mb-3 text-sm font-bold">카테고리</h2>
          <div className="grid grid-cols-6 gap-2">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/search?category=${cat.id}`}
                className="flex flex-col items-center gap-1 rounded-xl p-2 transition-colors hover:bg-muted"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-xl">
                  {cat.emoji}
                </div>
                <span className="text-[10px] font-medium">{cat.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Urgent Jobs */}
        {urgentJobs.length > 0 && (
          <section className="mx-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-base font-bold">
                <Zap className="h-4 w-4 fill-destructive text-destructive" />
                급구 · 오늘 바로 근무
              </h2>
              <Link
                href="/search?urgent=1"
                className="text-xs font-medium text-brand"
              >
                더보기 →
              </Link>
            </div>
            <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
              {urgentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/posts/${job.id}`}
                  className="w-64 shrink-0 snap-start rounded-2xl border-2 border-red-500/30 bg-card p-4 transition-all hover:shadow-lg"
                >
                  <div className="mb-2 flex items-start gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-lg">
                      {job.business.logo}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] text-muted-foreground">
                        {job.business.name}
                      </p>
                      <h3 className="line-clamp-1 text-sm font-bold">
                        {job.title}
                      </h3>
                    </div>
                  </div>
                  <div className="mb-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatWorkDate(job.workDate)} {job.startTime}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {formatDistance(job.distanceM)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-[10px] text-muted-foreground">
                      시급 {formatMoney(job.hourlyPay)}
                    </span>
                    <span className="text-sm font-bold text-red-600">
                      {formatMoney(calculateEarnings(job))}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recommended — Plan 04-07: HomeClient (list/map toggle + filters) */}
        <section>
          <div className="mx-4 mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-base font-bold">
              <Sparkles className="h-4 w-4 text-brand" />내 주변 공고
            </h2>
          </div>
          <HomeClient
            initialJobs={nearby.jobs}
            center={DEFAULT_CENTER}
            radiusKm={filters.radiusKm}
            currentPreset={filters.preset}
            currentBuckets={filters.buckets}
            currentView={filters.view}
            kakaoAvailable={kakaoAvailable}
          />
        </section>
      </div>
    </div>
  );
}
