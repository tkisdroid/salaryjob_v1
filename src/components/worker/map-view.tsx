"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatMoney } from "@/lib/format";
import { calculateEarnings } from "@/lib/job-utils";
import { useNaverMapsSDK } from "@/lib/hooks/use-naver-maps-sdk";
import type { Job } from "@/lib/types/job";

interface Props {
  center: { lat: number; lng: number };
  jobs: Job[];
  radiusM: number;
  onMarkerClick?: (jobId: string) => void;
}

function MapPreviewCard({
  job,
  onClose,
  onMarkerClick,
}: {
  job: Job;
  onClose: () => void;
  onMarkerClick?: (jobId: string) => void;
}) {
  return (
    <div
      className="absolute bottom-4 left-4 right-4 z-10 rounded-[18px] border border-border-soft bg-surface p-4 shadow-soft-md"
      data-testid="map-preview-card"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold text-muted-foreground">
            {job.business.name}
          </p>
          <h3 className="line-clamp-1 text-[14px] font-extrabold tracking-[-0.02em] text-ink">
            {job.title}
          </h3>
        </div>
        <button
          type="button"
          aria-label="미리보기 닫기"
          className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl leading-none text-text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="tabnum flex items-center justify-between border-t border-border-soft pt-2 text-[12px]">
        <span className="font-medium text-muted-foreground">
          {job.workDate} {job.startTime}
        </span>
        <span className="font-extrabold text-brand-deep">
          {formatMoney(calculateEarnings(job))}
        </span>
      </div>
      {onMarkerClick && (
        <button
          type="button"
          onClick={() => onMarkerClick(job.id)}
          className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full bg-ink text-[12.5px] font-extrabold tracking-tight text-white transition-all hover:bg-black hover:shadow-soft-dark"
        >
          상세보기
        </button>
      )}
    </div>
  );
}

export function MapView({ center, jobs, radiusM, onMarkerClick }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const markerListenersRef = useRef<naver.maps.EventListener[]>([]);
  const circleRef = useRef<naver.maps.Circle | null>(null);
  const { ready, error, blockedMessage, hasKey } = useNaverMapsSDK();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;

    const nv = window.naver;
    const map = new nv.maps.Map(containerRef.current, {
      center: new nv.maps.LatLng(center.lat, center.lng),
      zoom: 14,
    });
    mapRef.current = map;
    requestAnimationFrame(() => map.refresh());
  }, [ready, center.lat, center.lng]);

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const nv = window.naver;
    for (const listener of markerListenersRef.current) listener.remove();
    markerListenersRef.current = [];
    for (const marker of markersRef.current) marker.setMap(null);
    markersRef.current = [];

    for (const job of jobs) {
      const lat = Number(job.business.lat);
      const lng = Number(job.business.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const marker = new nv.maps.Marker({
        position: new nv.maps.LatLng(lat, lng),
        map,
        title: job.title,
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
      for (const marker of markersRef.current) marker.setMap(null);
      markersRef.current = [];
    };
  }, [ready, jobs]);

  if (!hasKey) {
    const points = jobs
      .map((job) => ({
        job,
        lat: Number(job.business.lat),
        lng: Number(job.business.lng),
      }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
    const latValues = points.map((point) => point.lat);
    const lngValues = points.map((point) => point.lng);
    const minLat = Math.min(...latValues, center.lat);
    const maxLat = Math.max(...latValues, center.lat);
    const minLng = Math.min(...lngValues, center.lng);
    const maxLng = Math.max(...lngValues, center.lng);
    const latSpan = Math.max(maxLat - minLat, 0.01);
    const lngSpan = Math.max(maxLng - minLng, 0.01);

    return (
      <div className="relative">
        <div
          className="relative h-[50vh] min-h-[320px] max-h-[460px] w-full overflow-hidden rounded-[22px] border border-border-soft bg-[linear-gradient(135deg,color-mix(in_oklch,var(--brand)_10%,var(--surface))_0%,var(--surface-2)_52%,var(--surface)_100%)]"
          data-testid="fallback-map-container"
        >
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:36px_36px]" />
          <div className="absolute left-4 top-4 rounded-full border border-border bg-surface px-3 py-2 text-[11.5px] font-extrabold tracking-tight text-ink shadow-soft">
            위치 기반 지도 보기 · {points.length}건
          </div>
          <div
            className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-ink shadow-soft-dark"
            style={{
              left: `${((center.lng - minLng) / lngSpan) * 76 + 12}%`,
              top: `${(1 - (center.lat - minLat) / latSpan) * 76 + 12}%`,
            }}
            aria-label="현재 기준 위치"
          />
          {points.map(({ job, lat, lng }) => (
            <button
              key={job.id}
              type="button"
              onClick={() => setSelectedJob(job)}
              className="absolute grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand text-[12px] font-extrabold text-ink shadow-soft-green transition-transform hover:scale-105"
              style={{
                left: `${((lng - minLng) / lngSpan) * 76 + 12}%`,
                top: `${(1 - (lat - minLat) / latSpan) * 76 + 12}%`,
              }}
              aria-label={`${job.title} 위치 보기`}
            >
              {formatMoney(job.hourlyPay).replace("원", "")}
            </button>
          ))}
          {points.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <p className="text-[13px] font-bold text-muted-foreground">
                표시할 위치 정보가 있는 공고가 없습니다.
              </p>
            </div>
          )}
        </div>
        {selectedJob && (
          <MapPreviewCard
            job={selectedJob}
            onClose={() => setSelectedJob(null)}
            onMarkerClick={onMarkerClick}
          />
        )}
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
        className="h-[50vh] min-h-[320px] max-h-[460px] w-full overflow-hidden rounded-[22px] border border-border-soft bg-surface-2"
      />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[12px] font-bold tracking-tight text-text-subtle">
          지도 로딩 중...
        </div>
      )}
      {selectedJob && (
        <MapPreviewCard
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onMarkerClick={onMarkerClick}
        />
      )}
    </div>
  );
}
