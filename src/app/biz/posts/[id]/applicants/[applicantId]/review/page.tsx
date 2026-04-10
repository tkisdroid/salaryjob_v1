import { notFound } from "next/navigation";
import { getBizApplicantById } from "@/lib/db/queries";
import { ReviewForm } from "@/components/shared/review-form";

interface Props {
  params: Promise<{ id: string; applicantId: string }>;
}

export default async function BizReviewPage({ params }: Props) {
  const { id, applicantId } = await params;
  const applicant = await getBizApplicantById(id, applicantId);
  if (!applicant) notFound();

  const backHref = `/biz/posts/${id}/applicants`;

  return (
    <ReviewForm
      direction="business-to-worker"
      subject={{
        id: applicant.id,
        name: applicant.workerName,
        avatar: applicant.workerInitial,
        subtitle: `⭐ ${applicant.rating} · 근무 ${applicant.completedJobs}회 · 완료율 ${applicant.completionRate}%`,
      }}
      jobTitle={applicant.postTitle}
      backHref={backHref}
      doneHref={backHref}
    />
  );
}
