export type UserRole = "WORKER" | "EMPLOYER" | "BOTH" | "ADMIN"
export type PostType = "JOB_OFFER" | "JOB_SEEK" | "FREE"
export type ApplicationStatus = "PENDING" | "VIEWED" | "SHORTLISTED" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | "COMPLETED" | "NO_SHOW" | "DISPUTED"
export type SettlementStatus = "CHECKOUT_PENDING" | "APPROVED" | "AUTO_APPROVED" | "PROCESSING" | "SETTLED" | "RETRY_1" | "RETRY_2" | "RETRY_3" | "FAILED"
export type VerificationStatus = "PENDING" | "PROCESSING" | "VERIFIED" | "REJECTED_CLOSED" | "REJECTED_MISMATCH" | "SUSPENDED" | "EXPIRED"

// UI-specific types
export interface NavItem {
  readonly href: string
  readonly icon: string
  readonly label: string
  readonly isFab?: boolean
}

export interface Category {
  readonly id: string
  readonly label: string
  readonly color: string
  readonly icon: string
}
