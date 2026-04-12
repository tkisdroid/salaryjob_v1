"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { TimePreset, TimeBucket } from "@/lib/time-filters";

/**
 * Phase 4 Plan 04-07 SEARCH-02 + SEARCH-03 — /home filter bar.
 *
 * URL-as-source-of-truth: every filter update mutates the current pathname's
 * query string via `router.replace`, which triggers a server component
 * re-render that re-fetches jobs with the new filter. This keeps deep-links
 * shareable and the browser Back button predictable.
 *
 * URL query param schema:
 *   ?view=list|map               (default: list)
 *   &radius=1|3|5|10             (default: 3, km)
 *   &preset=오늘|내일|이번주      (optional, unset = no preset filter)
 *   &buckets=오전&buckets=오후...(multi, repeated keys, unset = no bucket filter)
 *
 * The `kakaoAvailable` prop drives whether the "지도" toggle is disabled —
 * set by the server component from `Boolean(process.env.NEXT_PUBLIC_KAKAO_MAP_KEY)`.
 *
 * `useTransition` wraps `router.replace` so UI stays interactive while the
 * server action fetches new data (pending state can be surfaced via isPending).
 */

interface Props {
  currentRadius: number;
  currentPreset?: TimePreset;
  currentBuckets: TimeBucket[];
  currentView: "list" | "map";
  /**
   * Reserved for future UX signal (e.g. badge). The 지도 toggle itself is
   * always clickable — if the Kakao key is missing, MapView renders a
   * friendly placeholder instead of silently dying under a disabled button.
   */
  kakaoAvailable: boolean;
}

const RADIUS_STEPS = [1, 3, 5, 10] as const;
const PRESETS: TimePreset[] = ["오늘", "내일", "이번주"];
const BUCKETS: TimeBucket[] = ["오전", "오후", "저녁", "야간"];

export function HomeFilterBar({
  currentRadius,
  currentPreset,
  currentBuckets,
  currentView,
  kakaoAvailable: _kakaoAvailable,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function mutate(cb: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(sp?.toString() ?? "");
    cb(params);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : (pathname ?? "/home"));
    });
  }

  return (
    <div
      data-testid="home-filter-bar"
      className={`sticky top-0 z-20 space-y-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur ${
        isPending ? "opacity-80" : ""
      }`}
    >
      {/* View toggle: 리스트 | 지도 */}
      <div className="flex items-center justify-between">
        <ToggleGroup
          type="single"
          value={currentView}
          onValueChange={(v: string) => {
            if (!v) return;
            mutate((p) => p.set("view", v));
          }}
          aria-label="보기 모드"
        >
          <ToggleGroupItem value="list" aria-label="리스트 보기">
            리스트
          </ToggleGroupItem>
          <ToggleGroupItem value="map" aria-label="지도 보기" title="지도로 보기">
            지도
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Distance stepper 1/3/5/10 km */}
      <div>
        <p className="mb-1 text-[10px] font-medium text-muted-foreground">
          거리
        </p>
        <ToggleGroup
          type="single"
          value={String(currentRadius)}
          onValueChange={(v: string) => {
            if (!v) return;
            mutate((p) => p.set("radius", v));
          }}
          aria-label="검색 반경"
        >
          {RADIUS_STEPS.map((km) => (
            <ToggleGroupItem key={km} value={String(km)}>
              {km}km
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Time preset (single) */}
      <div>
        <p className="mb-1 text-[10px] font-medium text-muted-foreground">
          시기
        </p>
        <ToggleGroup
          type="single"
          value={currentPreset ?? ""}
          onValueChange={(v: string) => {
            mutate((p) => {
              if (v) p.set("preset", v);
              else p.delete("preset");
            });
          }}
          aria-label="시간 프리셋"
        >
          {PRESETS.map((preset) => (
            <ToggleGroupItem key={preset} value={preset}>
              {preset}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Time buckets (multiple) */}
      <div>
        <p className="mb-1 text-[10px] font-medium text-muted-foreground">
          시간대
        </p>
        <ToggleGroup
          type="multiple"
          value={currentBuckets}
          onValueChange={(values: string[]) => {
            mutate((p) => {
              p.delete("buckets");
              for (const v of values) p.append("buckets", v);
            });
          }}
          aria-label="시간대 필터"
        >
          {BUCKETS.map((bucket) => (
            <ToggleGroupItem key={bucket} value={bucket}>
              {bucket}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
