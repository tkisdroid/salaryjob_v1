"use server";

import { getJobsPaginated, getJobsByDistance } from "@/lib/db/queries";
import type { Job } from "@/lib/types/job";

interface LoadMoreParams {
  cursor: string;
  limit?: number;
  distanceMode?: {
    userLat: number;
    userLng: number;
    radiusM: number;
  } | null;
}

/**
 * Server Action for JobListInfinite's IntersectionObserver load-more.
 *
 * Dispatches to getJobsByDistance when the client passed distanceMode
 * (geolocation granted + on /home), otherwise getJobsPaginated (landing
 * page + /home without geolocation).
 *
 * Both paths apply the LAZY_FILTER_SQL internally — a past-dated job cannot
 * leak through either branch.
 *
 * Public surface: anyone can call this (no session gate) because the
 * underlying data is public (active, future-dated jobs). See T-03-06-01.
 */
export async function loadMoreJobs(
  params: LoadMoreParams,
): Promise<{ jobs: Job[]; nextCursor: string | null }> {
  const limit = params.limit ?? 10;

  if (params.distanceMode) {
    return getJobsByDistance({
      userLat: params.distanceMode.userLat,
      userLng: params.distanceMode.userLng,
      radiusM: params.distanceMode.radiusM,
      limit,
      cursor: params.cursor,
    });
  }

  return getJobsPaginated({ limit, cursor: params.cursor });
}
