import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft, Star } from "lucide-react";
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
    <main className="mx-auto max-w-lg px-4 pt-5 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={`/biz/posts/${id}/applicants`}
          aria-label="뒤로"
          className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-surface-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.035em] text-ink">
          <Star className="h-[20px] w-[20px] fill-[#fbbf24] text-[#fbbf24]" />
          {workerName} 님 리뷰 작성
        </h1>
      </div>
      <p className="mb-6 px-0.5 text-[12.5px] font-medium tracking-tight text-muted-foreground">
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
