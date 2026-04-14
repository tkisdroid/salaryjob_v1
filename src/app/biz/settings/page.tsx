import Link from "next/link";
import {
  Bell,
  Building2,
  ChevronRight,
  CreditCard,
  Headphones,
  LogOut,
  Percent,
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
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">설정</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          사업장 정보와 서비스 설정을 관리합니다.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {SETTINGS_MENU.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-accent/50 active:bg-accent group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand shrink-0 transition-transform group-hover:scale-105">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          );
        })}
      </div>

      {/* Logout */}
      <div className="mt-4">
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 transition-colors hover:bg-destructive/5 active:bg-destructive/10 group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive shrink-0">
              <LogOut className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-destructive">로그아웃</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">현재 계정 세션을 종료합니다.</p>
            </div>
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center space-y-2">
        <p className="text-[11px] text-muted-foreground">샐러리잡 for Business v1.0.0</p>
        <div className="flex justify-center gap-3 text-[10px] text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground transition-colors">이용약관</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors">개인정보처리방침</Link>
          <span>·</span>
          <Link href="/licenses" className="hover:text-foreground transition-colors">오픈소스 라이선스</Link>
        </div>
      </div>
    </div>
  );
}
