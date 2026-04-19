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
  const BrandMark = (
    <span className="flex items-baseline gap-px text-[17px] font-extrabold tracking-[-0.035em] text-ink">
      샐러리잡
      <span className="ml-[3px] inline-block h-[5px] w-[5px] -translate-y-[1px] rounded-full bg-brand" />
      <span className="ml-2 rounded-full bg-ink px-2 py-[3px] text-[10px] font-extrabold tracking-wider text-white">
        Admin
      </span>
    </span>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border-soft bg-surface md:flex">
        <div className="flex h-16 items-center border-b border-border-soft px-5">
          {BrandMark}
        </div>

        <nav
          className="flex flex-1 flex-col gap-1 p-3"
          aria-label="관리자 메뉴"
        >
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-[44px] items-center gap-3 rounded-[14px] px-3 py-2 text-[14px] font-semibold text-muted-foreground transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border-soft p-3">
          <form action={logout}>
            <button
              type="submit"
              className="flex min-h-[44px] w-full items-center gap-3 rounded-[14px] px-3 py-2 text-[14px] font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              로그아웃
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex h-14 items-center justify-between border-b border-border-soft bg-surface px-4 md:hidden">
        {BrandMark}
        <nav className="flex items-center gap-1" aria-label="관리자 메뉴">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-[44px] items-center gap-1 rounded-[12px] px-2 text-[12px] font-semibold text-muted-foreground hover:bg-surface-2 hover:text-ink"
              aria-label={label}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
          <form action={logout}>
            <button
              type="submit"
              className="flex min-h-[44px] items-center gap-1 rounded-[12px] px-2 text-[12px] text-muted-foreground hover:text-destructive"
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
