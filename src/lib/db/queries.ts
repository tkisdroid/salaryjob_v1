/**
 * Prisma-backed query adapters for GigNow Phase 2.
 *
 * Each function returns objects whose shape matches the existing Job/Application/etc
 * interfaces (src/lib/types/job.ts) so that consumer pages need only change one
 * import line.
 *
 * Design decisions:
 * - Uses simple prisma.findMany({ take: 50 }) — no pagination/filtering (Phase 3).
 * - lat/lng come from Decimal columns (no $queryRaw PostGIS needed for Phase 2).
 * - Fields not in the DB schema (duties, requirements, tags, etc.) return empty
 *   arrays / defaults — Phase 3 will add these columns.
 * - distanceM always 0 for now (PostGIS distance query is Phase 3 work).
 * - settlementStatus / settledAt not in DB schema — returned as null.
 * - getCurrentWorker() uses DAL verifySession, returns null if unauthenticated
 *   (does NOT redirect — caller decides whether to redirect).
 *
 * TODO Phase 3:
 * - Add duties/requirements/tags/dressCode/whatToBring columns to Job schema
 * - Add settlementStatus/settledAt to Application schema
 * - Implement real PostGIS distance query for distanceM
 * - Add pagination / cursor-based queries
 * - Wire getCurrentWorker() to thisMonthEarnings / totalEarnings from applications
 */

import "server-only";
import { prisma } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import type {
  Job,
  Application,
  Worker,
  Business,
  Review,
  BizApplicant,
  JobCategory,
} from "@/lib/types/job";

// ============================================================================
// Internal adapter helpers
// ============================================================================

/**
 * Convert a Prisma BusinessProfile row to the Business UI shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptBusiness(b: any): Business {
  return {
    id: b.id as string,
    name: b.name as string,
    category: b.category as JobCategory,
    logo: (b.logo as string | null) ?? "🏢",
    address: b.address as string,
    addressDetail: (b.addressDetail as string | null) ?? "",
    lat: Number(b.lat),
    lng: Number(b.lng),
    rating: Number(b.rating),
    reviewCount: b.reviewCount as number,
    completionRate: b.completionRate as number,
    photos: [],
    verified: b.verified as boolean,
    description: (b.description as string | null) ?? "",
  };
}

/**
 * Convert a Prisma Job row (with business relation) to the Job UI shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptJob(j: any): Job {
  const business = adaptBusiness(j.business);
  return {
    id: j.id as string,
    businessId: j.businessId as string,
    business,
    title: j.title as string,
    category: j.category as JobCategory,
    description: j.description as string,
    // TODO Phase 3: add these columns to the DB schema
    duties: [],
    requirements: [],
    dressCode: "",
    whatToBring: [],
    hourlyPay: j.hourlyPay as number,
    transportFee: j.transportFee as number,
    workDate: (j.workDate as Date).toISOString().slice(0, 10),
    startTime: j.startTime as string,
    endTime: j.endTime as string,
    workHours: Number(j.workHours),
    headcount: j.headcount as number,
    filled: j.filled as number,
    isUrgent: j.isUrgent as boolean,
    isNew:
      j.createdAt instanceof Date
        ? Date.now() - j.createdAt.getTime() < 3 * 24 * 60 * 60 * 1000 // created within 3 days
        : false,
    distanceM: 0, // TODO Phase 3: PostGIS ST_Distance query
    appliedCount: j._count?.applications ?? 0,
    tags: [],
    nightShiftAllowance: j.nightShiftAllowance as boolean,
  };
}

/**
 * Convert a Prisma Application row (with nested job.business) to Application UI shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptApplication(a: any): Application {
  const job = adaptJob(a.job);
  return {
    id: a.id as string,
    jobId: a.jobId as string,
    job,
    status: a.status as Application["status"],
    appliedAt: (a.appliedAt as Date).toISOString(),
    checkInAt: a.checkInAt ? (a.checkInAt as Date).toISOString() : null,
    checkOutAt: a.checkOutAt ? (a.checkOutAt as Date).toISOString() : null,
    actualHours: a.actualHours !== null ? Number(a.actualHours) : null,
    earnings: (a.earnings as number | null) ?? null,
    settlementStatus: null, // TODO Phase 3: add to DB schema
    settledAt: null, // TODO Phase 3: add to DB schema
    reviewGiven: a.reviewGiven as boolean,
    reviewReceived: a.reviewReceived as boolean,
  };
}

// Job include clause (reused across queries)
const JOB_INCLUDE = {
  business: true,
  _count: { select: { applications: true } },
} as const;

// Application include clause
const APP_INCLUDE = {
  job: {
    include: {
      business: true,
      _count: { select: { applications: true } },
    },
  },
} as const;

// ============================================================================
// Job queries
// ============================================================================

/** Fetch all jobs (up to 50). Phase 3 adds filtering, sorting, pagination. */
export async function getJobs(
  opts: { limit?: number; category?: JobCategory } = {}
): Promise<Job[]> {
  const rows = await prisma.job.findMany({
    where: {
      status: "active",
      ...(opts.category ? { category: opts.category } : {}),
    },
    include: JOB_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 50,
  });
  return rows.map(adaptJob);
}

/** Fetch a single job by ID. Returns null if not found. */
export async function getJobById(id: string): Promise<Job | null> {
  const row = await prisma.job.findUnique({
    where: { id },
    include: JOB_INCLUDE,
  });
  if (!row) return null;
  return adaptJob(row);
}

/** Fetch jobs filtered by category. */
export async function getJobsByCategory(
  category: JobCategory
): Promise<Job[]> {
  return getJobs({ category });
}

/** Fetch urgent jobs (isUrgent = true). */
export async function getUrgentJobs(): Promise<Job[]> {
  const rows = await prisma.job.findMany({
    where: { isUrgent: true, status: "active" },
    include: JOB_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map(adaptJob);
}

/** Fetch jobs whose workDate is today (server-side date). */
export async function getTodayJobs(): Promise<Job[]> {
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const rows = await prisma.job.findMany({
    where: {
      status: "active",
      workDate: { gte: startOfDay, lt: endOfDay },
    },
    include: JOB_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map(adaptJob);
}

// ============================================================================
// Application queries
// ============================================================================

/**
 * Fetch all applications for the currently authenticated worker.
 * Returns [] if unauthenticated (does not redirect).
 */
export async function getApplications(): Promise<Application[]> {
  let session: { id: string } | null = null;
  try {
    session = await verifySession();
  } catch {
    // verifySession redirects on failure — this catch handles the edge case
    // where it's called outside a request context (e.g., landing page)
    return [];
  }

  const rows = await prisma.application.findMany({
    where: { workerId: session.id },
    include: APP_INCLUDE,
    orderBy: { appliedAt: "desc" },
    take: 50,
  });
  return rows.map(adaptApplication);
}

/** Fetch a single application by ID. Returns null if not found. */
export async function getApplicationById(
  id: string
): Promise<Application | null> {
  const row = await prisma.application.findUnique({
    where: { id },
    include: APP_INCLUDE,
  });
  if (!row) return null;
  return adaptApplication(row);
}

// ============================================================================
// Worker profile
// ============================================================================

/**
 * Fetch the worker profile for the current authenticated session.
 * Returns null if unauthenticated or no profile exists.
 * Does NOT redirect — callers decide on redirect behaviour.
 */
export async function getCurrentWorker(): Promise<Worker | null> {
  let session: { id: string } | null = null;
  try {
    session = await verifySession();
  } catch {
    return null;
  }

  const profile = await prisma.workerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!profile) return null;

  return {
    id: profile.id,
    name: profile.name,
    nickname: profile.nickname ?? profile.name,
    avatar: profile.avatar ?? "🙂",
    badgeLevel: profile.badgeLevel as Worker["badgeLevel"],
    rating: Number(profile.rating),
    totalJobs: profile.totalJobs,
    noShowCount: 0, // TODO Phase 3: add noShowCount column
    completionRate: profile.completionRate,
    verifiedId: false, // TODO Phase 3: add verifiedId column
    verifiedPhone: false, // TODO Phase 3: add verifiedPhone column
    preferredCategories: profile.preferredCategories as JobCategory[],
    skills: [], // TODO Phase 3: add skills column
    bio: profile.bio ?? "",
    totalEarnings: 0, // TODO Phase 3: compute from settled applications
    thisMonthEarnings: 0, // TODO Phase 3: compute from settled applications this month
  };
}

// ============================================================================
// Review queries
// ============================================================================

/**
 * Fetch all reviews for jobs (worker-to-business direction).
 * Phase 3 will add filtering by businessId.
 */
export async function getReviews(): Promise<Review[]> {
  const rows = await prisma.review.findMany({
    where: { direction: "worker_to_business" },
    include: {
      reviewer: {
        include: { workerProfile: true },
      },
      application: {
        include: {
          job: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return rows.map((r) => {
    const workerName =
      r.reviewer.workerProfile?.name ?? r.reviewer.email ?? "익명";
    const initial = workerName.charAt(0);
    const maskedName =
      workerName.length > 1
        ? `${initial}${"*".repeat(workerName.length - 1)}`
        : workerName;

    return {
      id: r.id,
      reviewerName: maskedName,
      reviewerAvatar: initial,
      rating: r.rating,
      comment: r.comment ?? "",
      createdAt: r.createdAt.toISOString(),
      jobTitle: r.application.job.title,
    } satisfies Review;
  });
}

// ============================================================================
// Biz applicant queries
// ============================================================================

/**
 * Fetch a biz-side applicant (application) for a job + worker pair.
 * Returns the BizApplicant shape used by the business review page.
 */
export async function getBizApplicantById(
  jobId: string,
  applicantId: string
): Promise<BizApplicant | null> {
  // applicantId may be an application UUID or a worker UUID — handle both
  // The biz review page routes /biz/posts/[id]/applicants/[applicantId]/review
  // In Phase 1 mock data applicantId was like "a1", "a2" — in Phase 2 it's the application.id
  const application = await prisma.application.findFirst({
    where: {
      OR: [
        { id: applicantId, jobId },
        { workerId: applicantId, jobId },
      ],
    },
    include: {
      job: true,
      worker: {
        include: { workerProfile: true },
      },
    },
  });
  if (!application) return null;

  const worker = application.worker;
  const profile = worker.workerProfile;
  const workerName = profile?.name ?? worker.email ?? "익명";

  return {
    id: application.id,
    postId: application.jobId,
    workerName,
    workerInitial: workerName.charAt(0),
    rating: Number(profile?.rating ?? 0),
    completedJobs: profile?.totalJobs ?? 0,
    completionRate: profile?.completionRate ?? 0,
    postTitle: application.job.title,
  };
}

// ============================================================================
// Business queries
// ============================================================================

/** Fetch a business profile by its ID. */
export async function getBusinessById(id: string): Promise<Business | null> {
  const row = await prisma.businessProfile.findUnique({
    where: { id },
  });
  if (!row) return null;
  return adaptBusiness(row);
}
