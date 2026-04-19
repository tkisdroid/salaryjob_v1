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
        <div className="py-3">
          <MapView
            center={center}
            jobs={initialJobs}
            radiusM={radiusKm * 1000}
            onMarkerClick={(jobId) => router.push(`/posts/${jobId}`)}
          />
          <p className="mt-3 text-center text-[12px] font-semibold text-muted-foreground">
            반경 <b className="font-extrabold text-ink">{radiusKm}km</b> 이내{" "}
            <b className="tabnum font-extrabold text-ink">
              {initialJobs.length}
            </b>
            건
          </p>
        </div>
      ) : (
        <div className="py-3">
          <div className="mb-2.5 flex items-center justify-between px-0.5">
            <p className="text-[12px] font-bold text-muted-foreground">
              공고{" "}
              <b className="tabnum font-extrabold text-ink">
                {initialJobs.length}
              </b>
              건
            </p>
          </div>
          {initialJobs.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              해당 조건의 공고가 없습니다. 필터를 조정해 보세요.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {initialJobs.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/posts/${job.id}`}
                    className="group relative block rounded-[22px] border border-border bg-surface p-[18px] transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-soft-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-border-soft bg-surface-2 text-xl">
                        {job.business.logo}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-bold tracking-tight text-muted-foreground">
                          {job.business.name}
                        </p>
                        <h3 className="mt-0.5 line-clamp-1 text-[15.5px] font-extrabold tracking-[-0.03em] text-ink">
                          {job.title}
                        </h3>
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
                      </div>
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
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
