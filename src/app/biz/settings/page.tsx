import Link from "next/link";
import {
  Bell,
  Building2,
  ChevronRight,
  CreditCard,
  Headphones,
  LogOut,
  Percent,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { logout } from "@/app/(auth)/login/actions";

const SETTINGS_MENU = [
  {
    icon: Building2,
    label: "사업장 프로필 수정",
    description: "상호명, 주소, 연락처, 소개 정보를 수정합니다.",
    href: "/biz/profile",
  },
  {
    icon: Bell,
    label: "알림 설정",
    description: "푸시, 이메일, 문자 알림 수신 방식을 확인합니다.",
    href: "/biz/settings/notifications",
  },
  {
    icon: CreditCard,
    label: "결제 수단 관리",
    description: "정산 계좌와 결제 수단 안내를 확인합니다.",
    href: "/biz/settings/payment",
  },
  {
    icon: Percent,
    label: "수수료 안내",
    description: "서비스 수수료와 적용 기준을 확인합니다.",
    href: "/biz/settings/commission",
  },
  {
    icon: ShieldCheck,
    label: "사업자 인증 관리",
    description: "사업자 등록증과 인증 상태를 확인합니다.",
    href: "/biz/verify",
  },
  {
    icon: Headphones,
    label: "고객센터",
    description: "문의 채널과 운영 시간을 확인합니다.",
    href: "/biz/settings/support",
  },
] as const;

export default function BizSettingsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-[24px] font-extrabold tracking-[-0.035em] text-ink">
          <Settings className="h-[22px] w-[22px] text-brand-deep" />
          설정
        </h1>
        <p className="mt-1 text-[12.5px] font-medium tracking-tight text-muted-foreground">
          사업장 정보와 서비스 설정을 관리합니다.
        </p>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-border-soft bg-surface">
        {SETTINGS_MENU.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2 ${
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
              <ChevronRight className="h-4 w-4 shrink-0 text-text-subtle" />
            </Link>
          );
        })}
      </div>

      {/* Logout */}
      <div className="mt-4 rounded-[22px] border border-border-soft bg-surface">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-destructive/10 text-destructive">
              <LogOut className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-extrabold tracking-tight text-destructive">
                로그아웃
              </p>
              <p className="mt-0.5 text-[11.5px] font-medium text-muted-foreground">
                현재 계정 세션을 종료합니다.
              </p>
            </div>
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="mt-8 space-y-2 text-center">
        <p className="text-[11px] font-semibold text-text-subtle">
          샐러리잡 for Business v1.0.0
        </p>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10.5px] font-medium text-muted-foreground">
          <Link
            href="/terms"
            className="transition-colors hover:text-ink"
          >
            이용약관
          </Link>
          <span className="text-text-subtle">·</span>
          <Link
            href="/privacy"
            className="transition-colors hover:text-ink"
          >
            개인정보처리방침
          </Link>
          <span className="text-text-subtle">·</span>
          <Link
            href="/licenses"
            className="transition-colors hover:text-ink"
          >
            오픈소스 라이선스
          </Link>
        </div>
      </div>
    </div>
  );
}
