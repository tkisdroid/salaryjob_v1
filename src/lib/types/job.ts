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

export interface Application {
  id: string;
  jobId: string;
  job: Job;
  status:
    | "confirmed"
    | "in_progress"
    | "checked_in"
    | "completed"
    | "cancelled";
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
