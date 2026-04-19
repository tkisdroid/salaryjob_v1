import Link from "next/link";
import {
  ChevronLeft,
  CalendarDays,
  ChevronRight,
  Clock3,
  Heart,
  LogOut,
  Settings,
  UserRound,
  Wallet,
} from "lucide-react";
import { logout } from "@/app/(auth)/login/actions";

const SETTINGS_LINKS = [
  {
    href: "/my/profile/edit",
    label: "프로필 수정",
    description: "이름, 소개, 선호 업무를 관리합니다.",
    icon: UserRound,
  },
  {
    href: "/my/availability",
    label: "가능 시간",
    description: "드래그로 근무 가능 시간을 저장합니다.",
    icon: Clock3,
  },
  {
    href: "/my/schedule",
    label: "추천 일정",
    description: "AI 추천 일정과 맞춤 공고를 확인합니다.",
    icon: CalendarDays,
  },
  {
    href: "/my/favorites",
    label: "찜한 공고",
    description: "저장해 둔 공고를 다시 확인합니다.",
    icon: Heart,
  },
  {
    href: "/my/settlements",
    label: "정산 내역",
    description: "완료된 근무의 수익과 정산 상태를 봅니다.",
    icon: Wallet,
  },
] as const;

export default function MySettingsPage() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-5 pb-6">
      <div className="flex items-center gap-2 pb-1">
        <Link
          href="/my"
          aria-label="뒤로"
          className="-ml-1 grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-surface-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-[-0.035em] text-ink">
          <Settings className="h-[20px] w-[20px] text-brand-deep" />
          설정
        </h1>
      </div>
      <p className="mt-1 text-[12.5px] font-medium tracking-tight text-muted-foreground">
        자주 쓰는 계정 설정과 개인 메뉴를 한곳에서 관리합니다.
      </p>

      <div className="mt-5 overflow-hidden rounded-[22px] border border-border-soft bg-surface">
        {SETTINGS_LINKS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-2 ${
                idx > 0 ? "border-t border-border-soft" : ""
              }`}
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-extrabold tracking-tight text-ink">
                  {item.label}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[11.5px] font-medium text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-text-subtle" />
            </Link>
          );
        })}
      </div>

      <div className="mt-4 rounded-[22px] border border-border-soft bg-surface">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface-2"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-destructive/10 text-destructive">
              <LogOut className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-extrabold tracking-tight text-destructive">
                로그아웃
              </p>
              <p className="mt-0.5 text-[11.5px] font-medium text-muted-foreground">
                현재 로그인 세션을 종료합니다.
              </p>
            </div>
          </button>
        </form>
      </div>
    </div>
  );
}
