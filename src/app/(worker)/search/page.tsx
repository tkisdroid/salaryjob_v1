import { getJobsPaginated } from "@/lib/db/queries";
import { SearchClient, type SearchJob } from "./search-client";

export const dynamic = "force-dynamic";

/**
 * /search — server wrapper.
 *
 * Fetches real jobs from the DB so every card in the filter result links
 * to a real /posts/[id] detail page that actually exists and actually
 * supports the apply flow. The previous version used hardcoded ALL_POSTS
 * with ids like 's-1', 's-2' which 404'd on click.
 */
export default async function SearchPage() {
  const { jobs } = await getJobsPaginated({ limit: 50 });

  const serialized: SearchJob[] = jobs.map((job) => ({
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

  return <SearchClient jobs={serialized} />;
}
