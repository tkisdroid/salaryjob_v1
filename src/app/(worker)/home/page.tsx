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

  const mapAvailable = Boolean(
    process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID &&
      process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID.trim() !== "",
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header — Premium greet pattern (small label + bold name + wave) */}
      <header className="sticky top-0 z-40 border-b border-border-soft bg-[color-mix(in_oklch,var(--surface)_92%,transparent)] [backdrop-filter:saturate(1.4)_blur(12px)]">
        <div className="mx-auto flex h-[72px] max-w-lg items-center justify-between px-4">
          <div>
            <p className="text-[12px] font-semibold tracking-tight text-muted-foreground">
              안녕하세요
            </p>
            <p className="mt-1 flex items-center gap-2 text-[22px] font-extrabold tracking-tight text-ink">
              {worker?.name ?? "게스트"}
              <span className="text-[20px]">👋</span>
            </p>
          </div>
          <Link
            href="/notifications"
            aria-label="알림"
            className="relative flex h-10 w-10 items-center justify-center rounded-[14px] border border-border bg-surface text-ink transition-colors hover:border-ink"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-[9px] right-[9px] h-[7px] w-[7px] rounded-full bg-[#ff4d4f] shadow-[0_0_0_2px_var(--bg)]" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-2 px-4 pt-3 pb-6">
        {/* Income hero card — gradient brand→brand-dark + lime radial highlight */}
        <section>
          <div
            className="relative overflow-hidden rounded-[26px] p-[22px] pb-5 text-ink shadow-[0_18px_40px_-10px_color-mix(in_oklch,var(--brand)_40%,transparent)]"
            style={{
              background:
                "radial-gradient(120% 160% at 100% 0%, color-mix(in oklch, var(--lime-accent) 70%, transparent), transparent 60%), linear-gradient(180deg, var(--brand) 0%, var(--brand-dark) 100%)",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-10 -right-14 h-[200px] w-[200px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in oklch, var(--lime-accent) 50%, transparent), transparent 70%)",
              }}
            />
            <div className="relative flex items-start justify-between">
              <span className="inline-flex items-center rounded-full bg-[color-mix(in_oklch,var(--ink)_85%,transparent)] px-[11px] py-[5px] text-[12px] font-bold text-white">
                이번 달 수입
              </span>
              <span className="grid h-[34px] w-[34px] place-items-center rounded-[12px] bg-[color-mix(in_oklch,var(--ink)_90%,transparent)] text-lime-accent">
                <TrendingUp className="h-[18px] w-[18px]" />
              </span>
            </div>

            <p className="tabnum relative mt-[14px] flex items-baseline text-[44px] font-extrabold tracking-[-0.045em]">
              {formatMoney(worker?.thisMonthEarnings ?? 0)}
            </p>
            <p className="relative mt-0.5 text-[12px] font-semibold text-[color-mix(in_oklch,var(--ink)_75%,transparent)]">
              지난 달 대비 꾸준히
            </p>

            <div className="relative mt-5 grid grid-cols-3 border-t border-[color-mix(in_oklch,var(--ink)_15%,transparent)] pt-4">
              <div className="pr-2">
                <p className="text-[11px] font-semibold tracking-tight text-[color-mix(in_oklch,var(--ink)_70%,transparent)]">
                  누적 근무
                </p>
                <p className="tabnum mt-[3px] text-[17px] font-extrabold tracking-[-0.03em]">
                  {worker?.totalJobs ?? 0}회
                </p>
              </div>
              <div className="border-l border-[color-mix(in_oklch,var(--ink)_12%,transparent)] pl-4 pr-2">
                <p className="text-[11px] font-semibold tracking-tight text-[color-mix(in_oklch,var(--ink)_70%,transparent)]">
                  평점
                </p>
                <p className="tabnum mt-[3px] flex items-center gap-[3px] text-[17px] font-extrabold tracking-[-0.03em]">
                  <Star className="h-[14px] w-[14px] fill-[#fbbf24] text-[#fbbf24]" />
                  {worker?.rating ?? 0}
                </p>
              </div>
              <div className="border-l border-[color-mix(in_oklch,var(--ink)_12%,transparent)] pl-4">
                <p className="text-[11px] font-semibold tracking-tight text-[color-mix(in_oklch,var(--ink)_70%,transparent)]">
                  완료율
                </p>
                <p className="tabnum mt-[3px] text-[17px] font-extrabold tracking-[-0.03em]">
                  {worker?.completionRate ?? 0}%
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Category pills — 6 columns, surface tile with border */}
        <section>
          <h2 className="sec-label">
            <span className="mark">✨</span>카테고리
          </h2>
          <div className="grid grid-cols-6 gap-1.5">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/search?category=${cat.id}`}
                className="group flex min-w-0 flex-col items-center gap-2"
              >
                <div className="grid aspect-square w-full max-w-[52px] place-items-center rounded-[16px] border border-border bg-surface text-xl transition-all group-hover:-translate-y-0.5 group-hover:border-ink">
                  {cat.emoji}
                </div>
                <span className="whitespace-nowrap text-[11px] font-bold tracking-tight text-ink">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Urgent jobs — lime-chip badge + dashed foot separator */}
        {urgentJobs.length > 0 && (
          <section>
            <div className="mb-[10px] mt-6 flex items-center justify-between px-0.5">
              <h2 className="flex items-center gap-2 text-[15px] font-extrabold tracking-tight text-ink">
                <Zap className="h-[18px] w-[18px] fill-[color:var(--urgent)] text-[color:var(--urgent)]" />
                급구 · 오늘 바로 근무
              </h2>
              <Link
                href="/search?urgent=1"
                className="text-[11.5px] font-bold text-brand-deep"
              >
                더보기 →
              </Link>
            </div>
            <div className="chip-scroll -mx-4 overflow-y-visible px-4 pb-3 pt-1">
              {urgentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/posts/${job.id}`}
                  className="relative w-64 shrink-0 rounded-[22px] border border-border bg-surface p-[18px] transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-soft-md"
                >
                  <span className="absolute top-[14px] right-[14px] inline-flex items-center gap-1 rounded-full bg-lime-chip px-[9px] py-[4px] text-[10.5px] font-extrabold tracking-tight text-lime-chip-fg">
                    급구
                  </span>
                  <div className="mb-2 flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-border-soft bg-surface-2 text-xl">
                      {job.business.logo}
                    </div>
                    <div className="min-w-0 flex-1 pr-10">
                      <p className="truncate text-[11px] font-bold tracking-tight text-muted-foreground">
                        {job.business.name}
                      </p>
                      <h3 className="line-clamp-1 text-[15.5px] font-extrabold tracking-[-0.03em] text-ink">
                        {job.title}
                      </h3>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2.5 text-[11.5px] font-semibold text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatWorkDate(job.workDate)} {job.startTime}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {formatDistance(job.distanceM)}
                    </span>
                  </div>
                  <div className="mt-[14px] flex items-center justify-between border-t border-dashed border-border pt-3">
                    <span className="text-[12px] font-bold text-muted-foreground">
                      시급 {formatMoney(job.hourlyPay)}
                    </span>
                    <span className="tabnum text-[17px] font-extrabold tracking-[-0.03em] text-brand-deep">
                      {formatMoney(calculateEarnings(job))}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recommended — HomeClient owns list/map toggle + filter bar */}
        <section>
          <div className="mb-[10px] mt-6 flex items-center justify-between px-0.5">
            <h2 className="flex items-center gap-2 text-[15px] font-extrabold tracking-tight text-ink">
              <Sparkles className="h-[18px] w-[18px] text-brand-deep" />내 주변 공고
            </h2>
          </div>
          <HomeClient
            initialJobs={nearby.jobs}
            center={DEFAULT_CENTER}
            radiusKm={filters.radiusKm}
            currentPreset={filters.preset}
            currentBuckets={filters.buckets}
            currentView={filters.view}
            mapAvailable={mapAvailable}
          />
        </section>
      </div>
    </div>
  );
}
