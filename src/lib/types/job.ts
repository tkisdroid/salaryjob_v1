/**
 * Shared job-related types for GigNow.
 * These are copied (not moved) from mock-data.ts so that:
 * - seed.ts and mock-data.ts continue to work unchanged
 * - Production code imports from here instead of mock-data
 *
 * Phase 3: replace remaining `distanceM` stub with real PostGIS distance query.
 */

// ============================================================================
// Enums / Unions
// ============================================================================

export type JobCategory =
  | "food"
  | "retail"
  | "logistics"
  | "office"
  | "event"
  | "cleaning"
  | "education"
  | "tech";

// ============================================================================
// Core domain interfaces (clean names)
// ============================================================================

export interface Business {
  id: string;
  name: string;
  category: JobCategory;
  logo: string;
  address: string;
  addressDetail: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  completionRate: number;
  photos: string[];
  verified: boolean;
  description: string;
}

export interface Job {
  id: string;
  businessId: string;
  business: Business;
  title: string;
  category: JobCategory;
  description: string;
  duties: string[];
  requirements: string[];
  dressCode: string;
  whatToBring: string[];
  hourlyPay: number;
  transportFee: number;
  workDate: string; // ISO date string "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  workHours: number;
  headcount: number;
  filled: number;
  isUrgent: boolean;
  isNew: boolean;
  distanceM: number; // TODO Phase 3: replace with real PostGIS distance
  appliedCount: number;
  tags: string[];
  nightShiftAllowance: boolean;
}

// Phase 4 D-01 — UI-level ApplicationStatus union.
// `checked_in` intentionally omitted from UI type — deprecated, see prisma schema comment.
// Phase 5 SETL-01: added 'settled' (new status for paid-out shifts); 'completed' kept for legacy rows.
export type ApplicationStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "settled"    // NEW Phase 5 — SETL-01
  | "completed"  // legacy — historical rows
  | "cancelled";

// UI bucket mapping — D-01, UI-SPEC 6 상태 x 색 매핑
export const STATUS_TO_BUCKET: Record<
  ApplicationStatus,
  "upcoming" | "active" | "done"
> = {
  pending: "upcoming",    // "대기 중" - auto-accept timer running
  confirmed: "upcoming",  // "수락됨"
  in_progress: "active",  // "근무 중"
  settled: "done",        // NEW Phase 5 — "정산 완료"
  completed: "done",      // legacy — "완료"
  cancelled: "done",      // "취소됨" - shown in done tab for history
};

export interface Application {
  id: string;
  jobId: string;
  job: Job;
  status: ApplicationStatus | "checked_in"; // checked_in accepted for legacy rows until Phase 5 removal
  appliedAt: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  actualHours: number | null;
  earnings: number | null;
  settlementStatus: "pending" | "settled" | null;
  settledAt: string | null;
  reviewGiven: boolean;
  reviewReceived: boolean;
}

export interface Worker {
  id: string;
  name: string;
  nickname: string;
  avatar: string;
  badgeLevel: "newbie" | "bronze" | "silver" | "gold" | "platinum" | "diamond";
  rating: number;
  totalJobs: number;
  noShowCount: number;
  completionRate: number;
  verifiedId: boolean;
  verifiedPhone: boolean;
  preferredCategories: JobCategory[];
  skills: string[];
  bio: string;
  totalEarnings: number;
  thisMonthEarnings: number;
}

export interface Review {
  id: string;
  reviewerName: string;
  reviewerAvatar: string;
  rating: number;
  comment: string;
  createdAt: string;
  jobTitle: string;
}

export interface BizApplicant {
  id: string;
  postId: string;
  workerName: string;
  workerInitial: string;
  rating: number;
  completedJobs: number;
  completionRate: number;
  postTitle: string;
}

// ============================================================================
// Backward-compat aliases (allow consumer files to still reference Mock* names)
// ============================================================================

export type MockJob = Job;
export type MockApplication = Application;
export type MockWorker = Worker;
export type MockBusiness = Business;
export type MockReview = Review;
export type MockBizApplicant = BizApplicant;
