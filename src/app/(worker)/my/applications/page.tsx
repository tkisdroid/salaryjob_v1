import { ArrowLeft } from "lucide-react";
import { requireWorker } from "@/lib/dal";
import { getApplicationsByWorker } from "@/lib/db/queries";
import { ApplicationsClient } from "./applications-client";
import { BackButton } from "@/components/shared/back-button";

// Phase 4 Plan 04-08 — /my/applications Server Component
//
// Fetches all three buckets (upcoming / active / done) in parallel so
// client-side tab switching is instant. Replaces the Phase 1 inline
// APPLICATIONS constant and Tab-local mock filtering — the APPLICATIONS
// array and per-tab components have been removed.
//
// `searchParams.tab` allows deep linking to a specific bucket from
// notifications (e.g. push click → /my/applications?tab=active).

type TabValue = "upcoming" | "active" | "done";

interface SearchParamsShape {
  tab?: string;
}

function parseTab(raw: string | undefined): TabValue {
  if (raw === "active" || raw === "done") return raw;
  return "upcoming";
}

export default async function MyApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>;
}) {
  const params = await searchParams;
  const initialTab = parseTab(params.tab);
  const session = await requireWorker();

  const [upcoming, active, done] = await Promise.all([
    getApplicationsByWorker(session.id, { bucket: "upcoming" }),
    getApplicationsByWorker(session.id, { bucket: "active" }),
    getApplicationsByWorker(session.id, { bucket: "done" }),
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex items-center gap-2 px-4 pt-4">
        <BackButton fallbackHref="/my" ariaLabel="뒤로" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </BackButton>
        <h1 className="text-lg font-bold">지원 내역</h1>
      </div>
      <ApplicationsClient
        workerId={session.id}
        initialTab={initialTab}
        upcoming={JSON.parse(JSON.stringify(upcoming))}
        active={JSON.parse(JSON.stringify(active))}
        done={JSON.parse(JSON.stringify(done))}
      />
    </div>
  );
}
