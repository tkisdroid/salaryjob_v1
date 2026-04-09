import { MobileTabBar } from "@/components/shared/mobile-tab-bar";

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <MobileTabBar />
    </div>
  );
}
