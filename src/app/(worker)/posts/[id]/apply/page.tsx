import { notFound, redirect } from "next/navigation";
import { getJobById } from "@/lib/db/queries";
import { requireWorker } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { ApplyConfirmFlow } from "./apply-confirm-flow";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ApplyPage({ params }: Props) {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job) notFound();

  // BUG-W03: Server-side guard — block apply page for full/inactive jobs
  if (job.filled >= job.headcount) {
    redirect(`/posts/${id}?error=full`);
  }

  const session = await requireWorker();

  // BUG-W03: Redirect if already applied
  const existingApp = await prisma.application.findUnique({
    where: { jobId_workerId: { jobId: id, workerId: session.id } },
    select: { id: true },
  });
  if (existingApp) {
    redirect(`/my/applications?tab=upcoming`);
  }

  return <ApplyConfirmFlow job={job} />;
}
