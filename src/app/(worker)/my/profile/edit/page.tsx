import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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
    birthDate: null,
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
    <main className="mx-auto max-w-md px-4 pt-5 pb-28">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/my"
          aria-label="뒤로"
          className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-surface-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-[22px] font-extrabold tracking-[-0.035em] text-ink">
          프로필 편집
        </h1>
      </div>
      <WorkerProfileEditForm
        initialName={initialProfile.name}
        initialNickname={initialProfile.nickname ?? ""}
        initialBirthDate={
          initialProfile.birthDate
            ? new Date(initialProfile.birthDate).toISOString().slice(0, 10)
            : ""
        }
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
