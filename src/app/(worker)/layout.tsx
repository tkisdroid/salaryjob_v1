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
      {/* MobileTabBar actual inner content is ~6.25rem (100px): pt-3 + ~58px FAB row + pb-7. */}
      {/* Plus env(safe-area-inset-bottom) outer padding on iOS (~34px). */}
      {/* pb-24 (96px) was undersized and left content peeking under the tab bar on mobile. */}
      <main className="flex-1 pb-[calc(6.25rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <MobileTabBar />
    </div>
  );
}
