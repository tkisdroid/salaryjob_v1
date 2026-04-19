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

  const [total, verifiedCount, unverifiedCount, pendingReviewCount] =
    await Promise.all([
      prisma.businessProfile.count(),
      prisma.businessProfile.count({ where: { verified: true } }),
      prisma.businessProfile.count({ where: { verified: false } }),
      prisma.businessProfile.count({
        where: { verified: false, businessRegImageUrl: { not: null } },
      }),
    ]);

  const stats = [
    {
      label: "총 사업장",
      value: total,
      description: "가입된 전체 사업장",
      highlight: false,
    },
    {
      label: "인증됨",
      value: verifiedCount,
      description: "사업자번호 인증 완료",
      highlight: false,
    },
    {
      label: "미인증",
      value: unverifiedCount,
      description: "사업자번호 미입력 또는 오류",
      highlight: false,
    },
    {
      label: "검토 필요",
      value: pendingReviewCount,
      description: "등록증 이미지 업로드됨 · 미인증",
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
          사업장 현황 요약
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
        <a
          href="/admin/businesses"
          className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-[13px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark"
        >
          사업장 목록 보기
        </a>
        {pendingReviewCount > 0 && (
          <a
            href="/admin/businesses?verified=no"
            className="inline-flex h-11 items-center rounded-full bg-lime-chip px-5 text-[13px] font-extrabold text-lime-chip-fg transition-all hover:shadow-soft-sm"
          >
            검토 대기 {pendingReviewCount}건 보기
          </a>
        )}
      </div>
    </div>
  );
}
