import Link from "next/link";
import { getCurrentWorker, getApplications } from "@/lib/db/queries";
import { formatWorkDate } from "@/lib/job-utils";
import { formatMoney } from "@/lib/format";
import { logout } from "@/app/(auth)/login/actions";
import {
  User,
  Clock,
  Wallet,
  Star,
  Heart,
  Settings,
  ChevronRight,
  ShieldCheck,
  Calendar,
  MapPin,
  QrCode,
  History,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  LogOut,
} from "lucide-react";

const BADGE_LABELS: Record<string, { label: string; color: string }> = {
  newbie: { label: "새내기", color: "bg-gray-100 text-gray-700" },
  bronze: { label: "브론즈", color: "bg-orange-100 text-orange-700" },
  silver: { label: "실버", color: "bg-slate-200 text-slate-700" },
  gold: { label: "골드", color: "bg-yellow-100 text-yellow-700" },
  platinum: { label: "플래티넘", color: "bg-cyan-100 text-cyan-700" },
  diamond: { label: "다이아", color: "bg-indigo-100 text-indigo-700" },
};

export default async function MyPage() {
  const [worker, applications] = await Promise.all([
    getCurrentWorker(),
    getApplications(),
  ]);
  const badge = BADGE_LABELS[(worker?.badgeLevel ?? "newbie")];
  const upcoming = applications.filter(
    (a) => a.status === "confirmed" || a.status === "checked_in"
  );
  const recentCompleted = applications.filter(
    (a) => a.status === "completed"
  ).slice(0, 2);

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <p className="text-sm font-bold">MY</p>
          <Link
            href="/my/settings"
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-5">
        {/* Profile Card */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center text-3xl">
                {worker?.avatar ?? "🙂"}
              </div>
              {worker?.verifiedId && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand border-2 border-background flex items-center justify-center">
                  <ShieldCheck className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold truncate">{worker?.name ?? "프로필 없음"}</h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.color}`}
                >
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {worker?.bio ?? ""}
              </p>
              <div className="flex items-center gap-1 mt-1 text-xs">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="font-bold">{worker?.rating ?? 0}</span>
                <span className="text-muted-foreground">
                  · 근무 {worker?.totalJobs ?? 0}회 · 완료율 {worker?.completionRate ?? 0}%
                </span>
              </div>
            </div>
            <Link
              href="/my/profile"
              className="shrink-0 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">이번 달 수입</p>
              <p className="font-bold text-sm text-brand mt-0.5">
                {formatMoney(worker?.thisMonthEarnings ?? 0)}
              </p>
            </div>
            <div className="text-center border-x border-border">
              <p className="text-[10px] text-muted-foreground">누적 수입</p>
              <p className="font-bold text-sm mt-0.5">
                {formatMoney(worker?.totalEarnings ?? 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">노쇼</p>
              <p className="font-bold text-sm mt-0.5">
                {worker?.noShowCount ?? 0}회
              </p>
            </div>
          </div>
        </section>

        {/* Upcoming Jobs */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-brand" />
              확정된 근무 ({upcoming.length})
            </h2>
            {upcoming.length > 0 && (
              <Link
                href="/my/applications"
                className="text-xs text-brand font-medium"
              >
                전체 →
              </Link>
            )}
          </div>

          {upcoming.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center">
              <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                확정된 근무가 없어요
              </p>
              <Link
                href="/home"
                className="inline-block text-xs bg-brand text-white font-medium px-4 py-2 rounded-full hover:bg-brand-dark transition-colors"
              >
                일자리 찾아보기
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((app) => (
                <Link
                  key={app.id}
                  href={`/my/applications/${app.id}`}
                  className="block rounded-2xl border border-border bg-card p-4 hover:border-brand/40 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-2xl shrink-0">
                      {app.job.business.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] text-muted-foreground truncate">
                            {app.job.business.name}
                          </p>
                          <h3 className="font-bold text-sm line-clamp-1">
                            {app.job.title}
                          </h3>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand">
                          확정
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          <span className="font-medium text-foreground">
                            {formatWorkDate(app.job.workDate)}{" "}
                            {app.job.startTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">
                            {app.job.business.address.split(" ").slice(0, 2).join(" ")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick action: QR check-in */}
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                    <Link
                      href={`/my/applications/${app.id}/check-in`}
                      className="flex-1 h-9 rounded-lg bg-brand/10 hover:bg-brand/20 text-brand font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" /> QR 체크인
                    </Link>
                    <Link
                      href={`/posts/${app.job.id}`}
                      className="w-9 h-9 rounded-lg border border-border hover:bg-muted flex items-center justify-center transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Quick menu grid */}
        <section>
          <h2 className="text-sm font-bold mb-3">빠른 메뉴</h2>
          <div className="grid grid-cols-4 gap-2">
            {[
              {
                href: "/my/availability",
                icon: Clock,
                label: "가용시간",
              },
              {
                href: "/my/settlements",
                icon: Wallet,
                label: "정산내역",
              },
              {
                href: "/my/applications",
                icon: History,
                label: "근무이력",
              },
              {
                href: "/my/favorites",
                icon: Heart,
                label: "찜 목록",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border hover:border-brand/40 hover:bg-muted/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-brand" />
                </div>
                <span className="text-[11px] font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* AI Schedule teaser */}
        <Link
          href="/my/schedule"
          className="block rounded-2xl bg-gradient-to-br from-brand/10 to-brand/5 border border-brand/20 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">AI 추천 스케줄</p>
              <p className="text-[11px] text-muted-foreground">
                가용시간에 맞는 최적 일정을 추천받아보세요
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </Link>

        {/* Recent Completed */}
        {recentCompleted.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                최근 완료
              </h2>
              <Link
                href="/my/applications?tab=completed"
                className="text-xs text-brand font-medium"
              >
                전체 →
              </Link>
            </div>
            <div className="space-y-2">
              {recentCompleted.map((app) => (
                <div
                  key={app.id}
                  className="rounded-xl border border-border bg-card p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xl shrink-0">
                    {app.job.business.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground truncate">
                      {app.job.business.name}
                    </p>
                    <p className="text-xs font-medium line-clamp-1">
                      {app.job.title}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">수입</p>
                    <p className="text-xs font-bold text-brand">
                      {app.earnings
                        ? formatMoney(app.earnings)
                        : "정산 대기"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Logout */}
        <section className="pt-2">
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </form>
        </section>

        {/* Info & settings */}
        <section className="pt-2 pb-6 text-center space-y-1.5">
          <p className="text-[10px] text-muted-foreground">GigNow v0.1.0</p>
          <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
            <Link href="#" className="hover:text-foreground">
              고객센터
            </Link>
            <span>·</span>
            <Link href="#" className="hover:text-foreground">
              이용약관
            </Link>
            <span>·</span>
            <Link href="#" className="hover:text-foreground">
              개인정보처리방침
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
