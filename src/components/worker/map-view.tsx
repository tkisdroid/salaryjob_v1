"use client";

import { useEffect, useRef, useState } from "react";
import { useNaverMapsSDK } from "@/lib/hooks/use-naver-maps-sdk";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Job } from "@/lib/types/job";
import { formatMoney } from "@/lib/format";
import { calculateEarnings } from "@/lib/job-utils";

/**
 * Naver Maps container with job markers for /home search view.
 *
 * Behavior:
 *   - Lazy-loads SDK via useNaverMapsSDK (single script injection; the global
 *     `window.naver.maps` is populated on script.onload — no separate load
 *     callback is needed, unlike Kakao's autoload=false pattern).
 *   - If NEXT_PUBLIC_NAVER_MAP_CLIENT_ID is empty → renders an Alert
 *     placeholder (hasKey=false). No script is injected, no network call made.
 *   - Otherwise renders a <div> that Naver maps into, plus:
 *       • a Circle showing the current search radius
 *       • one Marker per job (positioned at job.business.lat/lng)
 *       • marker click → shows a preview card overlay with job info +
 *         "상세보기" link the parent can hook via onMarkerClick
 *
 * Security / XSS:
 *   Marker titles are the raw job.title string — Naver renders them into a
 *   DOM tooltip attribute, so they are escaped by the browser. The preview
 *   card is rendered via React (escaped). We never call the SDK InfoWindow
 *   with raw HTML.
 */

interface Props {
  center: { lat: number; lng: number };
  jobs: Job[];
  radiusM: number;
  onMarkerClick?: (jobId: string) => void;
}

export function MapView({ center, jobs, radiusM, onMarkerClick }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const markerListenersRef = useRef<naver.maps.EventListener[]>([]);
  const circleRef = useRef<naver.maps.Circle | null>(null);
  const { ready, error, blockedMessage, hasKey } = useNaverMapsSDK();

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Initialize the map once the SDK is ready and the container is mounted.
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const nv = window.naver;
    const map = new nv.maps.Map(containerRef.current, {
      center: new nv.maps.LatLng(center.lat, center.lng),
      // Naver's zoom scale is inverse to Kakao's level: higher zoom = closer.
      // zoom 14 covers roughly the same area as Kakao level 5 (~2km across).
      zoom: 14,
    });
    mapRef.current = map;
    // If the container was hidden at mount time, the tile grid may need a
    // recalculation once it becomes visible.
    requestAnimationFrame(() => map.refresh());
  }, [ready, center.lat, center.lng]);

  // Update the center + radius circle when props change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const nv = window.naver;
    const centerLatLng = new nv.maps.LatLng(center.lat, center.lng);
    map.setCenter(centerLatLng);
    if (circleRef.current) circleRef.current.setMap(null);
    circleRef.current = new nv.maps.Circle({
      map,
      center: centerLatLng,
      radius: radiusM,
      strokeWeight: 2,
      strokeColor: "#EA580C",
      strokeOpacity: 0.6,
      fillColor: "#FED7AA",
      fillOpacity: 0.15,
    });
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
    const nv = window.naver;

    // Clear previous markers and their click listeners.
    for (const listener of markerListenersRef.current) listener.remove();
    markerListenersRef.current = [];
    for (const m of markersRef.current) m.setMap(null);
    markersRef.current = [];

    for (const job of jobs) {
      const lat = Number(job.business.lat);
      const lng = Number(job.business.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const marker = new nv.maps.Marker({
        position: new nv.maps.LatLng(lat, lng),
        map,
        title: job.title, // escaped by the browser when written to the DOM
        clickable: true,
      });
      const listener = nv.maps.Event.addListener(marker, "click", () => {
        setSelectedJob(job);
      });
      markersRef.current.push(marker);
      markerListenersRef.current.push(listener);
    }

    return () => {
      for (const listener of markerListenersRef.current) listener.remove();
      markerListenersRef.current = [];
      for (const m of markersRef.current) m.setMap(null);
      markersRef.current = [];
    };
  }, [ready, jobs]);

  // Graceful: no Naver key → render placeholder, never inject the script.
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
        data-testid="naver-map-container"
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
