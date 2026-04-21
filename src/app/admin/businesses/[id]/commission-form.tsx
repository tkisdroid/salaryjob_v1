"use client"

import { useActionState } from "react"
import { updateCommissionRate } from "./actions"

type UpdateCommissionResult =
  | { ok: true }
  | { error: string; fieldErrors?: Record<string, string[]> }

interface CommissionFormProps {
  businessId: string
  currentRate: string | null
  envDefault: string
  effectiveRate: string
  isOverride: boolean
}

export default function CommissionForm({
  businessId,
  currentRate,
  envDefault,
  effectiveRate,
  isOverride,
}: CommissionFormProps) {
  const [state, formAction, isPending] = useActionState<
    UpdateCommissionResult | null,
    FormData
  >(updateCommissionRate, null)

  return (
    <div className="space-y-4">
      {/* Current effective rate display */}
      <div className="rounded-[14px] border border-border-soft bg-[color-mix(in_oklch,var(--brand)_6%,var(--surface))] p-4">
        <p className="text-[13px] font-semibold text-ink">
          현재 적용 수수료율:{" "}
          <span className="tabnum text-[16px] font-extrabold tracking-tight text-brand-deep">
            {effectiveRate}%
          </span>
        </p>
        <p className="mt-1 text-[11.5px] font-medium text-muted-foreground">
          {isOverride
            ? `관리자 설정값 (플랫폼 기본값: ${envDefault}%)`
            : `플랫폼 기본값 (PLATFORM_DEFAULT_COMMISSION_RATE=${envDefault}%)`}
        </p>
      </div>

      {/* Commission edit form */}
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="businessId" value={businessId} />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="rate"
            className="text-[12.5px] font-bold tracking-tight text-ink"
          >
            수수료율 변경 (%)
          </label>
          <p className="text-[11.5px] font-medium text-text-subtle">
            0–100 사이의 값, 소수점 둘째 자리까지 허용. 비워두면 플랫폼
            기본값으로 초기화됩니다.
          </p>
          <input
            id="rate"
            name="rate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={currentRate ?? ""}
            placeholder={`기본값 (${envDefault}%)`}
            className="tabnum h-11 w-full max-w-xs rounded-[14px] border border-border bg-surface px-3.5 text-[14px] text-ink outline-none transition-colors placeholder:text-text-subtle focus:border-ink"
            aria-label="수수료율"
          />
          {state && "error" in state && state.fieldErrors?.rate && (
            <p className="text-[12px] font-semibold text-destructive">
              {state.fieldErrors.rate[0]}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-[13px] font-bold text-white transition-all hover:bg-black hover:shadow-soft-dark disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "수수료율 저장"}
        </button>

        {/* Feedback messages */}
        {state && "ok" in state && state.ok && (
          <p className="text-[13px] font-semibold text-green-600">
            수수료율이 저장되었습니다
          </p>
        )}
        {state && "error" in state && !state.fieldErrors?.rate && (
          <p className="text-[13px] font-semibold text-destructive">
            {state.error}
          </p>
        )}
      </form>
    </div>
  )
}
