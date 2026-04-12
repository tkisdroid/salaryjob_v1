import { ArrowLeft } from "lucide-react";
import { loadAvailability } from "./actions";
import { AvailabilityEditor } from "./availability-editor";
import { BackButton } from "@/components/shared/back-button";

/**
 * /my/availability — weekly availability editor.
 *
 * Server Component wrapper that loads the signed-in worker's persisted slot
 * selection and hands it to the client-side editor. Previously this page
 * was purely client-side with a hardcoded INITIAL_SLOTS mock, so any
 * selection was lost on reload and never reached the DB. The editor now
 * calls the saveAvailability server action on demand and the page is
 * revalidated after a successful write.
 */
export default async function AvailabilityPage() {
  const initialSlots = await loadAvailability();
  return (
    <div className="mx-auto max-w-lg">
      <div className="flex items-center gap-2 px-4 pt-4">
        <BackButton fallbackHref="/my" ariaLabel="뒤로" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </BackButton>
        <h1 className="text-lg font-bold">시간 등록</h1>
      </div>
      <AvailabilityEditor initialSlots={initialSlots} />
    </div>
  );
}
