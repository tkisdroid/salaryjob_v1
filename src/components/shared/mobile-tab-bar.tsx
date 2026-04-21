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

const NAV_ITEMS: readonly {
  href: string;
  icon: typeof Home;
  label: string;
  isFab?: boolean;
}[] = [
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

// Paths owned by a FAB item. Broader tabs (e.g. MY at /my) must not claim
// active state when the user is on a FAB's path, otherwise two tabs light up.
const FAB_PATHS = NAV_ITEMS.filter((item) => item.isFab).map(
  (item) => item.href,
);

function computeActive(item: (typeof NAV_ITEMS)[number], pathname: string) {
  if (item.href === "/home") {
    return pathname === "/home" || pathname === "/";
  }
  if (item.isFab) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  if (!pathname.startsWith(item.href)) return false;
  return !FAB_PATHS.some(
    (fab) => fab !== item.href && pathname.startsWith(fab),
  );
}

export function MobileTabBar() {
  const pathname = usePathname();

  if (HIDE_TAB_BAR_PATTERNS.some((re) => re.test(pathname))) {
    return null;
  }

  return (
    <nav
      aria-label="주요 메뉴"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "border-t border-border-soft",
        "bg-[color-mix(in_oklch,var(--surface)_92%,transparent)]",
        "[backdrop-filter:saturate(1.6)_blur(18px)]",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <ul
        className={cn(
          "mx-auto grid max-w-lg grid-cols-5 items-center",
          "px-2 pt-2 pb-2",
        )}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = computeActive(item, pathname);

          if (item.isFab) {
            return (
              <li key={item.href} className="flex justify-center">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative -mt-6 grid h-14 w-14 place-items-center",
                    "rounded-full bg-brand text-ink ring-1 ring-brand/30",
                    "shadow-[0_10px_24px_-10px_color-mix(in_oklch,var(--brand)_70%,transparent)]",
                    "transition-all duration-200",
                    "hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-10px_color-mix(in_oklch,var(--brand)_80%,transparent)]",
                    "active:scale-95",
                    isActive && "ring-2 ring-ink/15",
                  )}
                >
                  <item.icon
                    className="h-6 w-6"
                    strokeWidth={isActive ? 2.6 : 2.3}
                  />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "mx-auto flex h-12 w-full max-w-[72px] flex-col items-center justify-center gap-[3px]",
                  "transition-colors",
                  isActive ? "text-ink" : "text-text-subtle hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-10 place-items-center rounded-full transition-colors",
                    isActive && "bg-surface-2",
                  )}
                >
                  <item.icon
                    className="h-[19px] w-[19px]"
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                </span>
                <span
                  className={cn(
                    "text-[10.5px] leading-none tracking-tight",
                    isActive ? "font-extrabold" : "font-semibold",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
