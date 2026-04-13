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
import { Upload, CheckCircle, AlertTriangle, ImageIcon } from 'lucide-react'

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
        <p className="text-sm text-muted-foreground">
          등록된 사업장 프로필이 없습니다. 먼저 사업장 프로필을 만들어주세요.
        </p>
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

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">사업자등록증 업로드</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          공고 등록을 위해 사업자등록증 이미지를 업로드해주세요.
          업로드된 이미지는 OCR로 자동 검증됩니다.
        </p>
      </div>

      {/* Current state indicator */}
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        {hasImage ? (
          <>
            <CheckCircle className="h-5 w-5 shrink-0 text-teal-600" />
            <div>
              <p className="text-sm font-medium text-foreground">업로드됨</p>
              <p className="text-xs text-muted-foreground">
                사업자등록증이 이미 업로드되어 있습니다. 재업로드하려면 아래 양식을 사용하세요.
              </p>
            </div>
          </>
        ) : (
          <>
            <ImageIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">미업로드</p>
              <p className="text-xs text-muted-foreground">
                아직 사업자등록증이 업로드되지 않았습니다.
              </p>
            </div>
          </>
        )}
      </div>

      {/* OCR mismatch notice — non-blocking, informational (D-33) */}
      {hasMismatch && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800">OCR 번호 불일치</p>
            <p className="text-xs text-amber-700 mt-0.5">
              이미지에서 추출한 사업자번호가 입력값(
              {formatRegNumber(business.businessRegNumber!)})과 일치하지 않습니다.
              관리자 재검토 대상으로 등록되었습니다.
            </p>
          </div>
        </div>
      )}

      {/* Image preview (if uploaded) */}
      {signedUrl && (
        <div className="mb-6">
          <p className="mb-2 text-sm font-medium text-foreground">현재 업로드된 이미지</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signedUrl}
            alt="사업자등록증"
            className="max-h-64 w-full rounded-xl border border-border object-contain bg-muted"
          />
        </div>
      )}

      {/* Upload form */}
      <form action={submitBusinessRegImage} className="space-y-4">
        {/* T-06-16: businessId passed as hidden field; action verifies ownership server-side */}
        <input type="hidden" name="businessId" value={business.id} />

        <div>
          <label
            htmlFor="biz-reg-file"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            {hasImage ? '재업로드' : '파일 선택'}
          </label>
          <input
            id="biz-reg-file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            required
            className="block w-full rounded-lg border border-border bg-background p-3 text-sm
                       file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5
                       file:text-xs file:font-medium file:text-white hover:file:bg-brand/90
                       focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            style={{ minHeight: '44px' }}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            JPG, PNG, PDF — 최대 10MB
          </p>
        </div>

        <button
          type="submit"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl
                     bg-brand text-sm font-bold text-white transition-colors
                     hover:bg-brand/90 disabled:opacity-50"
          style={{ minHeight: '44px' }}
        >
          <Upload className="h-4 w-4" />
          {hasImage ? '재업로드' : '업로드'}
        </button>
      </form>

      <p className="mt-4 text-xs text-muted-foreground">
        업로드된 이미지는 관리자만 열람할 수 있으며, OCR 검증에만 사용됩니다.
        OCR 실패 시에도 이미지는 저장됩니다.
      </p>
    </main>
  )
}
