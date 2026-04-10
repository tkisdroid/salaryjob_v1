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
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset list when caller swaps initialJobs (e.g., category filter change).
  useEffect(() => {
    setJobs(initialJobs);
    setCursor(initialCursor);
  }, [initialJobs, initialCursor]);

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
  }, [cursor, isPending, distanceMode]);

  return (
    <div className="space-y-3">
      {jobs.length === 0 && (
        <p className="p-4 text-center text-sm text-gray-500">
          아직 공고가 없습니다.
        </p>
      )}

      {jobs.map((j) => (
        <Link
          key={j.id}
          href={`${jobHrefBase}/${j.id}`}
          className="block rounded-lg border p-4 transition hover:shadow"
        >
          <div className="mb-1 flex items-start justify-between">
            <h2 className="text-base font-semibold">{j.title}</h2>
            {j.isUrgent && (
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                긴급
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {j.business.logo} {j.business.name}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
            <span>시급 {j.hourlyPay.toLocaleString()}원</span>
            <span>{j.workDate}</span>
            <span>
              {j.startTime}~{j.endTime}
            </span>
            <span>
              {j.filled}/{j.headcount}명
            </span>
            {j.distanceM > 0 && (
              <span>{(j.distanceM / 1000).toFixed(1)}km</span>
            )}
          </div>
        </Link>
      ))}

      {cursor && (
        <div
          ref={sentinelRef}
          className="flex h-12 items-center justify-center text-sm text-gray-400"
          aria-busy={isPending}
        >
          {isPending ? "불러오는 중..." : "스크롤해서 더 보기"}
        </div>
      )}
    </div>
  );
}
