"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { logout } from "@/app/(auth)/login/actions";
import { CeleryMark } from "@/components/brand/celery-mark";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  mobileLabel: string;
};

type NavSection = {
  label?: string;
  items: readonly NavItem[];
};

/**
 * Biz sidebar is grouped into two sections:
 *   1. 업무 (unlabeled, default) — daily workflows the user came here to do
 *   2. 환경 — settings, drops visually so 설정 doesn't compete with work
 *
 * Keep 채팅 and 정산 in the work group: they're part of post-hire follow-up,
 * not "account" concerns. 설정 is the only ambient utility and gets its own
 * quiet group at the bottom of the nav.
 */
const NAV_SECTIONS: readonly NavSection[] = [
  {
    items: [
      { href: "/biz", icon: LayoutDashboard, label: "대시보드", mobileLabel: "홈" },
      { href: "/biz/posts", icon: FileText, label: "공고 관리", mobileLabel: "공고" },
      { href: "/biz/workers", icon: Users, label: "인재 탐색", mobileLabel: "인재" },
      { href: "/biz/chat", icon: MessageCircle, label: "채팅", mobileLabel: "채팅" },
      { href: "/biz/settlements", icon: Wallet, label: "정산", mobileLabel: "정산" },
    ],
  },
  {
    label: "환경",
    items: [
      { href: "/biz/settings", icon: Settings, label: "설정", mobileLabel: "설정" },
    ],
  },
] as const;

// Mobile tab bar still wants a flat list in source order.
const MOBILE_NAV_ITEMS: readonly NavItem[] = NAV_SECTIONS.flatMap(
  (section) => section.items,
);

function isNavItemActive(href: string, pathname: string) {
  return href === "/biz" ? pathname === "/biz" : pathname.startsWith(href);
}

export function BizSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <CeleryMark className="h-9 w-9" />
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight">샐러리잡</p>
          <p className="text-[10px] text-muted-foreground">사업자 관리</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5">
        {NAV_SECTIONS.map((section, idx) => (
          <div key={section.label ?? `section-${idx}`} className={idx > 0 ? "mt-6" : undefined}>
            {section.label && (
              <p className="mb-2 px-3 text-[11px] font-bold text-muted-foreground">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = isNavItemActive(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-brand/10 font-bold text-brand-deep"
                        : "font-medium text-muted-foreground hover:bg-mint-bg hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-mint-bg hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}

export function BizMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
      <div className="mx-auto grid h-16 w-full grid-cols-6 items-stretch px-1">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = isNavItemActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-0.5 transition-colors",
                isActive
                  ? "text-brand-deep"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span
                className={cn(
                  "truncate text-[9px] leading-none",
                  isActive ? "font-bold" : "font-medium",
                )}
              >
                {item.mobileLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
