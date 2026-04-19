"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  Clock,
  MessageCircle,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS: readonly { href: string; icon: typeof Home; label: string; isFab?: boolean }[] = [
  { href: "/home", icon: Home, label: "홈" },
  { href: "/explore", icon: Search, label: "탐색" },
  { href: "/my/availability", icon: Clock, label: "시간등록", isFab: true },
  { href: "/chat", icon: MessageCircle, label: "채팅" },
  { href: "/my", icon: User, label: "MY" },
];

// Routes that replace the bottom tab bar with their own focused action bar.
// Both the check-in flow and the apply-confirm flow are "focused conversion"
// experiences that render their own sticky CTA at the bottom.
const HIDE_TAB_BAR_PATTERNS: readonly RegExp[] = [
  /^\/my\/applications\/[^/]+\/check-in$/,
  /^\/posts\/[^/]+\/apply$/,
];

export function MobileTabBar() {
  const pathname = usePathname();

  if (HIDE_TAB_BAR_PATTERNS.some((re) => re.test(pathname))) {
    return null;
  }

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "border-t border-border-soft",
        "bg-[color-mix(in_oklch,var(--surface)_96%,transparent)]",
        "[backdrop-filter:saturate(1.6)_blur(16px)]",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <div
        className={cn(
          "mx-auto max-w-lg",
          "grid grid-cols-[1fr_1fr_78px_1fr_1fr] items-center gap-1",
          "px-3.5 pt-3 pb-7",
        )}
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/home"
              ? pathname === "/home" || pathname === "/"
              : pathname.startsWith(item.href);

          if (item.isFab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={cn(
                  "mx-auto -mt-5 flex h-[58px] w-[58px] flex-col items-center justify-center gap-0.5",
                  "rounded-[20px] bg-brand text-ink",
                  "shadow-[0_10px_24px_-4px_color-mix(in_oklch,var(--brand)_50%,transparent),0_0_0_4px_var(--surface)]",
                  "transition-transform hover:-translate-y-0.5 active:scale-95",
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-extrabold tracking-tight">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-1.5",
                "text-[10.5px] font-bold tracking-tight transition-colors",
                isActive ? "text-ink" : "text-text-subtle hover:text-ink",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
