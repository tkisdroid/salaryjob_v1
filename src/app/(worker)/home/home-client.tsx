"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { HomeFilterBar } from "@/components/worker/home-filter-bar";
import { MapView } from "@/components/worker/map-view";
import { formatWorkDate, calculateEarnings } from "@/lib/job-utils";
import { formatMoney, formatDistance } from "@/lib/format";
import { Clock, MapPin } from "lucide-react";
import type { Job } from "@/lib/types/job";
import type { TimePreset, TimeBucket } from "@/lib/time-filters";

/**
 * Phase 4 Plan 04-07 — /home list/map switch client.
 *
 * Responsibility: render the HomeFilterBar + either the list of jobs
 * or the MapView, based on the `currentView` prop.
 *
 * Navigation to job detail is performed via `router.push('/posts/:id')`
 * so marker clicks and list-row clicks share the same entry point.
 *
 * This component is deliberately stateless — all filter state lives in
 * the URL query string, managed by HomeFilterBar. That keeps deep-links
 * shareable and server-side rendering predictable.
 */

interface Props {
  initialJobs: Job[];
  center: { lat: number; lng: number };
  radiusKm: number;
  currentPreset?: TimePreset;
  currentBuckets: TimeBucket[];
  currentView: "list" | "map";
  kakaoAvailable: boolean;
}

export function HomeClient({
  initialJobs,
  center,
  radiusKm,
  currentPreset,
  currentBuckets,
  currentView,
  kakaoAvailable,
}: Props) {
  const router = useRouter();

  return (
    <div>
      <HomeFilterBar
        currentRadius={radiusKm}
        currentPreset={currentPreset}
        currentBuckets={currentBuckets}
        currentView={currentView}
        kakaoAvailable={kakaoAvailable}
      />

      {currentView === "map" ? (
        <div className="px-4 py-3">
          <MapView
            center={center}
            jobs={initialJobs}
            radiusM={radiusKm * 1000}
            onMarkerClick={(jobId) => router.push(`/posts/${jobId}`)}
          />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            반경 {radiusKm}km 이내 {initialJobs.length}건
          </p>
        </div>
      ) : (
        <div className="px-4 py-3">
          {initialJobs.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              해당 조건의 공고가 없습니다. 필터를 조정해 보세요.
            </p>
          ) : (
            <ul className="space-y-3">
              {initialJobs.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/posts/${job.id}`}
                    className="block rounded-2xl border border-border bg-card p-4 hover:shadow-md"
                  >
                    <div className="mb-2 flex items-start gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-lg">
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
                      <span className="text-sm font-bold text-brand">
                        {formatMoney(calculateEarnings(job))}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
