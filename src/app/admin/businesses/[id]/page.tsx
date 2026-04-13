import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { getBusinessById } from "@/lib/db/admin-queries";
import { createSignedBusinessRegUrl } from "@/lib/supabase/storage-biz-reg";
import { getEffectiveCommissionRate } from "@/lib/commission";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { updateCommissionRate as _updateCommissionRate } from "./actions";

// Void wrapper so form action= prop is satisfied by TypeScript.
// The rich return value from _updateCommissionRate is preserved for future
// useActionState wiring; for now the form reloads the page on submit.
async function updateCommissionRateAction(formData: FormData): Promise<void> {
  await _updateCommissionRate(formData);
}

type Params = Promise<{ id: string }>;

function formatRegNumber(reg: string | null): string {
  if (!reg) return "-";
  const d = reg.replace(/\D/g, "");
  if (d.length === 10) {
    return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  }
  return reg;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </Card>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value ?? "-"}</span>
    </div>
  );
}

export default async function AdminBusinessDetailPage({
  params,
}: {
  params: Params;
}) {
  // T-06-15: redundant gate (layout does first; this protects client-nav bypass)
  await requireAdmin();

  const { id } = await params;
  const business = await getBusinessById(id);
  if (!business) notFound();

  // T-06-14: signed URL generated per render, never cached or logged
  let signedUrl: string | null = null;
  if (business.businessRegImageUrl) {
    signedUrl = await createSignedBusinessRegUrl(business.businessRegImageUrl, 3600);
  }

  // Effective commission rate for display (override vs env default)
  const effectiveRate = getEffectiveCommissionRate(business.commissionRate);
  const isOverride = business.commissionRate != null;
  const envDefault = process.env.PLATFORM_DEFAULT_COMMISSION_RATE ?? "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1">
          <Link
            href="/admin/businesses"
            className="mb-1 inline-flex text-xs text-muted-foreground hover:text-foreground"
          >
            ← 사업장 목록
          </Link>
          <h1 className="text-2xl font-bold">{business.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                business.verified
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {business.verified ? "인증됨" : "미인증"}
            </span>
            <span className="text-xs text-muted-foreground">
              등록일{" "}
              {business.createdAt.toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 사업장 정보 */}
        <Section title="사업장 정보">
          <div className="divide-y divide-border">
            <Field label="사업장명" value={business.name} />
            <Field label="카테고리" value={business.category} />
            <Field label="주소" value={business.address} />
            {business.addressDetail && (
              <Field label="상세주소" value={business.addressDetail} />
            )}
          </div>
        </Section>

        {/* 사업자 정보 */}
        <Section title="사업자 정보">
          <div className="divide-y divide-border">
            <Field
              label="사업자등록번호"
              value={formatRegNumber(business.businessRegNumber)}
            />
            <Field label="대표자명" value={business.ownerName} />
            <Field label="대표자 연락처" value={business.ownerPhone} />
          </div>
        </Section>

        {/* 계정 정보 */}
        <Section title="계정 정보">
          <div className="divide-y divide-border">
            <Field label="User ID" value={business.user.id} />
            <Field label="이메일" value={business.user.email} />
            <Field label="전화번호" value={business.user.phone} />
          </div>
        </Section>

        {/* 실적 */}
        <Section title="실적">
          <div className="divide-y divide-border">
            <Field
              label="등록된 공고"
              value={`${business._counts.jobs.toLocaleString("ko-KR")}건`}
            />
          </div>
        </Section>
      </div>

      {/* 사업자등록증 */}
      <Section title="사업자등록증">
        {business.businessRegImageUrl ? (
          signedUrl ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                서명된 URL은 1시간 후 만료됩니다. 페이지를 새로고침하면 갱신됩니다.
              </p>
              {business.businessRegImageUrl.endsWith(".pdf") ? (
                <object
                  data={signedUrl}
                  type="application/pdf"
                  className="h-[600px] w-full rounded-md border border-border"
                  aria-label="사업자등록증 PDF"
                >
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline"
                  >
                    PDF 열기
                  </a>
                </object>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signedUrl}
                  alt="사업자등록증"
                  className="max-h-[600px] w-auto rounded-md border border-border object-contain"
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-destructive">
              이미지 열람에 실패했습니다. 잠시 후 다시 시도해주세요.
            </p>
          )
        ) : (
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            업로드 전
          </span>
        )}
      </Section>

      {/* 수수료 설정 */}
      <Section title="수수료 설정">
        <div className="space-y-4">
          {/* Current effective rate display */}
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <p>
              <span className="font-medium">현재 적용 수수료율:</span>{" "}
              <span className="font-bold text-primary">
                {effectiveRate.toString()}%
              </span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isOverride
                ? `관리자 설정값 (플랫폼 기본값: ${envDefault}%)`
                : `플랫폼 기본값 (PLATFORM_DEFAULT_COMMISSION_RATE=${envDefault}%)`}
            </p>
          </div>

          {/* Commission edit form */}
          <form action={updateCommissionRateAction} className="space-y-3">
            <input type="hidden" name="businessId" value={business.id} />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="rate"
                className="text-sm font-medium"
              >
                수수료율 변경 (%)
              </label>
              <p className="text-xs text-muted-foreground">
                0–100 사이의 값, 소수점 둘째 자리까지 허용. 비워두면 플랫폼 기본값으로 초기화됩니다.
              </p>
              <input
                id="rate"
                name="rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                defaultValue={
                  business.commissionRate != null
                    ? business.commissionRate.toString()
                    : ""
                }
                placeholder={`기본값 (${envDefault}%)`}
                className="min-h-[44px] w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="수수료율"
              />
            </div>
            <button
              type="submit"
              className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              수수료율 저장
            </button>
          </form>
        </div>
      </Section>
    </div>
  );
}
