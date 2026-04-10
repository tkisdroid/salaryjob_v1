"use client";

import { useEffect, useState } from "react";
import type { Job } from "@/lib/types/job";
import { useGeolocation, SEOUL_CITY_HALL } from "@/lib/hooks/use-geolocation";
import { JobListInfinite } from "@/components/worker/job-list-infinite";

interface DistanceMode {
  userLat: number;
  userLng: number;
  radiusM: number;
}

interface Props {
  initialJobs: Job[];
  initialCursor: string | null;
}

const DEFAULT_RADIUS_M = 10_000; // 10km default — D-06

/**
 * D-06 wiring: wraps JobListInfinite with geolocation-driven distance sort.
 *
 * Behavior:
 *  - First render: distanceMode=null, list uses time-sort (SSR already sent
 *    time-sorted initialJobs)
 *  - User clicks "내 근처" → useGeolocation.requestLocation() → browser
 *    permission prompt
 *  - On success: setDistanceMode({ userLat, userLng, radiusM }) →
 *    JobListInfinite re-renders; subsequent loadMoreJobs calls use distance sort
 *  - On denial: fallback to Seoul City Hall coords, show permission banner
 *
 * NOTE: The FIRST PAGE remains time-sorted even after permission is granted —
 * we do NOT re-fetch the first 20. The distance sort takes effect on the next
 * scroll-triggered loadMore. This is an intentional UX tradeoff (fast first
 * paint vs perfectly sorted results). Phase 3+ polish could add a refresh.
 */
export function HomeJobList({ initialJobs, initialCursor }: Props) {
  const { coords, denied, loading, requestLocation } = useGeolocation();
  const [distanceMode, setDistanceMode] = useState<DistanceMode | null>(null);

  // React to coords arriving (real or fallback) — flip distanceMode on.
  // Uses effect so we don't trigger a state update during render.
  useEffect(() => {
    if (coords && !distanceMode) {
      setDistanceMode({
        userLat: coords.lat,
        userLng: coords.lng,
        radiusM: DEFAULT_RADIUS_M,
      });
    }
  }, [coords, distanceMode]);

  const handleRequest = () => {
    requestLocation();
  };

  // Track whether coords came from the real fallback (Seoul City Hall)
  // so we show the banner even once distanceMode is active.
  const usingFallback =
    denied &&
    coords !== null &&
    coords.lat === SEOUL_CITY_HALL.lat &&
    coords.lng === SEOUL_CITY_HALL.lng;

  return (
    <div className="space-y-3">
      {/* Permission-denied banner with retry — D-06 fallback UX */}
      {usingFallback && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="mb-2">
            정확한 거리를 위해 위치 권한을 허용해 주세요. 현재는 서울시청
            기준으로 표시됩니다.
          </p>
          <button
            type="button"
            onClick={handleRequest}
            className="rounded bg-amber-600 px-3 py-1 text-xs font-semibold text-white"
          >
            위치 권한 다시 요청
          </button>
        </div>
      )}

      {/* "내 근처" toggle button — only before geolocation kicks in */}
      {!distanceMode && (
        <button
          type="button"
          onClick={handleRequest}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded border border-brand p-2 text-sm font-semibold text-brand disabled:opacity-50"
        >
          {loading ? "위치 확인 중..." : "내 근처 공고 먼저 보기"}
        </button>
      )}

      {/* Active distance-mode indicator */}
      {distanceMode && !usingFallback && (
        <div className="rounded bg-brand/5 p-2 text-center text-xs text-brand">
          현재 위치 기준 {DEFAULT_RADIUS_M / 1000}km 이내 공고를 우선 표시합니다.
        </div>
      )}

      <JobListInfinite
        initialJobs={initialJobs}
        initialCursor={initialCursor}
        distanceMode={distanceMode}
      />
    </div>
  );
}
