import { notFound } from "next/navigation";
import { getJobById } from "@/lib/db/queries";
import { ApplyConfirmFlow } from "./apply-confirm-flow";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ApplyPage({ params }: Props) {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job) notFound();

  return <ApplyConfirmFlow job={job} />;
}
