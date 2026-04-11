import Link from "next/link";
import {
  Bell,
  Building2,
  ChevronRight,
  CreditCard,
  Headphones,
  LogOut,
  Percent,
  Shield,
} from "lucide-react";
import { logout } from "@/app/(auth)/login/actions";
import { Card, CardContent } from "@/components/ui/card";

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
    icon: Shield,
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
        <h1 className="text-2xl font-bold text-foreground">설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          사업장 정보와 서비스 설정을 관리합니다.
        </p>
      </div>

      <Card>
        <CardContent className="divide-y divide-border">
          {SETTINGS_MENU.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className="mx-[-16px] flex items-center gap-4 rounded-lg px-4 py-4 transition-colors hover:bg-muted/30 first:pt-2 last:pb-2"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10">
                  <Icon className="h-5 w-5 text-brand" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-4 py-2 text-left transition-opacity hover:opacity-70"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                <LogOut className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-semibold text-destructive">
                  로그아웃
                </p>
                <p className="text-xs text-muted-foreground">
                  현재 계정 세션을 종료합니다.
                </p>
              </div>
            </button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground">
          GigNow for Business v1.0.0
        </p>
        <div className="mt-2 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <Link href="/terms" className="transition-colors hover:text-foreground">
            이용약관
          </Link>
          <span>·</span>
          <Link
            href="/privacy"
            className="transition-colors hover:text-foreground"
          >
            개인정보처리방침
          </Link>
          <span>·</span>
          <Link
            href="/licenses"
            className="transition-colors hover:text-foreground"
          >
            오픈소스 라이선스
          </Link>
        </div>
      </div>
    </div>
  );
}
