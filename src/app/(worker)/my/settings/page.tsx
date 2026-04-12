import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Heart,
  LogOut,
  Settings,
  UserRound,
  Wallet,
} from "lucide-react";
import { logout } from "@/app/(auth)/login/actions";
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="mx-auto max-w-lg px-4 py-6">
      <Link
        href="/my"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        MY로 돌아가기
      </Link>

      <div className="mt-4 mb-5">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-brand" />
          <h1 className="text-2xl font-bold">설정</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          자주 쓰는 계정 설정과 개인 메뉴를 한곳에서 관리합니다.
        </p>
      </div>

      <Card>
        <CardContent className="divide-y divide-border">
          {SETTINGS_LINKS.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="mx-[-16px] flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/30 first:pt-2 last:pb-2"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10">
                  <Icon className="h-5 w-5 text-brand" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
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
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/10">
                <LogOut className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-semibold text-destructive">
                  로그아웃
                </p>
                <p className="text-xs text-muted-foreground">
                  현재 로그인 세션을 종료합니다.
                </p>
              </div>
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
