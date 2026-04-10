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
      {/* pb-24 (= 96px) covers MobileTabBar h-16 (64px) + safe-area-inset-bottom (~34px on iOS). */}
      {/* Previously used `md:pb-0` which removed desktop padding while MobileTabBar was still */}
      {/* visible, causing content at the bottom to be hidden behind the bar on desktop — */}
      {/* observed as "/home 스크롤이 끝까지 안 내려감". */}
      <main className="flex-1 pb-24">{children}</main>
      <MobileTabBar />
    </div>
  );
}
