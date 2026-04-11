import { redirect, notFound } from "next/navigation";
import { requireJobOwner } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { getReviewByApplication } from "@/lib/db/queries";
import { createBusinessReview } from "./actions";
import { ReviewForm } from "@/components/shared/review-form";
import { BIZ_TO_WORKER_TAGS } from "@/lib/constants/review-tags";

export default async function BizReviewPage({
  params,
}: {
  params: Promise<{ id: string; applicantId: string }>;
}) {
  const { id, applicantId } = await params;
  await requireJobOwner(id);

  const application = await prisma.application.findUnique({
    where: { id: applicantId },
    select: {
      id: true,
      jobId: true,
      status: true,
      worker: { include: { workerProfile: true } },
    },
  });

  if (!application || application.jobId !== id) notFound();

  if (application.status !== "settled") {
    redirect(`/biz/posts/${id}/applicants?error=not_settled`);
  }

  const existing = await getReviewByApplication(applicantId, "business_to_worker");
  if (existing) {
    redirect(`/biz/posts/${id}/applicants?message=already_reviewed`);
  }

  const workerName =
    application.worker.workerProfile?.nickname ??
    application.worker.workerProfile?.name ??
    "근무자";

  return (
    <main className="mx-auto max-w-lg p-4 pb-24">
      <h1 className="mb-1 text-xl font-bold">{workerName} 님 리뷰 작성</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        수고하셨습니다. 근무 후기를 남겨주세요.
      </p>
      <ReviewForm
        applicationId={applicantId}
        direction="business_to_worker"
        tagSet={BIZ_TO_WORKER_TAGS}
        redirectOnSuccess={`/biz/posts/${id}/applicants`}
        submitAction={createBusinessReview}
      />
    </main>
  );
}
