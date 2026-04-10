import { BizSidebar, BizMobileNav } from "@/components/shared/biz-sidebar";
import { requireBusiness } from "@/lib/dal";

export default async function BizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Second-layer role check (proxy does first-layer optimistic check via src/proxy.ts).
  // NOTE: Phase 2 second-layer check. Phase 3+ must add DAL calls in individual page
  // components for full defense-in-depth per Pitfall #7 (layouts don't re-run on client nav).
  await requireBusiness();

  return (
    <div className="flex min-h-screen">
      <BizSidebar />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <BizMobileNav />
    </div>
  );
}
