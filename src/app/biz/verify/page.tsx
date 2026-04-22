/**
 * /biz/verify — 사업자등록증 업로드 페이지
 *
 * D-31: Gate before first job post — redirected here when businessRegImageUrl is null.
 * D-32: Uploads documents to business-reg-docs bucket, then enqueues Gemini OCR.
 * D-33: OCR failure/mismatch is non-blocking — image is always saved.
 *
 * This is a Server Component. The upload form POSTs to the uploadBusinessRegImage
 * Server Action. No mock data — all state comes from the DB via requireBusiness().
 */

import { requireBusiness } from '@/lib/dal'
import { prisma } from '@/lib/db'
import { createSignedBusinessRegUrl } from '@/lib/supabase/storage-biz-reg'
import { formatRegNumber } from '@/lib/validations/business'
import { UploadBizRegClient } from '@/components/biz/upload-biz-reg-client'
import {
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  ImageIcon,
  ShieldCheck,
} from 'lucide-react'

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

  // Generate a signed URL for preview if a file is already uploaded
  const signedUrl = business.businessRegImageUrl
    ? await createSignedBusinessRegUrl(business.businessRegImageUrl)
    : null

  const hasImage = Boolean(business.businessRegImageUrl)
  const isPdf = business.businessRegImageUrl?.toLowerCase().endsWith('.pdf') ?? false
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

      {/* File preview */}
      {hasImage && (
        <div className="mb-5">
          <p className="mb-2 text-[11.5px] font-bold tracking-tight text-muted-foreground">
            현재 업로드된 파일
          </p>
          {signedUrl ? (
            isPdf ? (
              <>
                <object
                  data={signedUrl}
                  type="application/pdf"
                  className="h-[420px] w-full rounded-[22px] border border-border-soft bg-surface-2"
                >
                  <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 p-6 text-center">
                    <p className="text-[12px] font-semibold text-muted-foreground">
                      PDF 미리보기를 표시할 수 없습니다.
                    </p>
                    <a
                      href={signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-surface px-3 py-2 text-[12px] font-extrabold tracking-tight text-brand-deep transition-colors hover:bg-[color-mix(in_oklch,var(--brand)_10%,var(--surface))]"
                    >
                      <ExternalLink className="h-4 w-4" />
                      PDF 새 창에서 열기
                    </a>
                  </div>
                </object>
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-[11.5px] font-semibold text-brand-deep"
                >
                  <ExternalLink className="h-4 w-4" />
                  새 창에서 PDF 열기
                </a>
              </>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={signedUrl}
                alt="사업자등록증"
                className="max-h-64 w-full rounded-[22px] border border-border-soft bg-surface-2 object-contain"
              />
            )
          ) : (
            <div className="flex min-h-[160px] items-center justify-center rounded-[22px] border border-dashed border-border-soft bg-surface-2 px-4 py-6 text-center">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-[12px] font-extrabold tracking-tight text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  미리보기 URL을 생성하지 못했습니다.
                </div>
                <p className="text-[11px] font-medium text-muted-foreground">
                  파일은 업로드되었지만 보안 URL 생성이 실패했습니다. 잠시
                  후 페이지를 새로고침해 보세요.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload form - Extracted to Client Component */}
      <UploadBizRegClient businessId={business.id} hasImage={hasImage} />

      <p className="mt-4 text-[11.5px] font-medium text-muted-foreground">
        업로드된 파일은 관리자만 열람할 수 있으며, OCR 검증에만 사용됩니다.
        OCR은 업로드 직후 백그라운드로 진행되며, 실패 시에도 파일은 저장됩니다.
      </p>
    </main>
  )
}
