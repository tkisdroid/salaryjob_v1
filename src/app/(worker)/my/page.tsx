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
      {/* my-head: bold MY title + settings button */}
      <header className="sticky top-0 z-40 border-b border-border-soft bg-[color-mix(in_oklch,var(--surface)_92%,transparent)] [backdrop-filter:saturate(1.4)_blur(12px)]">
        <div className="mx-auto flex h-[72px] max-w-lg items-center justify-between px-4">
          <h1 className="text-[22px] font-extrabold tracking-[-0.035em] text-ink">
            MY
          </h1>
          <Link
            href="/my/settings"
            aria-label="설정"
            className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-ink transition-colors hover:bg-surface-2/70"
          >
            <Settings className="h-[18px] w-[18px]" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-3 px-4 pt-3 pb-6">
        <PushPermissionBanner />

        {/* Profile + stats3 — premium pattern */}
        <Link
          href="/my/profile"
          className="group block rounded-[18px] border border-border-soft bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-soft-sm"
        >
          <div className="grid grid-cols-[56px_1fr_auto] items-center gap-[14px] border-b border-border-soft pb-4">
            <div className="relative">
              <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-[color-mix(in_oklch,var(--brand)_20%,var(--surface))] text-[28px]">
                {worker?.avatar ?? "👤"}
              </div>
              {worker?.verifiedId && (
                <div className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-surface bg-brand">
                  <ShieldCheck className="h-[11px] w-[11px] text-ink" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[17px] font-extrabold tracking-[-0.025em] text-ink">
                  {worker?.name ?? "프로필 없음"}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-ink px-[9px] py-[3px] text-[10px] font-extrabold tracking-wider text-white">
                  <span className="h-[5px] w-[5px] rounded-full bg-[#C0C0C0] shadow-[0_0_0_1px_rgba(255,255,255,.3)]" />
                  {badge.label}
                </span>
              </div>
              <p className="mt-1 line-clamp-1 text-[12px] font-medium leading-snug text-muted-foreground">
                {worker?.bio ??
                  "자기소개를 등록하면 더 정확한 추천을 받을 수 있습니다."}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-text-subtle transition-transform group-hover:translate-x-0.5" />
          </div>

          {/* stats3 — centered with divider lines, brand-deep values */}
          <div className="grid grid-cols-3 pt-3.5">
            <div className="relative text-center">
              <p className="text-[11px] font-semibold tracking-tight text-muted-foreground">
                이번 달 수입
              </p>
              <p className="tabnum mt-1 text-[17px] font-extrabold tracking-[-0.02em] text-brand-deep">
                {formatMoney(worker?.thisMonthEarnings ?? 0)}
              </p>
            </div>
            <div className="relative text-center before:absolute before:left-0 before:top-[10%] before:bottom-[10%] before:w-px before:bg-border-soft">
              <p className="text-[11px] font-semibold tracking-tight text-muted-foreground">
                누적 수입
              </p>
              <p className="tabnum mt-1 text-[17px] font-extrabold tracking-[-0.02em] text-brand-deep">
                {formatMoney(worker?.totalEarnings ?? 0)}
              </p>
            </div>
            <div className="relative text-center before:absolute before:left-0 before:top-[10%] before:bottom-[10%] before:w-px before:bg-border-soft">
              <p className="text-[11px] font-semibold tracking-tight text-muted-foreground">
                노쇼
              </p>
              <p
                className={`tabnum mt-1 text-[17px] font-extrabold tracking-[-0.02em] ${
                  (worker?.noShowCount ?? 0) === 0
                    ? "text-text-subtle"
                    : "text-brand-deep"
                }`}
              >
                {worker?.noShowCount ?? 0}회
              </p>
            </div>
          </div>
        </Link>

        {/* Upcoming shifts — shift card pattern */}
        <section>
          <div className="flex items-center justify-between px-0.5 py-2">
            <h2 className="inline-flex items-center gap-[7px] text-[13px] font-extrabold tracking-[-0.02em] text-ink">
              <Calendar className="h-[15px] w-[15px] text-brand-deep" />
              확정 근무 ({upcoming.length})
            </h2>
            {upcoming.length > 0 && (
              <Link
                href="/my/applications"
                className="text-[11.5px] font-bold text-brand-deep"
              >
                전체 보기
              </Link>
            )}
          </div>

          {upcoming.length === 0 ? (
            <div className="rounded-[18px] border-2 border-dashed border-border bg-surface p-6 text-center">
              <Calendar className="mx-auto mb-2 h-8 w-8 text-text-subtle" />
              <p className="mb-3 text-[13px] font-semibold text-muted-foreground">
                아직 확정된 근무가 없습니다.
              </p>
              <Link
                href="/home"
                className="inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 text-[12px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark"
              >
                일자리 찾아보기
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcoming.map((application) => (
                <article
                  key={application.id}
                  className="rounded-[18px] border border-border-soft bg-surface p-3.5"
                >
                  <Link
                    href={`/my/applications/${application.id}`}
                    className="block"
                  >
                    <div className="grid grid-cols-[40px_1fr_auto] items-start gap-3 border-b border-dashed border-border pb-3">
                      <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-xl">
                        {application.job.business.logo}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[11.5px] font-semibold text-muted-foreground">
                          {application.job.business.name}
                        </p>
                        <h3 className="mt-0.5 line-clamp-1 text-[14px] font-extrabold tracking-[-0.02em] text-ink">
                          {application.job.title}
                        </h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[11.5px] font-medium text-muted-foreground">
                          <span className="inline-flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            <b className="font-bold text-ink">
                              {formatWorkDate(application.job.workDate)}{" "}
                              {application.job.startTime}
                            </b>
                          </span>
                          <span className="inline-flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">
                              {application.job.business.address
                                .split(" ")
                                .slice(0, 2)
                                .join(" ")}
                            </span>
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-[6px] bg-brand px-2 py-1 text-[10px] font-extrabold text-ink">
                        확정
                      </span>
                    </div>
                  </Link>

                  <div className="grid grid-cols-2 gap-2 pt-3">
                    <Link
                      href={`/my/applications/${application.id}/check-in`}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-ink bg-[color-mix(in_oklch,var(--brand)_10%,var(--surface))] text-[12.5px] font-bold text-ink transition-all hover:bg-[color-mix(in_oklch,var(--brand)_16%,var(--surface))]"
                    >
                      <QrCode className="h-4 w-4" />
                      QR 체크인
                    </Link>
                    <Link
                      href={`/posts/${application.job.id}`}
                      className="inline-flex h-11 items-center justify-center rounded-[12px] border border-border bg-surface text-[12.5px] font-bold text-ink transition-colors hover:bg-surface-2"
                    >
                      공고 보기
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Quick menu — 4-col tile grid */}
        <section>
          <h2 className="px-0.5 py-2 text-[13px] font-extrabold tracking-[-0.02em] text-ink">
            빠른 메뉴
          </h2>
          <div className="grid grid-cols-4 gap-2 pb-2">
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1.5 rounded-[14px] border border-border-soft bg-surface p-3.5 transition-all hover:-translate-y-0.5 hover:border-ink"
              >
                <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="text-[11.5px] font-bold tracking-tight text-ink">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* AI banner — ink bg + brand ico */}
        <Link
          href="/my/schedule"
          className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-[16px] bg-ink p-3.5 text-white"
        >
          <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-brand text-ink">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold tracking-[-0.02em]">
              AI 추천 일정
            </p>
            <p className="mt-0.5 text-[11.5px] font-medium leading-snug text-[color-mix(in_oklch,#fff_70%,transparent)]">
              가능한 시간에 맞는 공고를 빠르게 확인할 수 있습니다.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-[color-mix(in_oklch,#fff_60%,transparent)]" />
        </Link>

        {recentCompleted.length > 0 && (
          <section>
            <div className="flex items-center justify-between px-0.5 py-2">
              <h2 className="text-[13px] font-extrabold tracking-[-0.02em] text-ink">
                최근 완료
              </h2>
              <Link
                href="/my/applications?tab=completed"
                className="text-[11.5px] font-bold text-brand-deep"
              >
                전체 보기
              </Link>
            </div>
            <div className="space-y-2">
              {recentCompleted.map((application) => (
                <div
                  key={application.id}
                  className="flex items-center gap-3 rounded-[14px] border border-border-soft bg-surface p-3"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-surface-2 text-xl">
                    {application.job.business.logo}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-semibold text-muted-foreground">
                      {application.job.business.name}
                    </p>
                    <p className="line-clamp-1 text-[13.5px] font-bold tracking-tight text-ink">
                      {application.job.title}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      수입
                    </p>
                    <p className="tabnum text-[14px] font-extrabold tracking-tight text-brand-deep">
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
            className="flex w-full items-center justify-center gap-1.5 rounded-[14px] border border-border-soft bg-surface py-3.5 text-[13px] font-bold text-muted-foreground transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </form>
      </div>
    </div>
  );
}
