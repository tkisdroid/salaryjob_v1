/**
 * AdminSidebar — standalone nav component for the /admin route group.
 *
 * D-29: This is NOT a reuse of BizSidebar. Separate component with its own
 * structure, links, and styling tailored for admin backoffice.
 *
 * Desktop: fixed 240px left sidebar.
 * Mobile: full-width top bar (admin is desktop-first, but usable on mobile).
 */
import Link from "next/link";
import { logout } from "@/app/(auth)/login/actions";
import { LayoutDashboard, Building2, LogOut } from "lucide-react";

const NAV_LINKS = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/businesses", label: "사업장 관리", icon: Building2 },
] as const;

export default function AdminSidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
        {/* Brand */}
        <div className="flex h-16 items-center border-b border-border px-5">
          <span className="text-lg font-bold tracking-tight text-foreground">
            <span className="text-primary">GigNow</span>
            <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
              Admin
            </span>
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="관리자 메뉴">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-border p-3">
          <form action={logout}>
            <button
              type="submit"
              className="flex min-h-[44px] w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              로그아웃
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
        <span className="text-base font-bold">
          <span className="text-primary">GigNow</span>
          <span className="ml-1 rounded bg-primary/10 px-1 py-0.5 text-xs font-semibold text-primary">
            Admin
          </span>
        </span>
        <nav className="flex items-center gap-1" aria-label="관리자 메뉴">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-[44px] items-center gap-1 rounded-md px-2 text-xs text-foreground hover:text-primary"
              aria-label={label}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
          <form action={logout}>
            <button
              type="submit"
              className="flex min-h-[44px] items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:text-destructive"
              aria-label="로그아웃"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </nav>
      </header>
    </>
  );
}
