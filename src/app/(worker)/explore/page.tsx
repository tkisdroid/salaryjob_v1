import { getJobsPaginated } from "@/lib/db/queries";
import { ExploreClient } from "./explore-client";
import type { JobCategory } from "@/lib/types/job";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = new Set<string>([
  "food",
  "retail",
  "logistics",
  "office",
  "event",
  "cleaning",
  "education",
  "tech",
]);

interface ExploreParams {
  category?: string;
  q?: string;
  minPay?: string;
  cursor?: string;
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<ExploreParams>;
}) {
  const params = await searchParams;

  const category = VALID_CATEGORIES.has(params.category ?? "")
    ? (params.category as JobCategory)
    : undefined;

  const minPay = Math.max(0, parseInt(params.minPay ?? "0", 10) || 0);

  const { jobs, nextCursor } = await getJobsPaginated({
    limit: 20,
    cursor: params.cursor ?? null,
    category,
  });

  // Server-side minPay filter (getJobsPaginated doesn't support it natively yet)
  const filtered = minPay > 0 ? jobs.filter((j) => j.hourlyPay >= minPay) : jobs;

  return (
    <ExploreClient
      jobs={filtered}
      nextCursor={nextCursor}
      initialCategory={category ?? "all"}
      initialQuery={params.q ?? ""}
      initialMinPay={minPay}
    />
  );
}
