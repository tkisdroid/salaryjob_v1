import { notFound } from "next/navigation";
import { getApplicationById } from "@/lib/db/queries";
import { ReviewForm } from "@/components/shared/review-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WorkerReviewPage({ params }: Props) {
  const { id } = await params;
  const app = await getApplicationById(id);
  if (!app) notFound();

  const { job } = app;

  return (
    <ReviewForm
      direction="worker-to-business"
      subject={{
        id: job.business.id,
        name: job.business.name,
        avatar: job.business.logo,
        subtitle: `⭐ ${job.business.rating} · 리뷰 ${job.business.reviewCount} · 완료율 ${job.business.completionRate}%`,
      }}
      jobTitle={job.title}
      backHref="/my"
      doneHref="/my"
    />
  );
}
