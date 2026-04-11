import Link from "next/link";
import { getApplications, getCurrentWorker } from "@/lib/db/queries";
import { formatWorkDate } from "@/lib/job-utils";
import { formatMoney } from "@/lib/format";
import { logout } from "@/app/(auth)/login/actions";
import { PushPermissionBanner } from "@/components/worker/push-permission-banner";
import {
  Calendar,
  ChevronRight,
  Clock,
  Heart,
  History,
  LogOut,
  MapPin,
  QrCode,
  Settings,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

const BADGE_LABELS: Record<string, { label: string; color: string }> = {
  newbie: { label: "새내기", color: "bg-muted text-muted-foreground" },
  bronze: { label: "브론즈", color: "bg-brand-light text-brand-deep" },
  silver: { label: "실버", color: "bg-muted text-foreground" },
  gold: { label: "골드", color: "bg-brand text-white" },
  platinum: { label: "플래티넘", color: "bg-brand-deep text-white" },
  diamond: { label: "다이아", color: "bg-brand-deep text-white" },
};

const QUICK_LINKS = [
  { href: "/my/availability", label: "가능 시간", icon: Clock },
  { href: "/my/settlements", label: "정산 내역", icon: Wallet },
  { href: "/my/applications", label: "근무 이력", icon: History },
  { href: "/my/favorites", label: "찜 목록", icon: Heart },
] as const;

export default async function MyPage() {
  const [worker, applications] = await Promise.all([
    getCurrentWorker(),
    getApplications(),
  ]);

  const badge = BADGE_LABELS[worker?.badgeLevel ?? "newbie"];
  const upcoming = applications.filter(
    (application) =>
      application.status === "confirmed" || application.status === "checked_in",
  );
  const recentCompleted = applications
    .filter((application) => application.status === "completed")
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <p className="text-sm font-bold">MY</p>
          <Link
            href="/my/settings"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-5 px-4 py-4">
        <PushPermissionBanner />

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-3xl">
                {worker?.avatar ?? "👤"}
              </div>
              {worker?.verifiedId && (
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-brand">
                  <ShieldCheck className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h1 className="truncate text-lg font-bold">
                  {worker?.name ?? "프로필 없음"}
                </h1>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.color}`}
                >
                  {badge.label}
                </span>
              </div>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {worker?.bio ?? "자기소개를 등록하면 더 정확한 추천을 받을 수 있습니다."}
              </p>
            </div>

            <Link
              href="/my/profile"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-border pt-4">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">이번 달 수입</p>
              <p className="mt-0.5 text-sm font-bold text-brand">
                {formatMoney(worker?.thisMonthEarnings ?? 0)}
              </p>
            </div>
            <div className="border-x border-border text-center">
              <p className="text-[10px] text-muted-foreground">누적 수입</p>
              <p className="mt-0.5 text-sm font-bold">
                {formatMoney(worker?.totalEarnings ?? 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">노쇼</p>
              <p className="mt-0.5 text-sm font-bold">
                {worker?.noShowCount ?? 0}회
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <Calendar className="h-4 w-4 text-brand" />
              확정 근무 ({upcoming.length})
            </h2>
            {upcoming.length > 0 && (
              <Link href="/my/applications" className="text-xs font-medium text-brand">
                전체 보기
              </Link>
            )}
          </div>

          {upcoming.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center">
              <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="mb-3 text-sm text-muted-foreground">
                아직 확정된 근무가 없습니다.
              </p>
              <Link
                href="/home"
                className="inline-flex rounded-full bg-brand px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-dark"
              >
                일자리 찾아보기
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((application) => (
                <article
                  key={application.id}
                  className="rounded-2xl border border-border bg-card p-4 transition-all hover:border-brand/40 hover:shadow-sm"
                >
                  <Link
                    href={`/my/applications/${application.id}`}
                    className="block"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-2xl">
                        {application.job.business.logo}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[11px] text-muted-foreground">
                              {application.job.business.name}
                            </p>
                            <h3 className="line-clamp-1 text-sm font-bold">
                              {application.job.title}
                            </h3>
                          </div>
                          <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">
                            확정
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            <span className="font-medium text-foreground">
                              {formatWorkDate(application.job.workDate)}{" "}
                              {application.job.startTime}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">
                              {application.job.business.address
                                .split(" ")
                                .slice(0, 2)
                                .join(" ")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                    <Link
                      href={`/my/applications/${application.id}/check-in`}
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand/10 text-xs font-bold text-brand transition-colors hover:bg-brand/20"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      QR 체크인
                    </Link>
                    <Link
                      href={`/posts/${application.job.id}`}
                      className="flex h-9 items-center justify-center rounded-lg border border-border px-3 text-xs font-medium transition-colors hover:bg-muted"
                    >
                      공고 보기
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold">빠른 메뉴</h2>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 rounded-xl border border-border p-3 transition-colors hover:border-brand/40 hover:bg-muted/30"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
                  <item.icon className="h-5 w-5 text-brand" />
                </div>
                <span className="text-[11px] font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <Link
          href="/my/schedule"
          className="block rounded-2xl border border-brand/20 bg-brand-light p-4 transition-colors hover:bg-brand-light/80"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">AI 추천 일정</p>
              <p className="text-[11px] text-muted-foreground">
                가능한 시간에 맞는 공고를 빠르게 확인할 수 있습니다.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>

        {recentCompleted.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">최근 완료</h2>
              <Link
                href="/my/applications?tab=completed"
                className="text-xs font-medium text-brand"
              >
                전체 보기
              </Link>
            </div>
            <div className="space-y-2">
              {recentCompleted.map((application) => (
                <div
                  key={application.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xl">
                    {application.job.business.logo}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] text-muted-foreground">
                      {application.job.business.name}
                    </p>
                    <p className="line-clamp-1 text-xs font-medium">
                      {application.job.title}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] text-muted-foreground">수입</p>
                    <p className="text-xs font-bold text-brand">
                      {application.earnings
                        ? formatMoney(application.earnings)
                        : "정산 대기"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <form action={logout} className="pt-2">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </form>
      </div>
    </div>
  );
}
