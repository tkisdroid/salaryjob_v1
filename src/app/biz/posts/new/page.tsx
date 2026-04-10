import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/dal";
import { getBusinessProfilesByUserId } from "@/lib/db/queries";
import { NewJobForm } from "./new-job-form";

export default async function BizPostNewPage() {
  const session = await requireBusiness();
  const profiles = await getBusinessProfilesByUserId(session.id);

  if (profiles.length === 0) {
    // User has no BusinessProfile yet — redirect them to create one first.
    redirect("/biz/profile");
  }

  return (
    <NewJobForm
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
