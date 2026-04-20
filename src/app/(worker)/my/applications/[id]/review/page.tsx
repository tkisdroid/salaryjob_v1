import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Star } from "lucide-react";
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
    <main className="mx-auto max-w-lg px-4 pt-5 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={`/my/applications/${id}`}
          aria-label="뒤로"
          className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-surface-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.035em] text-ink">
          <Star className="h-[20px] w-[20px] fill-[#fbbf24] text-[#fbbf24]" />
          사업장 리뷰 작성
        </h1>
      </div>
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
