"use client";

import { useEffect, useRef, useState } from "react";
import { useKakaoMapsSDK } from "@/lib/hooks/use-kakao-maps-sdk";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Job } from "@/lib/types/job";
import { formatMoney } from "@/lib/format";
import { calculateEarnings } from "@/lib/job-utils";

/**
 * Phase 4 Plan 04-07 SEARCH-02 — Kakao Maps container with job markers.
 *
 * Behavior:
 *   - Lazy-loads SDK via useKakaoMapsSDK (autoload=false + kakao.maps.load)
 *   - If NEXT_PUBLIC_KAKAO_MAP_KEY is empty → renders an Alert placeholder
 *     (hasKey=false). No script is injected, no network call made.
 *   - Otherwise renders a <div> that Kakao maps into, plus:
 *       • a Circle showing the current search radius
 *       • one Marker per job (positioned at job.business.lat/lng)
 *       • marker click → shows a preview card overlay with job info +
 *         "상세보기" link the parent can hook via onMarkerClick
 *
 * Security / XSS (T-04-44):
 *   Marker titles are the raw job.title string — Kakao renders them into a
 *   DOM tooltip attribute, so they are escaped by the browser. The preview
 *   card is rendered via React (escaped). We never call SDK InfoWindow with
 *   raw HTML.
 */

interface Props {
  center: { lat: number; lng: number };
  jobs: Job[];
  radiusM: number;
  onMarkerClick?: (jobId: string) => void;
}

export function MapView({ center, jobs, radiusM, onMarkerClick }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const markersRef = useRef<kakao.maps.Marker[]>([]);
  const circleRef = useRef<kakao.maps.Circle | null>(null);
  const { ready, error, blockedMessage, hasKey } = useKakaoMapsSDK();

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Initialize the map once the SDK is ready and the container is mounted.
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const kakao = window.kakao;
    const map = new kakao.maps.Map(containerRef.current, {
      center: new kakao.maps.LatLng(center.lat, center.lng),
      level: 5,
    });
    mapRef.current = map;
    // Kakao often needs a relayout after mount when the container was hidden.
    requestAnimationFrame(() => map.relayout());
  }, [ready, center.lat, center.lng]);

  // Update the center + radius circle when props change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const kakao = window.kakao;
    map.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
    if (circleRef.current) circleRef.current.setMap(null);
    circleRef.current = new kakao.maps.Circle({
      center: new kakao.maps.LatLng(center.lat, center.lng),
      radius: radiusM,
      strokeWeight: 2,
      strokeColor: "#EA580C",
      strokeOpacity: 0.6,
      fillColor: "#FED7AA",
      fillOpacity: 0.15,
    });
    circleRef.current.setMap(map);
    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, [ready, center.lat, center.lng, radiusM]);

  // Rebuild markers when the jobs array changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const kakao = window.kakao;

    // Clear previous markers
    for (const m of markersRef.current) m.setMap(null);
    markersRef.current = [];

    for (const job of jobs) {
      const lat = Number(job.business.lat);
      const lng = Number(job.business.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(lat, lng),
        map,
        title: job.title, // escaped DOM tooltip (T-04-44)
        clickable: true,
      });
      kakao.maps.event.addListener(marker, "click", () => {
        setSelectedJob(job);
      });
      markersRef.current.push(marker);
    }

    return () => {
      for (const m of markersRef.current) m.setMap(null);
      markersRef.current = [];
    };
  }, [ready, jobs]);

  // Graceful: no Kakao key → render placeholder, never inject the script.
  if (!hasKey) {
    return (
      <div className="px-1 py-6">
        <div className="flex h-[60vh] min-h-[400px] w-full flex-col items-center justify-center gap-3 rounded-[22px] border-2 border-dashed border-border bg-surface p-6 text-center">
          <p className="text-[14px] font-extrabold tracking-tight text-ink">
            지도 보기는 곧 제공됩니다
          </p>
          <p className="max-w-xs text-[12.5px] font-medium leading-relaxed text-muted-foreground">
            현재는 리스트로만 확인할 수 있어요.
            <br />
            리스트 탭으로 돌아가 내 주변 공고를 살펴보세요.
          </p>
        </div>
      </div>
    );
  }

  if (blockedMessage) {
    return (
      <div className="px-4 py-6">
        <Alert>
          <AlertDescription>{blockedMessage}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        data-testid="kakao-map-container"
        className="h-[60vh] min-h-[400px] w-full overflow-hidden rounded-[22px] border border-border-soft bg-surface-2"
      />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[12px] font-bold tracking-tight text-text-subtle">
          지도 로딩 중...
        </div>
      )}
      {selectedJob && (
        <div
          className="absolute bottom-4 left-4 right-4 z-10 rounded-[18px] border border-border-soft bg-surface p-4 shadow-soft-md"
          data-testid="map-preview-card"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-muted-foreground">
                {selectedJob.business.name}
              </p>
              <h3 className="line-clamp-1 text-[14px] font-extrabold tracking-[-0.02em] text-ink">
                {selectedJob.title}
              </h3>
            </div>
            <button
              type="button"
              aria-label="미리보기 닫기"
              className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl leading-none text-text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
              onClick={() => setSelectedJob(null)}
            >
              ×
            </button>
          </div>
          <div className="tabnum flex items-center justify-between border-t border-border-soft pt-2 text-[12px]">
            <span className="font-medium text-muted-foreground">
              {selectedJob.workDate} {selectedJob.startTime}
            </span>
            <span className="font-extrabold text-brand-deep">
              {formatMoney(calculateEarnings(selectedJob))}
            </span>
          </div>
          {onMarkerClick && (
            <button
              type="button"
              onClick={() => onMarkerClick(selectedJob.id)}
              className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full bg-ink text-[12.5px] font-extrabold tracking-tight text-white transition-all hover:bg-black hover:shadow-soft-dark"
            >
              상세보기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
