"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Dialog } from "@base-ui/react/dialog";
import { QrCode, X } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { generateCheckoutQrToken } from "@/app/biz/posts/[id]/actions";
import { applicationErrorToKorean } from "@/lib/errors/application-errors";
import type { ApplicationErrorCode } from "@/lib/errors/application-errors";

/**
 * Phase 4 Plan 04-09 — CheckoutQrModal.
 *
 * Business-side modal that mints a checkout JWT via `generateCheckoutQrToken`
 * (Plan 04-05) and renders it as a QR SVG for Workers to scan at shift end.
 *
 * Behavior:
 *  - On open: call `generateCheckoutQrToken(jobId)` and render the returned
 *    token as an SVG via the `qrcode` library.
 *  - Countdown: 10-minute TTL per D-15. UI shows mm:ss and a progress bar.
 *  - Auto-regenerate: 10 seconds before expiry, re-mint the token so the
 *    Business doesn't stare at an expired QR.
 *  - On close: cleanup refs, drop the token, and let the next open fetch fresh.
 *
 * Security notes (threat register):
 *  - T-04-53 (XSS via QR SVG): the `qrcode` library outputs a fixed
 *    vocabulary SVG (<svg><path d="..."/>), not user-controlled strings, so
 *    `dangerouslySetInnerHTML` is safe for this specific input.
 *  - T-04-54 (token leak): 10-minute TTL + nonce + server-side ownership
 *    gate in checkOut constrain the replay window.
 *  - T-04-56 (DoS via modal spam): Plan 04-05 rate-limits to 1 token / 30s
 *    per Biz user; we surface `rate_limited` as a Korean toast.
 */

type Props = {
  jobId: string;
  /** Element that opens the dialog (e.g. the "퇴근 QR 열기" button). */
  trigger: ReactNode;
};

const TOKEN_LIFETIME_MS = 10 * 60 * 1000; // 10 minutes per D-15
const REGENERATE_BEFORE_EXPIRY_MS = 10 * 1000; // regenerate 10s before expiry

export function CheckoutQrModal({ jobId, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [msLeft, setMsLeft] = useState<number>(TOKEN_LIFETIME_MS);
  // Guard against re-entrancy: while a regenerate is in-flight, don't
  // schedule another one (the countdown tick will still fire).
  const regenerateInflightRef = useRef(false);

  const fetchNewToken = useCallback(async () => {
    if (regenerateInflightRef.current) return;
    regenerateInflightRef.current = true;
    setLoading(true);
    try {
      const result = await generateCheckoutQrToken(jobId);
      if (!result.success) {
        toast.error(
          applicationErrorToKorean(
            result.error as ApplicationErrorCode,
          ),
        );
        return;
      }
      const QRCode = await import("qrcode");
      const svgString = await QRCode.toString(result.token, {
        type: "svg",
        width: 280,
        margin: 2,
      });
      setSvg(svgString);
      setExpiresAtMs(new Date(result.expiresAt).getTime());
    } catch (e) {
      console.error("[checkout-qr-modal] QR generation failed", e);
      toast.error("QR 코드 생성에 실패했습니다");
    } finally {
      setLoading(false);
      regenerateInflightRef.current = false;
    }
  }, [jobId]);

  // On open → fetch initial token; on close → cleanup state.
  useEffect(() => {
    if (open && !svg) {
      void fetchNewToken();
    }
    if (!open) {
      setSvg(null);
      setExpiresAtMs(null);
      setMsLeft(TOKEN_LIFETIME_MS);
    }
  }, [open, svg, fetchNewToken]);

  // Countdown + auto-regenerate loop.
  useEffect(() => {
    if (!open || expiresAtMs == null) return;
    function tick() {
      const remaining = Math.max(0, expiresAtMs! - Date.now());
      setMsLeft(remaining);
      if (remaining <= REGENERATE_BEFORE_EXPIRY_MS) {
        void fetchNewToken();
      }
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [open, expiresAtMs, fetchNewToken]);

  const minutes = Math.floor(msLeft / 60000);
  const seconds = Math.floor((msLeft % 60000) / 1000);
  const pctLeft =
    expiresAtMs != null
      ? Math.max(0, (msLeft / TOKEN_LIFETIME_MS) * 100)
      : 100;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger render={(props) => <span {...props}>{trigger}</span>} />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-6 shadow-2xl">
          <div className="flex items-start justify-between mb-3">
            <div>
              <Dialog.Title className="font-bold text-base flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-brand" />
                퇴근 QR 코드
              </Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Worker가 이 QR을 스캔하면 체크아웃이 완료됩니다. 10분마다
                자동으로 갱신됩니다.
              </Dialog.Description>
            </div>
            <Dialog.Close
              render={(props) => (
                <button
                  {...props}
                  type="button"
                  aria-label="닫기"
                  className="p-1 -m-1 rounded-md hover:bg-muted text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            />
          </div>

          <div className="flex flex-col items-center gap-4 py-2">
            {loading && !svg && (
              <div className="h-[280px] w-[280px] rounded-lg border border-dashed border-border flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  QR 생성 중...
                </p>
              </div>
            )}
            {svg && (
              <>
                {/* QRCode.toString returns a sanitized SVG string derived
                    from fixed-vocabulary bitmap output — no user input is
                    interpolated into the SVG source, so dangerouslySetInnerHTML
                    is safe for this specific case (T-04-53 mitigation). */}
                <div
                  role="img"
                  aria-label="체크아웃 QR 코드"
                  className="rounded-lg border border-border p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
                <div className="w-full">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>남은 시간</span>
                    <span className="tabular-nums font-mono">
                      {String(minutes).padStart(2, "0")}:
                      {String(seconds).padStart(2, "0")}
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round(pctLeft)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="QR 만료 타이머"
                  >
                    <div
                      className="h-full bg-teal transition-[width] duration-500 ease-linear"
                      style={{ width: `${pctLeft}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
