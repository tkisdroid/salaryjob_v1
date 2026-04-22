import { notFound, redirect } from "next/navigation";
import { getJobById } from "@/lib/db/queries";
import { requireWorker } from "@/lib/dal";
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

  // Duplicate applies are already guarded by applyOneTap().
  // Keep rendering the /apply route even for existing applicants so:
  // 1) login?next=/posts/:id/apply can recover to the originally requested page
  // 2) users are not bounced to /my/applications before seeing the intended flow
  // 3) the client can surface the already_applied state in-context on submit
  void session;

  return <ApplyConfirmFlow job={job} />;
}
