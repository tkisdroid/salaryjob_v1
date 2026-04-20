/**
 * /biz/verify — 사업자등록증 업로드 페이지
 *
 * D-31: Gate before first job post — redirected here when businessRegImageUrl is null.
 * D-32: Uploads image to business-reg-docs bucket, then calls CLOVA OCR.
 * D-33: OCR failure/mismatch is non-blocking — image is always saved.
 *
 * This is a Server Component. The upload form POSTs to the uploadBusinessRegImage
 * Server Action. No mock data — all state comes from the DB via requireBusiness().
 */

import { requireBusiness } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { createSignedBusinessRegUrl } from '@/lib/supabase/storage-biz-reg'
import { formatRegNumber } from '@/lib/validations/business'
import { submitBusinessRegImage } from './actions'
import { Upload, CheckCircle, CheckCircle2, AlertTriangle, ImageIcon, ShieldCheck } from 'lucide-react'

export default async function BizVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string }>
}) {
  const session = await requireBusiness()
  const params = await searchParams
  const requestedId = params.businessId?.trim()

  // UUID guard — drop garbage silently and fall back to findFirst behavior
  const isValidUuid = requestedId && /^[0-9a-f-]{36}$/i.test(requestedId)

  let business
  if (isValidUuid) {
    // Targeted: load the requested profile, re-verify ownership (requireBusiness
    // already gated role; userId match prevents cross-tenant profile access).
    business = await prisma.businessProfile.findFirst({
      where: { id: requestedId, userId: session.id },
      select: {
        id: true,
        businessRegNumber: true,
        businessRegImageUrl: true,
        regNumberOcrMismatched: true,
        verified: true,
      },
    })
  } else {
    // Fallback: original behavior — oldest profile for this user
    business = await prisma.businessProfile.findFirst({
      where: { userId: session.id },
      select: {
        id: true,
        businessRegNumber: true,
        businessRegImageUrl: true,
        regNumberOcrMismatched: true,
        verified: true,
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  if (!business) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="rounded-[28px] border-2 border-dashed border-border bg-surface p-10 text-center">
          <p className="text-[17px] font-extrabold tracking-tight text-ink">
            등록된 사업장 프로필이 없습니다.
          </p>
          <p className="mt-2 text-[13px] font-medium text-muted-foreground">
            먼저 사업장 프로필을 만들어주세요.
          </p>
        </div>
      </main>
    )
  }

  // Generate a signed URL for preview if an image is already uploaded
  const signedUrl = business.businessRegImageUrl
    ? await createSignedBusinessRegUrl(business.businessRegImageUrl)
    : null

  const hasImage = Boolean(business.businessRegImageUrl)
  const hasMismatch =
    business.regNumberOcrMismatched && Boolean(business.businessRegNumber)

  const currentStep = hasImage ? (business.verified ? 2 : 1) : 0;

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-[24px] font-extrabold tracking-[-0.035em] text-ink">
          <ShieldCheck className="h-[22px] w-[22px] text-brand-deep" />
          사업자 인증
        </h1>
        <p className="mt-1 text-[12.5px] font-medium tracking-tight text-muted-foreground">
          사업자등록증을 업로드하여 인증을 완료하세요.
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex items-center justify-center">
        {[0, 1, 2].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`grid h-9 w-9 place-items-center rounded-full text-[12px] font-extrabold transition-all ${
                s < currentStep
                  ? "bg-ink text-white"
                  : s === currentStep
                    ? "bg-brand text-ink ring-4 ring-[color-mix(in_oklch,var(--brand)_25%,transparent)]"
                    : "bg-surface-2 text-text-subtle"
              }`}
            >
              {s < currentStep ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                s + 1
              )}
            </div>
            {s < 2 && (
              <div
                className={`h-0.5 w-12 transition-colors ${
                  s < currentStep ? "bg-ink" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Current state indicator */}
      <div className="mb-5 flex items-center gap-3 rounded-[18px] border border-border-soft bg-surface p-4">
        {hasImage ? (
          <>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[color-mix(in_oklch,var(--brand)_18%,var(--surface))] text-brand-deep">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[14px] font-extrabold tracking-tight text-ink">
                업로드됨
              </p>
              <p className="mt-0.5 text-[11.5px] font-medium text-muted-foreground">
                사업자등록증이 이미 업로드되어 있습니다. 재업로드하려면 아래
                양식을 사용하세요.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-surface-2 text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[14px] font-extrabold tracking-tight text-ink">
                미업로드
              </p>
              <p className="mt-0.5 text-[11.5px] font-medium text-muted-foreground">
                아직 사업자등록증이 업로드되지 않았습니다.
              </p>
            </div>
          </>
        )}
      </div>

      {/* OCR mismatch notice — non-blocking, informational (D-33) */}
      {hasMismatch && (
        <div className="mb-5 flex items-start gap-3 rounded-[14px] border border-[var(--amber)]/30 bg-[var(--amber-light)] p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--amber-deep)]" />
          <div>
            <p className="text-[13px] font-extrabold text-[var(--amber-deep)]">
              OCR 번호 불일치
            </p>
            <p className="mt-1 text-[11.5px] font-medium leading-relaxed text-[var(--amber-deep)]/80">
              이미지에서 추출한 사업자번호가 입력값(
              {formatRegNumber(business.businessRegNumber!)})과 일치하지
              않습니다. 관리자 재검토 대상으로 등록되었습니다.
            </p>
          </div>
        </div>
      )}

      {/* Image preview (if uploaded) */}
      {signedUrl && (
        <div className="mb-5">
          <p className="mb-2 text-[11.5px] font-bold tracking-tight text-muted-foreground">
            현재 업로드된 이미지
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signedUrl}
            alt="사업자등록증"
            className="max-h-64 w-full rounded-[22px] border border-border-soft bg-surface-2 object-contain"
          />
        </div>
      )}

      {/* Upload form */}
      <div className="rounded-[22px] border border-border-soft bg-surface p-5">
        <div className="mb-4 flex items-center gap-2">
          <Upload className="h-[18px] w-[18px] text-brand-deep" />
          <h2 className="text-[14px] font-extrabold tracking-tight text-ink">
            사업자등록증 업로드
          </h2>
        </div>

        <form action={submitBusinessRegImage} className="space-y-4">
          <input type="hidden" name="businessId" value={business.id} />

          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[18px] border-2 border-dashed border-border bg-surface-2/60 p-10 transition-all hover:border-ink hover:bg-[color-mix(in_oklch,var(--brand)_6%,var(--surface))]">
            <input
              id="biz-reg-file"
              name="file"
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              required
              className="hidden"
            />
            <ImageIcon className="h-10 w-10 text-text-subtle" />
            <p className="text-[14px] font-extrabold tracking-tight text-ink">
              파일을 드래그하거나 클릭하여 업로드
            </p>
            <p className="text-[10.5px] font-semibold text-muted-foreground">
              JPG, PNG, PDF (최대 10MB)
            </p>
          </label>

          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {hasImage ? "재업로드" : "업로드"}
          </button>
        </form>
      </div>

      <p className="mt-4 text-[11.5px] font-medium text-muted-foreground">
        업로드된 이미지는 관리자만 열람할 수 있으며, OCR 검증에만 사용됩니다.
        OCR 실패 시에도 이미지는 저장됩니다.
      </p>
    </main>
  )
}
