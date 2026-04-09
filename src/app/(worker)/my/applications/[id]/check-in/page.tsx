import { notFound } from "next/navigation";
import { MOCK_APPLICATIONS } from "@/lib/mock-data";
import { CheckInFlow } from "./check-in-flow";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CheckInPage({ params }: Props) {
  const { id } = await params;
  const app = MOCK_APPLICATIONS.find((a) => a.id === id);
  if (!app) notFound();

  return <CheckInFlow application={app} />;
}
