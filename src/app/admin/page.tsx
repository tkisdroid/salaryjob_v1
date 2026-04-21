import Link from "next/link";

import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";

/**
 * Admin dashboard — overview stats for business profiles.
 *
 * Cards:
 *   1. 총 사업장  — all BusinessProfile rows
 *   2. 인증됨     — verified=true
 *   3. 미인증     — verified=false
 *   4. 검토 필요  — businessRegImageUrl IS NOT NULL AND verified=false (D-33 pending review cohort)
 */
export default async function AdminDashboardPage() {
  // T-06-15: redundant gate (layout does first gate; this protects client-nav bypass)
  await requireAdmin();

  const [
    userCount,
    workerCount,
    bizTotal,
    bizVerified,
    jobTotal,
    jobActive,
    appTotal,
    appSettled,
    pendingReviewCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.workerProfile.count(),
    prisma.businessProfile.count(),
    prisma.businessProfile.count({ where: { verified: true } }),
    prisma.job.count(),
    prisma.job.count({ where: { status: "active" } }),
    prisma.application.count(),
    prisma.application.count({
      where: { status: { in: ["settled", "completed"] } },
    }),
    prisma.businessProfile.count({
      where: { verified: false, businessRegImageUrl: { not: null } },
    }),
  ]);

  const stats = [
    {
      label: "총 사용자",
      value: userCount,
      description: "가입된 전체 계정",
      highlight: false,
    },
    {
      label: "워커",
      value: workerCount,
      description: "프로필 등록 워커",
      highlight: false,
    },
    {
      label: "총 사업장",
      value: bizTotal,
      description: "가입된 전체 사업장",
      highlight: false,
    },
    {
      label: "인증 사업장",
      value: bizVerified,
      description: "사업자번호 인증 완료",
      highlight: false,
    },
    {
      label: "총 공고",
      value: jobTotal,
      description: "등록된 전체 공고",
      highlight: false,
    },
    {
      label: "활성 공고",
      value: jobActive,
      description: "현재 지원 가능한 공고",
      highlight: false,
    },
    {
      label: "총 지원",
      value: appTotal,
      description: "전체 지원 건수",
      highlight: false,
    },
    {
      label: "정산 완료",
      value: appSettled,
      description: "settled / completed 건수",
      highlight: pendingReviewCount > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-[-0.035em] text-ink">
          대시보드
        </h1>
        <p className="mt-1 text-[13px] font-medium tracking-tight text-muted-foreground">
          플랫폼 현황 요약
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-[22px] border p-5 transition-colors ${
              stat.highlight
                ? "border-transparent bg-lime-chip"
                : "border-border-soft bg-surface"
            }`}
          >
            <p
              className={`text-[12px] font-bold tracking-tight ${
                stat.highlight ? "text-lime-chip-fg" : "text-muted-foreground"
              }`}
            >
              {stat.label}
            </p>
            <p
              className={`tabnum mt-2 text-[28px] font-extrabold tracking-[-0.035em] ${
                stat.highlight ? "text-lime-chip-fg" : "text-ink"
              }`}
            >
              {stat.value.toLocaleString("ko-KR")}
            </p>
            <p
              className={`mt-1 text-[11.5px] font-medium ${
                stat.highlight
                  ? "text-[color-mix(in_oklch,var(--lime-chip-fg)_70%,transparent)]"
                  : "text-muted-foreground"
              }`}
            >
              {stat.description}
            </p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href="/admin/businesses"
          className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-[13px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark"
        >
          사업장 목록 보기
        </Link>
        {pendingReviewCount > 0 && (
          <Link
            href="/admin/businesses?verified=no"
            className="inline-flex h-11 items-center rounded-full bg-lime-chip px-5 text-[13px] font-extrabold text-lime-chip-fg transition-all hover:shadow-soft-sm"
          >
            검토 대기 {pendingReviewCount}건 보기
          </Link>
        )}
      </div>
    </div>
  );
}
