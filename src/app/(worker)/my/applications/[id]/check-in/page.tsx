import { notFound } from "next/navigation";
import { getApplicationById } from "@/lib/db/queries";
import { CheckInFlow } from "./check-in-flow";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CheckInPage({ params }: Props) {
  const { id } = await params;
  const app = await getApplicationById(id);
  if (!app) notFound();

  return <CheckInFlow application={app} />;
}
