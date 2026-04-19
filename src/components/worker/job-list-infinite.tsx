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
    <div className="space-y-2.5">
      {jobs.length === 0 && (
        <p className="p-6 text-center text-[13px] font-semibold text-muted-foreground">
          아직 공고가 없습니다.
        </p>
      )}

      {jobs.map((job) => (
        <Link
          key={job.id}
          href={`${jobHrefBase}/${job.id}`}
          className="relative block rounded-[22px] border border-border bg-surface p-[18px] transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-soft-md"
        >
          {job.isUrgent && (
            <span className="absolute top-[14px] right-[14px] inline-flex items-center gap-1 rounded-full bg-lime-chip px-[9px] py-[4px] text-[10.5px] font-extrabold tracking-tight text-lime-chip-fg">
              급구
            </span>
          )}
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-border-soft bg-surface-2 text-xl">
              {job.business.logo}
            </div>
            <div className="min-w-0 flex-1 pr-14">
              <p className="truncate text-[11px] font-bold tracking-tight text-muted-foreground">
                {job.business.name}
              </p>
              <h2 className="mt-0.5 line-clamp-1 text-[15.5px] font-extrabold tracking-[-0.03em] text-ink">
                {job.title}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2.5 text-[11.5px] font-semibold text-muted-foreground">
                <span className="tabnum inline-flex items-center gap-1">
                  {job.workDate} {job.startTime}~{job.endTime}
                </span>
                {job.distanceM > 0 && (
                  <span className="tabnum inline-flex items-center gap-1">
                    {(job.distanceM / 1000).toFixed(1)}km
                  </span>
                )}
                <span className="tabnum inline-flex items-center gap-1">
                  {job.filled}/{job.headcount}명
                </span>
              </div>
            </div>
          </div>
          <div className="mt-[14px] flex items-center justify-between border-t border-dashed border-border pt-3">
            <span className="text-[12px] font-bold text-muted-foreground">
              시급
            </span>
            <span className="tabnum text-[17px] font-extrabold tracking-[-0.03em] text-brand-deep">
              {job.hourlyPay.toLocaleString()}원
            </span>
          </div>
        </Link>
      ))}

      {cursor && (
        <div
          ref={sentinelRef}
          className="flex h-12 items-center justify-center text-[12px] font-semibold text-muted-foreground"
          aria-busy={isPending}
        >
          {isPending ? "불러오는 중..." : "스크롤해서 더 보기"}
        </div>
      )}
    </div>
  );
}
