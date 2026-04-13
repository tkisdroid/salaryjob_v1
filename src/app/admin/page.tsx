import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";

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
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          사업장 현황 요약
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className={`p-5 ${
              stat.highlight
                ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950"
                : ""
            }`}
          >
            <p className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </p>
            <p
              className={`mt-1 text-3xl font-bold tabular-nums ${
                stat.highlight ? "text-amber-600 dark:text-amber-400" : ""
              }`}
            >
              {stat.value.toLocaleString("ko-KR")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stat.description}
            </p>
          </Card>
        ))}
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3 pt-2">
        <a
          href="/admin/businesses"
          className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          사업장 목록 보기
        </a>
        {pendingReviewCount > 0 && (
          <a
            href="/admin/businesses?verified=no"
            className="inline-flex min-h-[44px] items-center rounded-md border border-amber-300 bg-amber-50 px-5 text-sm font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400"
          >
            검토 대기 {pendingReviewCount}건 보기
          </a>
        )}
      </div>
    </div>
  );
}
