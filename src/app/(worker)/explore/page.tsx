import { getJobsPaginated } from "@/lib/db/queries";
import { ExploreClient } from "./explore-client";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const { jobs } = await getJobsPaginated({ limit: 20 });

  return <ExploreClient jobs={jobs} />;
}
