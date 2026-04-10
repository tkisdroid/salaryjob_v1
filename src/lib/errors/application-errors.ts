/**
 * Phase 4 — Application lifecycle error taxonomy.
 *
 * Canonical source of Server Action failure codes for the apply → confirm →
 * check-in → check-out flow. Server Actions throw `ApplicationError(code)`
 * and callers pattern-match on the `code` string (stable machine-readable value)
 * while the UI renders the Korean string from `applicationErrorToKorean`.
 *
 * NOTE: This file is also authored by Plan 04-04 (application-actions) with
 * identical content. Duplication is intentional — Wave 3 plans run in parallel
 * worktrees and Plan 04-05 must not block on 04-04. Merge will see the same
 * bytes on both branches and resolve cleanly.
 */

export type ApplicationErrorCode =
  | "job_full"
  | "already_applied"
  | "job_not_active"
  | "application_not_found"
  | "application_not_owned"
  | "job_not_owned"
  | "invalid_state"
  | "cancel_too_late"
  | "check_in_time_window"
  | "check_in_geofence"
  | "check_out_time_window"
  | "check_out_qr_invalid"
  | "check_out_qr_expired"
  | "unknown";

export class ApplicationError extends Error {
  constructor(
    public readonly code: ApplicationErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ApplicationError";
  }
}

export function applicationErrorToKorean(code: ApplicationErrorCode): string {
  switch (code) {
    case "job_full":
      return "이미 마감된 공고입니다";
    case "already_applied":
      return "이미 지원하신 공고입니다";
    case "job_not_active":
      return "현재 지원할 수 없는 공고입니다";
    case "application_not_found":
      return "지원 내역을 찾을 수 없습니다";
    case "application_not_owned":
      return "본인의 지원만 수정할 수 있습니다";
    case "job_not_owned":
      return "본인의 공고만 관리할 수 있습니다";
    case "invalid_state":
      return "현재 상태에서 수행할 수 없는 작업입니다";
    case "cancel_too_late":
      return "근무 24시간 전이 지나 무료 취소할 수 없습니다";
    case "check_in_time_window":
      return "체크인 가능 시간이 아닙니다 (시작 10분 전 ~ 30분 후)";
    case "check_in_geofence":
      return "현장에 도착한 뒤 다시 시도해주세요";
    case "check_out_time_window":
      return "체크아웃 가능 시간이 아닙니다";
    case "check_out_qr_invalid":
      return "QR 코드가 유효하지 않습니다. Business에게 QR을 다시 열어달라고 요청하세요";
    case "check_out_qr_expired":
      return "QR 코드가 만료되었습니다. Business에게 QR을 다시 열어달라고 요청하세요";
    case "unknown":
      return "알 수 없는 오류가 발생했습니다";
  }
}
