/**
 * Phase 5 Plan 02 — Review Server Action error taxonomy.
 * Mirrors the shape of src/lib/errors/application-errors.ts (Phase 4 Plan 04-04).
 *
 * Clients can exhaustively switch on the error code; the exhaustive switch
 * below forces adding a Korean message for every new variant at compile time.
 *
 * Threat T-05-22: reviewErrorToKorean uses an exhaustive switch with user-safe
 * messages only — raw exception details never reach the client.
 */

export type ReviewErrorCode =
  | "invalid_input"
  | "not_settled"         // Application.status !== 'settled'
  | "already_reviewed"    // unique (applicationId, direction) violated (P2002)
  | "invalid_state"       // target row not found, etc.
  | "unauthorized"        // caller does not own the job (biz side ownership failure)
  | "unknown";

/**
 * Thrown inside review Server Action transaction bodies to trigger rollback and
 * carry a structured error code to the outer try/catch. Never propagated
 * to the client — the Server Action maps it to `{ success: false, error }`.
 */
export class ReviewError extends Error {
  constructor(
    public readonly code: ReviewErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ReviewError";
  }
}

/**
 * Map a review error code to its user-facing Korean message.
 * Exhaustive switch — the TypeScript compiler will error if a new
 * ReviewErrorCode variant is added without a matching case.
 */
export function reviewErrorToKorean(code: ReviewErrorCode): string {
  switch (code) {
    case "invalid_input":    return "입력값을 확인해주세요";
    case "not_settled":      return "아직 정산이 완료되지 않은 지원은 리뷰할 수 없습니다";
    case "already_reviewed": return "이미 리뷰를 작성했습니다";
    case "invalid_state":    return "리뷰를 작성할 수 없는 상태입니다";
    case "unauthorized":     return "이 지원에 대한 권한이 없습니다";
    case "unknown":          return "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요";
  }
}
