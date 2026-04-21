"use client"

import { useActionState } from "react"
import { updateBusinessVerification } from "@/lib/actions/admin-actions"

type VerifyResult = { ok: true } | { error: string }

interface VerifyActionsPanelProps {
  businessId: string
  currentVerified: boolean
}

export default function VerifyActionsPanel({
  businessId,
  currentVerified,
}: VerifyActionsPanelProps) {
  const [state, formAction, isPending] = useActionState<
    VerifyResult | null,
    FormData
  >(updateBusinessVerification, null)

  return (
    <div className="space-y-3">
      {/* Current verification status badge */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-[6px] px-2 py-1 text-[10px] font-extrabold tracking-tight ${
            currentVerified
              ? "bg-brand text-ink"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {currentVerified ? "인증됨" : "미인증"}
        </span>
        <span className="text-[11.5px] font-medium text-muted-foreground">
          현재 인증 상태
        </span>
      </div>

      {/* Approve / Reject forms side by side */}
      <div className="flex flex-wrap gap-3">
        <form action={formAction}>
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="action" value="approve" />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-11 items-center rounded-full bg-brand px-5 text-[13px] font-bold text-ink transition-all hover:shadow-soft-sm disabled:opacity-50"
          >
            인증 승인
          </button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="action" value="reject" />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-11 items-center rounded-full bg-destructive/10 px-5 text-[13px] font-bold text-destructive transition-all hover:bg-destructive/20 disabled:opacity-50"
          >
            인증 반려
          </button>
        </form>
      </div>

      {/* Feedback */}
      {state && "ok" in state && state.ok && (
        <p className="text-[13px] font-semibold text-green-600">
          인증 상태가 변경되었습니다
        </p>
      )}
      {state && "error" in state && (
        <p className="text-[13px] font-semibold text-destructive">
          {state.error}
        </p>
      )}
    </div>
  )
}
