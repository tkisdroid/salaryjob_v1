"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Wallet,
  MessageCircle,
  Settings,
  Building2,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/biz", icon: LayoutDashboard, label: "대시보드" },
  { href: "/biz/posts", icon: FileText, label: "공고 관리" },
  { href: "/biz/workers", icon: Users, label: "인재 검색" },
  { href: "/biz/settlements", icon: Wallet, label: "정산" },
  { href: "/biz/chat", icon: MessageCircle, label: "채팅" },
  { href: "/biz/settings", icon: Settings, label: "설정" },
] as const;

export function BizSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card h-screen sticky top-0">
      <div className="flex items-center gap-3 px-6 h-16 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold">GigNow</p>
          <p className="text-xs text-muted-foreground">업체 관리</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/biz"
              ? pathname === "/biz"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand/10 text-brand"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors">
          <LogOut className="w-5 h-5" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}

export function BizMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive =
            item.href === "/biz"
              ? pathname === "/biz"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-full gap-0.5 transition-colors",
                isActive
                  ? "text-brand"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
