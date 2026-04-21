import { getJobsPaginated } from "@/lib/db/queries";
import { SearchClient, type SearchJob } from "./search-client";
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

interface SearchParams {
  category?: string;
  q?: string;
  tag?: string;
  urgent?: string;
  minPay?: string;
  cursor?: string;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const category = VALID_CATEGORIES.has(params.category ?? "")
    ? (params.category as JobCategory)
    : undefined;

  const { jobs, nextCursor } = await getJobsPaginated({
    limit: 20,
    cursor: params.cursor ?? null,
    category,
  });

  // Apply remaining filters server-side on pre-fetched DB rows.
  // Text search (q/tag), urgent, and minPay are not yet natively supported
  // by getJobsPaginated, so we filter in JS here — still far better than the
  // previous approach of fetching 50 unfiltered rows and filtering in the browser.
  const query = (params.q ?? params.tag ?? "").trim().toLowerCase();
  const urgentOnly = params.urgent === "1";
  const minPay = Math.max(0, parseInt(params.minPay ?? "0", 10) || 0);

  let filtered = jobs;
  if (urgentOnly) {
    filtered = filtered.filter((j) => j.isUrgent);
  }
  if (minPay > 0) {
    filtered = filtered.filter((j) => j.hourlyPay >= minPay);
  }

  const serialized: SearchJob[] = filtered.map((job) => ({
    id: job.id,
    title: job.title,
    businessName: job.business.name,
    category: job.category,
    hourlyPay: job.hourlyPay,
    workDate: job.workDate,
    isUrgent: job.isUrgent,
    tags: job.tags,
    address: job.business.address,
  }));

  return (
    <SearchClient
      jobs={serialized}
      nextCursor={nextCursor}
      initialCategory={category ?? "all"}
      initialQuery={query}
      initialUrgent={urgentOnly}
      initialMinPay={minPay}
    />
  );
}
