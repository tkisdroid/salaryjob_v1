import Link from "next/link";
import {
  User,
  Clock,
  FileText,
  Wallet,
  Star,
  Heart,
  Settings,
  ChevronRight,
  Shield,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const PROFILE = {
  name: "김기현",
  initials: "기현",
  badgeLevel: "실버",
  completeness: 65,
};

const MENU_ITEMS = [
  {
    href: "/my/profile",
    icon: User,
    label: "내 프로필",
    count: null,
    description: "기본 정보, 자기소개",
  },
  {
    href: "/my/availability",
    icon: Clock,
    label: "가용시간",
    count: null,
    description: "시간 등록 및 관리",
  },
  {
    href: "/my/applications",
    icon: FileText,
    label: "지원 내역",
    count: 3,
    description: "진행중 3건",
  },
  {
    href: "/my/settlement",
    icon: Wallet,
    label: "정산",
    count: null,
    description: "정산 내역 확인",
  },
  {
    href: "/my/reviews",
    icon: Star,
    label: "리뷰",
    count: 7,
    description: "받은 리뷰 7건",
  },
  {
    href: "/my/favorites",
    icon: Heart,
    label: "찜 목록",
    count: 5,
    description: "저장한 공고",
  },
  {
    href: "/my/settings",
    icon: Settings,
    label: "설정",
    count: null,
    description: "알림, 계정 설정",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MyPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight">MY</h1>
      </header>

      {/* Profile Card */}
      <Card>
        <CardContent className="flex items-center gap-4">
          <Avatar size="lg" className="w-16 h-16">
            <AvatarFallback className="text-lg font-semibold bg-brand-light text-brand">
              {PROFILE.initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold truncate">{PROFILE.name}</h2>
              <Badge variant="secondary" className="shrink-0">
                <Shield className="w-3 h-3" />
                {PROFILE.badgeLevel}
              </Badge>
            </div>

            {/* Profile completeness */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">프로필 완성도</span>
                <span className="font-medium text-brand">
                  {PROFILE.completeness}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${PROFILE.completeness}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 gap-2">
        {MENU_ITEMS.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card
              size="sm"
              className="hover:ring-brand/30 transition-shadow"
            >
              <CardContent className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted shrink-0">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{item.label}</span>
                    {item.count !== null && (
                      <Badge variant="secondary" className="text-[10px]">
                        {item.count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Separator />

      {/* App info */}
      <div className="text-center text-xs text-muted-foreground space-y-1 pb-4">
        <p>GigNow v0.1.0</p>
        <p>고객센터 | 이용약관 | 개인정보처리방침</p>
      </div>
    </div>
  );
}
