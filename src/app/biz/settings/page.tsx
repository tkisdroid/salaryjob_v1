import Link from "next/link"
import {
  Building2,
  Bell,
  CreditCard,
  Percent,
  Headphones,
  LogOut,
  ChevronRight,
  Shield,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

/* ── Menu Items ── */

const SETTINGS_MENU = [
  {
    icon: Building2,
    label: "업체 프로필 수정",
    description: "상호명, 주소, 연락처, 소개 등을 수정하세요",
    href: "/biz/profile",
  },
  {
    icon: Bell,
    label: "알림 설정",
    description: "푸시 알림, 이메일, SMS 알림을 관리하세요",
    href: "/biz/settings/notifications",
  },
  {
    icon: CreditCard,
    label: "결제 수단 관리",
    description: "정산 계좌 및 결제 카드를 등록하세요",
    href: "/biz/settings/payment",
  },
  {
    icon: Percent,
    label: "수수료 안내",
    description: "수수료 정책 및 현재 프로모션을 확인하세요",
    href: "/biz/settings/commission",
  },
  {
    icon: Shield,
    label: "사업자 인증 관리",
    description: "사업자등록증 인증 상태를 확인하세요",
    href: "/biz/verify",
  },
  {
    icon: Headphones,
    label: "고객센터",
    description: "문의사항이 있으시면 연락해주세요",
    href: "/biz/settings/support",
  },
] as const

/* ── Page ── */

export default function BizSettingsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          업체 정보와 서비스 설정을 관리하세요.
        </p>
      </div>

      {/* Menu List */}
      <Card>
        <CardContent className="divide-y divide-border">
          {SETTINGS_MENU.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-4 py-4 -mx-4 px-4 hover:bg-muted/30 rounded-lg transition-colors first:pt-2 last:pb-2"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal/10 flex-shrink-0">
                  <Icon className="w-5 h-5 text-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Link>
            )
          })}
        </CardContent>
      </Card>

      {/* Logout */}
      <Card className="mt-4">
        <CardContent>
          <button className="flex items-center gap-4 w-full py-2 text-left hover:opacity-70 transition-opacity">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-destructive/10 flex-shrink-0">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-semibold text-destructive">
                로그아웃
              </p>
              <p className="text-xs text-muted-foreground">
                계정에서 로그아웃합니다
              </p>
            </div>
          </button>
        </CardContent>
      </Card>

      {/* App Info */}
      <div className="mt-8 text-center">
        <p className="text-xs text-muted-foreground">
          GigNow for Business v1.0.0
        </p>
        <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground transition-colors">
            이용약관
          </Link>
          <span>·</span>
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            개인정보처리방침
          </Link>
          <span>·</span>
          <Link
            href="/licenses"
            className="hover:text-foreground transition-colors"
          >
            오픈소스 라이선스
          </Link>
        </div>
      </div>
    </div>
  )
}
