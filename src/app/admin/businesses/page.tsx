import { requireAdmin } from "@/lib/dal";
import {
  getBusinessesPaginated,
  type BusinessListArgs,
} from "@/lib/db/admin-queries";
import { BusinessesClient } from "./businesses-client";
import Link from "next/link";
import { Building2 } from "lucide-react";

// Valid enum values for URL params — coerces unknown input to defaults
const VALID_FIELDS = ["name", "reg", "owner", "phone"] as const;
const VALID_VERIFIED = ["all", "yes", "no"] as const;
const VALID_SORTS = [
  "created_desc",
  "created_asc",
  "rate_desc",
  "rate_asc",
] as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function coerceField(v: string | undefined): NonNullable<BusinessListArgs["field"]> {
  if (v && (VALID_FIELDS as readonly string[]).includes(v)) {
    return v as NonNullable<BusinessListArgs["field"]>;
  }
  return "name";
}

function coerceVerified(v: string | undefined): NonNullable<BusinessListArgs["verified"]> {
  if (v && (VALID_VERIFIED as readonly string[]).includes(v)) {
    return v as NonNullable<BusinessListArgs["verified"]>;
  }
  return "all";
}

function coerceSort(v: string | undefined): NonNullable<BusinessListArgs["sort"]> {
  if (v && (VALID_SORTS as readonly string[]).includes(v)) {
    return v as NonNullable<BusinessListArgs["sort"]>;
  }
  return "created_desc";
}

function formatRegNumber(reg: string | null): string {
  if (!reg) return "-";
  // Format digits-only 10-char as NNN-NN-NNNNN
  const d = reg.replace(/\D/g, "");
  if (d.length === 10) {
    return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  }
  return reg;
}

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();

  const sp = await searchParams;
  const q = first(sp.q)?.slice(0, 100);
  const field = coerceField(first(sp.field));
  const verified = coerceVerified(first(sp.verified));
  const sort = coerceSort(first(sp.sort));
  const cursor = first(sp.cursor) ?? null;

  const args: BusinessListArgs = {
    q,
    field,
    verified,
    sort,
    cursor,
    limit: 20,
  };

  const { items, nextCursor } = await getBusinessesPaginated(args);

  // Build next page URL preserving existing filters
  function buildNextUrl(): string {
    const params = new URLSearchParams();
    if (q) params.set("q", q as string);
    if (field !== "name") params.set("field", field);
    if (verified !== "all") params.set("verified", verified);
    if (sort !== "created_desc") params.set("sort", sort);
    if (nextCursor) params.set("cursor", nextCursor);
    return `/admin/businesses?${params.toString()}`;
  }

  // Build reset URL (no filters)
  function buildResetUrl(): string {
    return "/admin/businesses";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-[26px] font-extrabold tracking-[-0.035em] text-ink">
          <Building2 className="h-[22px] w-[22px] text-brand-deep" />
          사업장 관리
        </h1>
        <span className="inline-flex items-center rounded-full bg-surface-2 px-3 py-1 text-[11.5px] font-bold text-muted-foreground">
          <span className="tabnum">
            {items.length === 0 ? "0" : items.length}
          </span>
          건 표시 중
        </span>
      </div>

      {/* Client filter bar */}
      <BusinessesClient
        initialQuery={q ?? ""}
        initialField={field}
        initialVerified={verified}
        initialSort={sort}
      />

      {/* Results */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[22px] border border-border bg-surface py-16 text-center">
          <p className="text-[14px] font-semibold text-muted-foreground">
            조건에 해당하는 사업장이 없습니다.
          </p>
          <Link
            href={buildResetUrl()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-[12.5px] font-bold text-ink transition-colors hover:border-ink hover:bg-surface-2"
          >
            필터 초기화
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-2.5">
            {items.map((biz) => (
              <Link
                key={biz.id}
                href={`/admin/businesses/${biz.id}`}
                className="flex min-h-[60px] flex-col gap-2 rounded-[18px] border border-border-soft bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-soft-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14.5px] font-extrabold tracking-[-0.02em] text-ink">
                      {biz.name}
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-[6px] px-2 py-0.5 text-[10px] font-extrabold tracking-tight ${
                        biz.verified
                          ? "bg-brand text-ink"
                          : "bg-lime-chip text-lime-chip-fg"
                      }`}
                    >
                      {biz.verified ? "인증됨" : "미인증"}
                    </span>
                  </div>
                  <p className="tabnum mt-1 truncate text-[11.5px] font-medium text-muted-foreground">
                    <b className="font-bold text-ink">
                      {formatRegNumber(biz.businessRegNumber)}
                    </b>{" "}
                    · {biz.ownerName ?? "대표자 미등록"} ·{" "}
                    {biz.ownerPhone ?? "연락처 미등록"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-0.5 text-right sm:items-end">
                  <span className="tabnum text-[13px] font-extrabold tracking-tight text-ink">
                    수수료{" "}
                    <span className="text-brand-deep">
                      {biz.commissionRate != null
                        ? `${biz.commissionRate.toString()}%`
                        : "기본값"}
                    </span>
                  </span>
                  <span className="tabnum text-[10.5px] font-semibold text-text-subtle">
                    등록일{" "}
                    {biz.createdAt.toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {nextCursor && (
            <div className="flex justify-center py-4">
              <Link
                href={buildNextUrl()}
                className="inline-flex h-11 items-center rounded-full border border-border bg-surface px-6 text-[13px] font-bold text-ink transition-colors hover:border-ink hover:bg-surface-2"
              >
                다음 페이지
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
