import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/dal";
import { getBusinessProfilesByUserId } from "@/lib/db/queries";
import { NewJobForm } from "./new-job-form";

interface Props {
  searchParams: Promise<{ urgent?: string | string[] }>;
}

export default async function BizPostNewPage({ searchParams }: Props) {
  const session = await requireBusiness();
  const profiles = await getBusinessProfilesByUserId(session.id);
  const params = await searchParams;
  const rawUrgent = Array.isArray(params.urgent) ? params.urgent[0] : params.urgent;

  if (profiles.length === 0) {
    // User has no BusinessProfile yet — redirect them to create one first.
    redirect("/biz/profile");
  }

  return (
    <NewJobForm
      initialUrgent={rawUrgent === "1"}
      businessProfiles={profiles.map((p) => ({
        id: p.id,
        name: p.name,
        lat: Number(p.lat),
        lng: Number(p.lng),
        address: p.address,
      }))}
    />
  );
}
