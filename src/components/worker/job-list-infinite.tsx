"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Job } from "@/lib/types/job";
import { loadMoreJobs } from "@/app/(worker)/home/actions";

interface DistanceMode {
  userLat: number;
  userLng: number;
  radiusM: number;
}

interface Props {
  initialJobs: Job[];
  initialCursor: string | null;
  distanceMode?: DistanceMode | null;
  /** URL prefix for job card links. Defaults to "/posts" (public route). */
  jobHrefBase?: string;
}

/**
 * Infinite-scroll job list renderer.
 *
 * Consumes initial SSR-rendered jobs + cursor, then uses an
 * IntersectionObserver sentinel to append subsequent pages via the
 * loadMoreJobs Server Action.
 *
 * When `distanceMode` is provided, load-more calls go to getJobsByDistance
 * (PostGIS distance sort). Otherwise they hit getJobsPaginated (time sort).
 *
 * Observer cleanup runs on unmount + cursor change (Research Finding #25)
 * so rapid distance-mode toggles don't leak listeners.
 */
export function JobListInfinite({
  initialJobs,
  initialCursor,
  distanceMode = null,
  jobHrefBase = "/posts",
}: Props) {
  const distanceKey = distanceMode
    ? `${distanceMode.userLat}:${distanceMode.userLng}:${distanceMode.radiusM}`
    : "time";
  const resetKey = [
    jobHrefBase,
    initialCursor ?? "end",
    distanceKey,
    initialJobs.map((job) => job.id).join(","),
  ].join("|");

  return (
    <JobListInfiniteInner
      key={resetKey}
      initialJobs={initialJobs}
      initialCursor={initialCursor}
      distanceMode={distanceMode}
      jobHrefBase={jobHrefBase}
    />
  );
}

function JobListInfiniteInner({
  initialJobs,
  initialCursor,
  distanceMode,
  jobHrefBase,
}: Required<Props>) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && cursor && !isPending) {
          startTransition(async () => {
            const result = await loadMoreJobs({
              cursor,
              distanceMode,
            });
            if (result.jobs.length > 0) {
              setJobs((prev) => [...prev, ...result.jobs]);
              setCursor(result.nextCursor);
            } else {
              setCursor(null);
            }
          });
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, distanceMode, isPending]);

  return (
    <div className="space-y-3">
      {jobs.length === 0 && (
        <p className="p-4 text-center text-sm text-muted-foreground">
          아직 공고가 없습니다.
        </p>
      )}

      {jobs.map((job) => (
        <Link
          key={job.id}
          href={`${jobHrefBase}/${job.id}`}
          className="block rounded-2xl border border-border bg-card p-4 transition hover:border-brand/40 hover:shadow-sm"
        >
          <div className="mb-1 flex items-start justify-between gap-2">
            <h2 className="line-clamp-1 text-base font-bold tracking-tight">
              {job.title}
            </h2>
            {job.isUrgent && (
              <span className="shrink-0 rounded-full bg-[color:var(--urgent)]/15 px-2 py-0.5 text-[10px] font-bold text-[color:var(--urgent)]">
                긴급
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {job.business.logo} {job.business.name}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>시급 {job.hourlyPay.toLocaleString()}원</span>
            <span>{job.workDate}</span>
            <span>
              {job.startTime}~{job.endTime}
            </span>
            <span>
              {job.filled}/{job.headcount}명
            </span>
            {job.distanceM > 0 && (
              <span>{(job.distanceM / 1000).toFixed(1)}km</span>
            )}
          </div>
        </Link>
      ))}

      {cursor && (
        <div
          ref={sentinelRef}
          className="flex h-12 items-center justify-center text-xs text-muted-foreground"
          aria-busy={isPending}
        >
          {isPending ? "불러오는 중..." : "스크롤해서 더 보기"}
        </div>
      )}
    </div>
  );
}
