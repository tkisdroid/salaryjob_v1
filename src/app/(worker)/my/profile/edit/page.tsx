import { requireWorker } from "@/lib/dal";
import { getWorkerProfileByUserId } from "@/lib/db/queries";
import { WorkerProfileEditForm } from "./worker-profile-edit-form";

type JobCategoryLiteral =
  | "food"
  | "retail"
  | "logistics"
  | "office"
  | "event"
  | "cleaning"
  | "education"
  | "tech";

export default async function WorkerProfileEditPage() {
  const session = await requireWorker();
  const profile = await getWorkerProfileByUserId(session.id);

  // If Phase 2 signup created only a User row (no WorkerProfile), pass a
  // synthesized "empty" profile so the form can render.
  const initialProfile = profile ?? {
    id: "",
    userId: session.id,
    name: "",
    nickname: null,
    avatar: null,
    bio: null,
    preferredCategories: [] as JobCategoryLiteral[],
    badgeLevel: "newbie" as const,
    rating: 0,
    totalJobs: 0,
    completionRate: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return (
    <main className="mx-auto max-w-md p-4 pb-24">
      <h1 className="mb-4 text-2xl font-bold">프로필 편집</h1>
      <WorkerProfileEditForm
        initialName={initialProfile.name}
        initialNickname={initialProfile.nickname ?? ""}
        initialBio={initialProfile.bio ?? ""}
        initialAvatar={initialProfile.avatar ?? null}
        initialPreferredCategories={
          initialProfile.preferredCategories as string[]
        }
        badgeLevel={initialProfile.badgeLevel}
        rating={Number(initialProfile.rating)}
        totalJobs={initialProfile.totalJobs}
        completionRate={initialProfile.completionRate}
      />
    </main>
  );
}
