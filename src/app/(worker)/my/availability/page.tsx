import { loadAvailability } from "./actions";
import { AvailabilityEditor } from "./availability-editor";

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
  return <AvailabilityEditor initialSlots={initialSlots} />;
}
