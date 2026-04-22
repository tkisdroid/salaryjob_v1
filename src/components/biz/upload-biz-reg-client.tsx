'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, ImageIcon, Loader2 } from 'lucide-react'
import { uploadBusinessRegImage } from '@/app/biz/verify/actions'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf']

function mapActionError(code: string): string {
  switch (code) {
    case 'file_missing':
      return '파일을 선택해주세요.'
    case 'business_id_missing':
      return '사업장 정보를 불러오지 못했습니다. 페이지를 새로고침해주세요.'
    case 'business_not_found':
      return '본인 소유의 사업장만 인증할 수 있습니다.'
    case 'unsupported_mime':
      return '지원하지 않는 파일 형식입니다. JPG, PNG, PDF 만 가능합니다.'
    case 'too_large':
      return '파일이 너무 큽니다. 10MB 이하로 올려주세요.'
    default:
      // Supabase storage error messages surface here (RLS, bucket missing, etc.)
      return `업로드 실패: ${code}`
  }
}

export function UploadBizRegClient({
  businessId,
  hasImage,
}: {
  businessId: string
  hasImage: boolean
}) {
  const [isUploading, setIsUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[upload-biz-reg] onChange fired', {
      filesLen: e.target.files?.length,
      firstName: e.target.files?.[0]?.name,
      firstType: e.target.files?.[0]?.type,
      firstSize: e.target.files?.[0]?.size,
    })
    const files = e.target.files
    if (!files || files.length === 0) {
      console.log('[upload-biz-reg] no files, abort')
      return
    }
    if (!formRef.current) {
      console.log('[upload-biz-reg] formRef missing, abort')
      return
    }

    const file = files[0]

    setErrorMsg(null)
    setSuccessMsg(null)

    // Pre-flight checks — fail fast before sending bytes to the server.
    if (!ALLOWED_MIME.includes(file.type)) {
      console.log('[upload-biz-reg] pre-flight MIME reject', file.type)
      setErrorMsg('지원하지 않는 파일 형식입니다. JPG, PNG, PDF 만 가능합니다.')
      if (formRef.current) formRef.current.reset()
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      console.log('[upload-biz-reg] pre-flight size reject', file.size)
      setErrorMsg('파일이 너무 큽니다. 10MB 이하로 올려주세요.')
      if (formRef.current) formRef.current.reset()
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData(formRef.current)
      console.log('[upload-biz-reg] calling action')
      const result = await uploadBusinessRegImage(formData)
      console.log('[upload-biz-reg] action returned', result)

      if (!result.ok) {
        setErrorMsg(mapActionError(result.error))
        return
      }

      if (result.ocr === 'queued') {
        setSuccessMsg(
          '업로드 완료. OCR은 백그라운드에서 진행 중입니다. 잠시 후 반영됩니다.',
        )
      } else if (result.ocrSkipReason === 'missing_api_key') {
        setSuccessMsg(
          '업로드 완료. OCR 설정이 없어 OCR 자동 반영은 관리자 검토 후 진행됩니다.',
        )
      } else {
        setSuccessMsg('업로드 완료. 인증 상태는 관리자 검토 후 반영됩니다.')
      }

      console.log('[upload-biz-reg] calling router.refresh()')
      router.refresh()
      if (result.ocr === 'queued') {
        window.setTimeout(() => {
          router.refresh()
        }, 3000)
      }
    } catch (err) {
      console.error('[upload-biz-reg] upload threw:', err)
      setErrorMsg('업로드 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsUploading(false)
      if (formRef.current) formRef.current.reset()
    }
  }

  return (
    <div className="rounded-[22px] border border-border-soft bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <Upload className="h-[18px] w-[18px] text-brand-deep" />
        <h2 className="text-[14px] font-extrabold tracking-tight text-ink">
          사업자등록증 업로드
        </h2>
      </div>

      <form ref={formRef}>
        <input type="hidden" name="businessId" value={businessId} />

        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[18px] border-2 border-dashed p-10 transition-all ${
            isUploading
              ? 'cursor-not-allowed border-brand bg-[color-mix(in_oklch,var(--brand)_6%,var(--surface))]'
              : 'border-border bg-surface-2/60 hover:border-ink hover:bg-[color-mix(in_oklch,var(--brand)_6%,var(--surface))]'
          }`}
        >
          <input
            name="file"
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />

          {isUploading ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-brand-deep" />
              <p className="text-center text-[14px] font-extrabold tracking-tight text-ink">
                업로드 중...
              </p>
              <p className="text-[11px] font-semibold text-brand-deep">
                잠시만 기다려주세요
              </p>
            </>
          ) : (
            <>
              <ImageIcon className="h-10 w-10 text-text-subtle" />
              <p className="text-[14px] font-extrabold tracking-tight text-ink">
                파일을 클릭하여 첨부 (자동 업로드)
              </p>
              <p className="text-[10.5px] font-semibold text-muted-foreground">
                JPG, PNG, PDF (최대 10MB)
              </p>
            </>
          )}
        </label>
      </form>

      {errorMsg && (
        <p className="mt-3 text-center text-[12px] font-semibold text-red-500">
          {errorMsg}
        </p>
      )}

      {successMsg && !errorMsg && (
        <p className="mt-3 text-center text-[12px] font-semibold text-brand-deep">
          {successMsg}
        </p>
      )}

      {hasImage && !isUploading && !errorMsg && !successMsg && (
        <p className="mt-3 text-center text-[12px] font-semibold text-brand-deep">
          이미 업로드된 파일이 있습니다. 다시 첨부하면 교체됩니다.
        </p>
      )}
    </div>
  )
}
