import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { getBusinessById } from "@/lib/db/admin-queries";
import { createSignedBusinessRegUrl } from "@/lib/supabase/storage-biz-reg";
import { getEffectiveCommissionRate } from "@/lib/commission";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import CommissionForm from "./commission-form";
import VerifyActionsPanel from "./verify-actions-panel";

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
    <section className="rounded-[22px] border border-border-soft bg-surface p-5">
      <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
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
    <div className="flex flex-col gap-0.5 py-2">
      <span className="text-[11.5px] font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="text-[13.5px] font-bold tracking-tight text-ink">
        {value ?? "-"}
      </span>
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
            className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] font-bold text-ink transition-colors hover:border-ink hover:bg-surface-2"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            사업장 목록
          </Link>
          <h1 className="text-[26px] font-extrabold tracking-[-0.035em] text-ink">
            {business.name}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-[10px] font-extrabold tracking-tight ${
                business.verified
                  ? "bg-brand text-ink"
                  : "bg-lime-chip text-lime-chip-fg"
              }`}
            >
              {business.verified ? "인증됨" : "미인증"}
            </span>
            <span className="tabnum text-[11.5px] font-semibold text-text-subtle">
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

      {/* 인증 관리 */}
      <Section title="인증 관리">
        <VerifyActionsPanel
          businessId={business.id}
          currentVerified={business.verified}
        />
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 사업장 정보 */}
        <Section title="사업장 정보">
          <div className="divide-y divide-border-soft">
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
          <div className="divide-y divide-border-soft">
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
          <div className="divide-y divide-border-soft">
            <Field label="User ID" value={business.user.id} />
            <Field label="이메일" value={business.user.email} />
            <Field label="전화번호" value={business.user.phone} />
          </div>
        </Section>

        {/* 실적 */}
        <Section title="실적">
          <div className="divide-y divide-border-soft">
            <Field
              label="등록된 공고"
              value={
                <span className="tabnum">
                  {business._counts.jobs.toLocaleString("ko-KR")}건
                </span>
              }
            />
          </div>
        </Section>
      </div>

      {/* 사업자등록증 */}
      <Section title="사업자등록증">
        {business.businessRegImageUrl ? (
          signedUrl ? (
            <div className="space-y-3">
              <p className="text-[11.5px] font-medium text-text-subtle">
                서명된 URL은 1시간 후 만료됩니다. 페이지를 새로고침하면
                갱신됩니다.
              </p>
              {business.businessRegImageUrl.endsWith(".pdf") ? (
                <object
                  data={signedUrl}
                  type="application/pdf"
                  className="h-[600px] w-full rounded-[18px] border border-border-soft"
                  aria-label="사업자등록증 PDF"
                >
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] font-bold text-brand-deep underline"
                  >
                    PDF 열기
                  </a>
                </object>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signedUrl}
                  alt="사업자등록증"
                  className="max-h-[600px] w-auto rounded-[18px] border border-border-soft bg-surface-2 object-contain"
                />
              )}
            </div>
          ) : (
            <p className="text-[13px] font-bold text-destructive">
              이미지 열람에 실패했습니다. 잠시 후 다시 시도해주세요.
            </p>
          )
        ) : (
          <span className="inline-flex items-center rounded-full bg-surface-2 px-3 py-1 text-[11.5px] font-bold text-muted-foreground">
            업로드 전
          </span>
        )}
      </Section>

      {/* 수수료 설정 */}
      <Section title="수수료 설정">
        <CommissionForm
          businessId={business.id}
          currentRate={business.commissionRate?.toString() ?? null}
          envDefault={envDefault}
          effectiveRate={effectiveRate.toString()}
          isOverride={isOverride}
        />
      </Section>
    </div>
  );
}
