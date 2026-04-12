import { getJobsPaginated } from "@/lib/db/queries";
import { ExploreClient, type ExploreJob } from "./explore-client";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const { jobs } = await getJobsPaginated({ limit: 20 });

  const serialized: ExploreJob[] = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    businessName: job.business.name,
    category: job.category,
    hourlyPay: job.hourlyPay,
    tags: job.tags,
    address: job.business.address,
  }));

  return <ExploreClient jobs={serialized} />;
}
