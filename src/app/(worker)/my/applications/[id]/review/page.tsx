import { redirect } from "next/navigation";
import { requireApplicationOwner } from "@/lib/dal";
import { getReviewByApplication } from "@/lib/db/queries";
import { createWorkerReview } from "./actions";
import { ReviewForm } from "@/components/shared/review-form";
import { WORKER_TO_BIZ_TAGS } from "@/lib/constants/review-tags";

export default async function WorkerReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { application } = await requireApplicationOwner(id);

  if (application.status !== "settled") {
    redirect(`/my/applications/${id}?error=not_settled`);
  }
  const existing = await getReviewByApplication(id, "worker_to_business");
  if (existing) {
    redirect(`/my/applications/${id}?message=already_reviewed`);
  }

  return (
    <main className="mx-auto max-w-lg p-4 pb-24">
      <h1 className="mb-6 text-xl font-bold">사업장 리뷰 작성</h1>
      <ReviewForm
        applicationId={id}
        direction="worker_to_business"
        tagSet={WORKER_TO_BIZ_TAGS}
        redirectOnSuccess={`/my/applications/${id}`}
        submitAction={createWorkerReview}
      />
    </main>
  );
}
