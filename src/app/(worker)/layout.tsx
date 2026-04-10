import { MobileTabBar } from "@/components/shared/mobile-tab-bar";
import { requireWorker } from "@/lib/dal";

export default async function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Second-layer role check (proxy does first-layer optimistic check via src/proxy.ts).
  // NOTE: Phase 2 second-layer check. Phase 3+ must add DAL calls in individual page
  // components for full defense-in-depth per Pitfall #7 (layouts don't re-run on client nav).
  await requireWorker();

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <MobileTabBar />
    </div>
  );
}
