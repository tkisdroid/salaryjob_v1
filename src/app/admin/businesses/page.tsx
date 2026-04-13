import { requireAdmin } from "@/lib/dal";
import {
  getBusinessesPaginated,
  type BusinessListArgs,
} from "@/lib/db/admin-queries";
import { BusinessesClient } from "./businesses-client";
import Link from "next/link";
import { Card } from "@/components/ui/card";

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
        <h1 className="text-2xl font-bold">사업장 관리</h1>
        <span className="text-sm text-muted-foreground">
          {items.length === 0 ? "0건" : `${items.length}건 표시 중`}
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
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">
            조건에 해당하는 사업장이 없습니다.
          </p>
          <Link
            href={buildResetUrl()}
            className="text-sm text-primary underline"
          >
            필터 초기화
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((biz) => (
              <Link
                key={biz.id}
                href={`/admin/businesses/${biz.id}`}
                className="block"
              >
                <Card className="flex min-h-[60px] flex-col gap-1 p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{biz.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          biz.verified
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {biz.verified ? "인증됨" : "미인증"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatRegNumber(biz.businessRegNumber)} ·{" "}
                      {biz.ownerName ?? "대표자 미등록"} ·{" "}
                      {biz.ownerPhone ?? "연락처 미등록"}
                    </span>
                  </div>
                  <div className="flex flex-col items-start gap-0.5 text-right sm:items-end">
                    <span className="text-sm font-medium">
                      수수료:{" "}
                      {biz.commissionRate != null
                        ? `${biz.commissionRate.toString()}%`
                        : "기본값"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      등록일{" "}
                      {biz.createdAt.toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {nextCursor && (
            <div className="flex justify-center py-4">
              <Link
                href={buildNextUrl()}
                className="inline-flex min-h-[44px] items-center rounded-md border border-border bg-background px-6 text-sm hover:bg-muted"
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
