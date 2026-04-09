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

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
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
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-brand text-white shadow-lg shadow-brand/30 active:scale-95 transition-transform">
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] mt-0.5 font-medium text-brand">
                  {item.label}
                </span>
              </Link>
            );
          }

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
