import { BizSidebar, BizMobileNav } from "@/components/shared/biz-sidebar";

export default function BizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <BizSidebar />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <BizMobileNav />
    </div>
  );
}
