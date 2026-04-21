import { prisma } from "@/lib/db";
import { requireBusiness } from "@/lib/dal";
import { categoryLabel } from "@/lib/job-utils";
import { summarizeAvailabilitySlots } from "@/lib/availability-slots";
import { BizWorkersClient, type BizWorkerCard } from "./workers-client";
import type { JobCategory } from "@/lib/types/job";

export const dynamic = "force-dynamic";

export default async function BizWorkersPage() {
  const session = await requireBusiness();

  const businessJobs = await prisma.job.findMany({
    where: { authorId: session.id },
    select: { category: true },
    distinct: ["category"],
  });
  const businessCategories = businessJobs.map((j) => j.category);

  const [profiles, favorites] = await Promise.all([
    prisma.workerProfile.findMany({
      where:
        businessCategories.length > 0
          ? { preferredCategories: { hasSome: businessCategories } }
          : {},
      include: { user: { select: { id: true, email: true } } },
      orderBy: [{ rating: "desc" }, { totalJobs: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.favoriteWorker.findMany({
      where: { businessUserId: session.id },
      select: { workerId: true },
    }),
  ]);

  const favoriteSet = new Set(favorites.map((favorite) => favorite.workerId));
  const workers: BizWorkerCard[] = profiles.map((profile) => ({
    id: profile.userId,
    name: profile.name,
    rating: Number(profile.rating),
    completedJobs: profile.totalJobs,
    completionRate: profile.completionRate,
    skills: (profile.preferredCategories as JobCategory[]).map(categoryLabel),
    location: "지역 미등록",
    availability: summarizeAvailabilitySlots(profile.availabilitySlots, 3),
    isFavorite: favoriteSet.has(profile.userId),
  }));

  return <BizWorkersClient workers={workers} />;
}
