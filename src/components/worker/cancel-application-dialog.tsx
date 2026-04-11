"use client";

import { cloneElement, isValidElement, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cancelApplication } from "@/app/(worker)/my/applications/actions";
import { applicationErrorToKorean } from "@/lib/errors/application-errors";

/**
 * Phase 4 Plan 04-08 — CancelApplicationDialog.
 *
 * Worker-side confirmation surface around `cancelApplication` Server Action.
 * Enforces the D-21 24-hour free-cancel rule client-side: if the shift is
 * starting within 24 hours the dialog surfaces a no-show penalty warning
 * and passes `acknowledgedNoShowRisk: true` on confirm. The server-side
 * action re-validates the same rule (threat-model T-04-46), so the client
 * gate is UX polish, not a security boundary.
 *
 * The dialog uses `@base-ui/react/alert-dialog` primitives — `sonner` is
 * not installed in this project, so success / error feedback is rendered
 * inline inside the dialog body and the dialog auto-closes on success.
 * router.refresh() is called after success so the parent list re-fetches.
 */

type Props = {
  applicationId: string;
  /** Shift start datetime — used for the client-side 24h check. */
  workDateStartAt: Date;
  /**
   * The element that opens the dialog. Must be a real `<button>` element so
   * BaseUI's AlertDialog.Trigger can merge its native button semantics onto
   * it. Passing a non-button element triggers BaseUI's nativeButton warning.
   */
  trigger: ReactElement;
};

type Phase = "idle" | "pending" | "success" | "error";

export function CancelApplicationDialog({
  applicationId,
  workDateStartAt,
  trigger,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [noShowCounted, setNoShowCounted] = useState(false);

  const now = new Date();
  const hoursUntilStart =
    (workDateStartAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isLate = hoursUntilStart < 24;

  function resetAndClose(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      // Delay reset so the exit animation doesn't flash the idle copy.
      setTimeout(() => {
        setPhase("idle");
        setMessage(null);
        setNoShowCounted(false);
      }, 200);
    }
  }

  async function handleConfirm() {
    setPhase("pending");
    setMessage(null);
    const result = await cancelApplication(applicationId, {
      acknowledgedNoShowRisk: isLate,
    });
    if (result.success) {
      setNoShowCounted(result.noShowCounted);
      setMessage(
        result.noShowCounted
          ? "취소되었습니다. 노쇼 1회가 기록됩니다."
          : "취소되었습니다",
      );
      setPhase("success");
      router.refresh();
      // Auto-close after short delay so the worker sees the confirmation.
      setTimeout(() => {
        resetAndClose(false);
      }, 1500);
    } else {
      setMessage(applicationErrorToKorean(result.error));
      setPhase("error");
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={resetAndClose}>
      <AlertDialog.Trigger
        render={(props) =>
          isValidElement(trigger)
            ? cloneElement(
                trigger as ReactElement<Record<string, unknown>>,
                props as Record<string, unknown>,
              )
            : (trigger as ReactElement)
        }
      />
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-6 shadow-2xl">
          {phase === "success" ? (
            <div className="flex flex-col items-center text-center py-2">
              <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-brand" />
              </div>
              <p className="font-bold text-sm mb-1">
                {noShowCounted ? "취소 완료 (노쇼 기록)" : "취소 완료"}
              </p>
              <p className="text-xs text-muted-foreground">{message}</p>
            </div>
          ) : phase === "error" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">취소할 수 없습니다</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {message}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <AlertDialog.Close
                  render={(props) => (
                    <button
                      {...props}
                      type="button"
                      className="h-9 px-4 rounded-lg border border-border text-xs font-medium hover:bg-muted"
                    >
                      닫기
                    </button>
                  )}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-full ${isLate ? "bg-amber-500/10" : "bg-muted"} flex items-center justify-center shrink-0`}
                >
                  <AlertTriangle
                    className={`w-5 h-5 ${isLate ? "text-amber-600" : "text-muted-foreground"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <AlertDialog.Title className="font-bold text-sm">
                    {isLate
                      ? "지금 취소하면 노쇼가 기록됩니다"
                      : "지원을 취소하시겠어요?"}
                  </AlertDialog.Title>
                  <AlertDialog.Description className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {isLate
                      ? "근무 24시간 전이 지나 무료 취소가 불가합니다. 취소 시 노쇼 1회가 기록되며 완료율이 감소합니다."
                      : "근무 24시간 전까지 무료로 취소할 수 있습니다."}
                  </AlertDialog.Description>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <AlertDialog.Close
                  disabled={phase === "pending"}
                  render={(props) => (
                    <button
                      {...props}
                      type="button"
                      className="h-9 px-4 rounded-lg border border-border text-xs font-medium hover:bg-muted disabled:opacity-50"
                    >
                      돌아가기
                    </button>
                  )}
                />
                <button
                  type="button"
                  disabled={phase === "pending"}
                  onClick={handleConfirm}
                  className={`h-9 px-4 rounded-lg text-xs font-bold text-white disabled:opacity-50 ${isLate ? "bg-amber-600 hover:bg-amber-700" : "bg-destructive hover:bg-destructive/90"}`}
                >
                  {phase === "pending"
                    ? "처리 중..."
                    : isLate
                      ? "노쇼 수락하고 취소"
                      : "취소하기"}
                </button>
              </div>
            </div>
          )}
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
