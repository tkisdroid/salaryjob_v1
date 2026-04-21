import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { getAdminSettlements } from "@/lib/db/admin-queries";

type SearchParams = Promise<{ page?: string }>;

export default async function AdminSettlementsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  const { items, total } = await getAdminSettlements({ limit, offset });

  const totalPages = Math.ceil(total / limit);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  function formatKRW(amount: number | null): string {
    if (amount == null) return "-";
    return amount.toLocaleString("ko-KR") + "원";
  }

  function formatDate(d: Date | null): string {
    if (!d) return "-";
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-[-0.035em] text-ink">
          정산 내역
        </h1>
        <p className="mt-1 text-[13px] font-medium tracking-tight text-muted-foreground">
          settled / completed 상태의 전체 지원 건 ({total.toLocaleString("ko-KR")}건)
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[22px] border border-border-soft bg-surface p-10 text-center">
          <p className="text-[14px] font-semibold text-muted-foreground">
            정산 완료된 내역이 없습니다.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[22px] border border-border-soft bg-surface">
          <table className="w-full min-w-[800px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border-soft">
                <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  워커
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  공고
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  사업장
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  총 금액
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  수수료
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  정산액
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  체크아웃 일시
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-surface-2"
                >
                  <td className="px-4 py-3 font-semibold text-ink">
                    {item.workerName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.jobTitle}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.businessName}
                  </td>
                  <td className="tabnum px-4 py-3 text-right font-bold text-ink">
                    {formatKRW(item.earnings)}
                  </td>
                  <td className="tabnum px-4 py-3 text-right text-muted-foreground">
                    {formatKRW(item.commissionAmount)}
                  </td>
                  <td className="tabnum px-4 py-3 text-right font-bold text-brand-deep">
                    {formatKRW(item.netEarnings)}
                  </td>
                  <td className="tabnum px-4 py-3 text-muted-foreground">
                    {formatDate(item.checkOutAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-tight ${
                        item.status === "settled"
                          ? "bg-brand text-ink"
                          : "bg-surface-2 text-muted-foreground"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-[12px] font-semibold text-muted-foreground">
            {page} / {totalPages} 페이지
          </p>
          <div className="flex gap-2">
            {hasPrev && (
              <Link
                href={`/admin/settlements?page=${page - 1}`}
                className="inline-flex h-9 items-center rounded-full border border-border bg-surface px-4 text-[12px] font-bold text-ink transition-colors hover:bg-surface-2"
              >
                이전
              </Link>
            )}
            {hasNext && (
              <Link
                href={`/admin/settlements?page=${page + 1}`}
                className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-[12px] font-bold text-white transition-all hover:bg-black"
              >
                다음
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
