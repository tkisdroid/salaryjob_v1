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
 * - Phase 3 (03-01) added duties/requirements/tags/dressCode/whatToBring/address
 *   columns to the Job model — adaptJob now reads them directly.
 * - distanceM always 0 for now (PostGIS distance query is 03-06 work).
 * - settlementStatus / settledAt not in DB schema — returned as null.
 * - getCurrentWorker() uses DAL verifySession, returns null if unauthenticated
 *   (does NOT redirect — caller decides whether to redirect).
 *
 * TODO Phase 3:
 * - Add settlementStatus/settledAt to Application schema
 * - Implement real PostGIS distance query for distanceM
 * - Add pagination / cursor-based queries
 * - Wire getCurrentWorker() to thisMonthEarnings / totalEarnings from applications
 */

import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { ApplicationStatus as PrismaApplicationStatus } from "@/generated/prisma/client";
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
    duties: (j.duties as string[] | null) ?? [],
    requirements: (j.requirements as string[] | null) ?? [],
    dressCode: (j.dressCode as string | null) ?? "",
    whatToBring: (j.whatToBring as string[] | null) ?? [],
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
    tags: (j.tags as string[] | null) ?? [],
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows.map((r: any) => {
    const workerName: string =
      (r.reviewer.workerProfile?.name as string | undefined) ?? (r.reviewer.email as string | null) ?? "익명";
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

// ============================================================================
// Phase 3: Worker profile read (raw Prisma row for edit form prefill)
// ============================================================================

/**
 * Fetch the raw WorkerProfile Prisma row by userId.
 * Returns null if no profile exists yet.
 * Caller is responsible for session verification — this function does NOT
 * call verifySession, unlike getCurrentWorker which adapts to the UI shape.
 *
 * Used by Phase 3 /my/profile/edit page to prefill the form.
 */
export async function getWorkerProfileByUserId(userId: string) {
  return prisma.workerProfile.findUnique({
    where: { userId },
  });
}

// ============================================================================
// Phase 3: Business profile raw-row queries (for edit form prefill)
// ============================================================================

/**
 * Fetch all BusinessProfile rows owned by a user. Supports the 1:many
 * relationship fixed in Phase 2 D-02 (admin holds multiple profiles, others
 * typically hold 1).
 *
 * Returns raw Prisma rows — caller converts Decimal to Number for UI.
 * Does NOT call verifySession — caller is responsible for session gating.
 */
export async function getBusinessProfilesByUserId(userId: string) {
  return prisma.businessProfile.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Fetch a single BusinessProfile by its own id (not userId).
 * Returns null if not found. Raw Prisma row.
 * Caller is responsible for ownership checks against session.id.
 */
export async function getBusinessProfileById(id: string) {
  return prisma.businessProfile.findUnique({
    where: { id },
  });
}

// ============================================================================
// Phase 3: Business-side job queries (POST-02)
// ============================================================================

/**
 * Fetch all jobs across a set of BusinessProfile ids. Used by /biz/posts
 * to list only the jobs owned by the current authenticated business user
 * (whose user.id may own multiple BusinessProfiles per Phase 2 D-02 1:many).
 *
 * Does NOT call verifySession — caller must gate.
 * Returns adapted Job[] (UI shape).
 *
 * Intentionally does NOT filter by status='active' — the biz dashboard must
 * show expired/filled/active jobs alike.
 */
export async function getJobsByBusinessIds(
  businessIds: string[],
): Promise<Job[]> {
  if (businessIds.length === 0) return [];
  const rows = await prisma.job.findMany({
    where: {
      businessId: { in: businessIds },
    },
    include: JOB_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(adaptJob);
}

// ============================================================================
// Phase 3 (03-06) — Cursor-based pagination + PostGIS distance sort
// ============================================================================

/**
 * Lazy filter shared by getJobsPaginated + getJobsByDistance.
 *
 * Covers the up-to-5-minute gap between pg_cron runs (03-02 migration
 * 20260411000003). The pg_cron schedule body uses the IDENTICAL expression,
 * so the lazy filter guarantees users never see a job whose
 * (workDate + startTime) has already passed — even if pg_cron has not yet
 * swept the row to status='expired'.
 *
 * Threat T-03-06-08: if this expression drifts from the cron body, job-expiry
 * tests will fail (tests/jobs/job-expiry.test.ts runs both paths).
 */
const LAZY_FILTER_SQL = Prisma.sql`
  ("workDate"::timestamp + CAST("startTime" AS time))::timestamptz > now()
`;

/**
 * Cursor format: {createdAtISO}_{uuid}
 * ISO 8601 datetime is fixed 24 chars (2026-04-10T12:00:00.000Z), then
 * underscore at position 24, then a UUID in positions 25..60.
 */
export function encodeJobCursor(job: {
  createdAt: Date | string;
  id: string;
}): string {
  const iso =
    job.createdAt instanceof Date
      ? job.createdAt.toISOString()
      : job.createdAt;
  return `${iso}_${job.id}`;
}

export function decodeJobCursor(
  cursor: string,
): { createdAt: Date; id: string } | null {
  // Minimum cursor length: 24 (ISO) + 1 (_) + 36 (uuid) = 61
  if (cursor.length < 26) return null;
  if (cursor[24] !== "_") return null;
  const iso = cursor.slice(0, 24);
  const id = cursor.slice(25);
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return { createdAt: d, id };
}

/**
 * Paginated active job list with cursor-based ordering.
 * Used by:
 *   - /          (anonymous landing page)
 *   - /home      (worker, when geolocation is unavailable / default)
 *
 * Applies LAZY_FILTER_SQL so past-dated jobs are excluded even before pg_cron
 * marks them expired. Uses $queryRaw because Prisma findMany cannot express
 * the tuple-cursor comparison + raw lazy filter in one query.
 */
export async function getJobsPaginated(opts: {
  limit: number;
  cursor?: string | null;
  category?: JobCategory;
}): Promise<{ jobs: Job[]; nextCursor: string | null }> {
  const cursor = opts.cursor ? decodeJobCursor(opts.cursor) : null;

  const categoryFilter = opts.category
    ? Prisma.sql`AND j.category = ${opts.category}::"JobCategory"`
    : Prisma.empty;

  const cursorFilter = cursor
    ? Prisma.sql`AND (j."createdAt", j.id) < (${cursor.createdAt}, ${cursor.id}::uuid)`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<RawJobRow[]>`
    SELECT
      j.id, j."businessId", j."authorId", j.title, j.category, j.description,
      j."hourlyPay", j."transportFee", j."workDate", j."startTime", j."endTime",
      j."workHours", j.headcount, j.filled, j.lat, j.lng, j.status, j."isUrgent",
      j."nightShiftAllowance", j.duties, j.requirements, j."dressCode",
      j."whatToBring", j.tags, j.address, j."addressDetail", j."createdAt",
      bp.id AS "business_id", bp.name AS "business_name", bp.category AS "business_category",
      bp.logo AS "business_logo", bp.address AS "business_address",
      bp."addressDetail" AS "business_addressDetail", bp.lat AS "business_lat",
      bp.lng AS "business_lng", bp.rating AS "business_rating",
      bp."reviewCount" AS "business_reviewCount",
      bp."completionRate" AS "business_completionRate",
      bp.verified AS "business_verified", bp.description AS "business_description",
      (SELECT COUNT(*)::int FROM public.applications a WHERE a."jobId" = j.id) AS "applied_count"
    FROM public.jobs j
    LEFT JOIN public.business_profiles bp ON j."businessId" = bp.id
    WHERE j.status = 'active'
      AND ${LAZY_FILTER_SQL}
      ${categoryFilter}
      ${cursorFilter}
    ORDER BY j."createdAt" DESC, j.id DESC
    LIMIT ${opts.limit}
  `;

  const jobs = rows.map(rawRowToJob);
  const nextCursor =
    jobs.length === opts.limit && rows.length > 0
      ? encodeJobCursor({
          createdAt: rows[rows.length - 1].createdAt,
          id: rows[rows.length - 1].id,
        })
      : null;

  return { jobs, nextCursor };
}

/**
 * PostGIS distance-sorted job list. Used on /home when the worker has
 * granted geolocation permission.
 *
 * Uses ST_DWithin + ST_Distance against the geography(Point,4326) column
 * `jobs.location`. Requires the GIST index from 03-02 migration
 * 20260411000000 for performance (without it, ST_DWithin falls back to
 * a sequential scan — still correct but slow).
 *
 * Also applies LAZY_FILTER_SQL (identical to getJobsPaginated) so past-dated
 * jobs are hidden regardless of whether pg_cron has run.
 *
 * Populates Job.distanceM with real meters from ST_Distance.
 */
export async function getJobsByDistance(opts: {
  userLat: number;
  userLng: number;
  radiusM: number;
  limit: number;
  cursor?: string | null;
  category?: JobCategory;
}): Promise<{ jobs: Job[]; nextCursor: string | null }> {
  const cursor = opts.cursor ? decodeJobCursor(opts.cursor) : null;

  const categoryFilter = opts.category
    ? Prisma.sql`AND j.category = ${opts.category}::"JobCategory"`
    : Prisma.empty;

  const cursorFilter = cursor
    ? Prisma.sql`AND (j."createdAt", j.id) < (${cursor.createdAt}, ${cursor.id}::uuid)`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<(RawJobRow & { distance_m: number })[]>`
    SELECT
      j.id, j."businessId", j."authorId", j.title, j.category, j.description,
      j."hourlyPay", j."transportFee", j."workDate", j."startTime", j."endTime",
      j."workHours", j.headcount, j.filled, j.lat, j.lng, j.status, j."isUrgent",
      j."nightShiftAllowance", j.duties, j.requirements, j."dressCode",
      j."whatToBring", j.tags, j.address, j."addressDetail", j."createdAt",
      bp.id AS "business_id", bp.name AS "business_name", bp.category AS "business_category",
      bp.logo AS "business_logo", bp.address AS "business_address",
      bp."addressDetail" AS "business_addressDetail", bp.lat AS "business_lat",
      bp.lng AS "business_lng", bp.rating AS "business_rating",
      bp."reviewCount" AS "business_reviewCount",
      bp."completionRate" AS "business_completionRate",
      bp.verified AS "business_verified", bp.description AS "business_description",
      (SELECT COUNT(*)::int FROM public.applications a WHERE a."jobId" = j.id) AS "applied_count",
      ST_Distance(
        j.location,
        ST_SetSRID(ST_MakePoint(${opts.userLng}, ${opts.userLat}), 4326)::geography
      ) AS distance_m
    FROM public.jobs j
    LEFT JOIN public.business_profiles bp ON j."businessId" = bp.id
    WHERE j.status = 'active'
      AND j.location IS NOT NULL
      AND ${LAZY_FILTER_SQL}
      AND ST_DWithin(
        j.location,
        ST_SetSRID(ST_MakePoint(${opts.userLng}, ${opts.userLat}), 4326)::geography,
        ${opts.radiusM}
      )
      ${categoryFilter}
      ${cursorFilter}
    ORDER BY distance_m ASC NULLS LAST, j."createdAt" DESC, j.id DESC
    LIMIT ${opts.limit}
  `;

  const jobs = rows.map((r) => ({
    ...rawRowToJob(r),
    distanceM: Math.round(Number(r.distance_m ?? 0)),
  }));

  const nextCursor =
    jobs.length === opts.limit && rows.length > 0
      ? encodeJobCursor({
          createdAt: rows[rows.length - 1].createdAt,
          id: rows[rows.length - 1].id,
        })
      : null;

  return { jobs, nextCursor };
}

// ----- Internal raw-row adapter (flat $queryRaw result → Job UI shape) -----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawJobRow = any;

/**
 * Converts a flat $queryRaw row (with business_* prefixed JOIN columns) to
 * the Job UI shape. Mirrors adaptJob() above but handles the flat column
 * layout produced by the raw SQL JOIN (vs. Prisma's nested include result).
 *
 * All Decimal fields (hourlyPay, transportFee, workHours, rating, lat, lng)
 * are coerced via Number() because pg driver returns them as strings.
 */
function rawRowToJob(r: RawJobRow): Job {
  const business: Business = {
    id: r.business_id as string,
    name: r.business_name as string,
    category: r.business_category as JobCategory,
    logo: (r.business_logo as string | null) ?? "🏢",
    address: r.business_address as string,
    addressDetail: (r.business_addressDetail as string | null) ?? "",
    lat: Number(r.business_lat),
    lng: Number(r.business_lng),
    rating: Number(r.business_rating),
    reviewCount: Number(r.business_reviewCount),
    completionRate: Number(r.business_completionRate),
    photos: [],
    verified: r.business_verified as boolean,
    description: (r.business_description as string | null) ?? "",
  };

  const createdAt =
    r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt);

  return {
    id: r.id as string,
    businessId: r.businessId as string,
    business,
    title: r.title as string,
    category: r.category as JobCategory,
    description: r.description as string,
    duties: (r.duties as string[] | null) ?? [],
    requirements: (r.requirements as string[] | null) ?? [],
    dressCode: (r.dressCode as string | null) ?? "",
    whatToBring: (r.whatToBring as string[] | null) ?? [],
    hourlyPay: Number(r.hourlyPay),
    transportFee: Number(r.transportFee),
    workDate: (r.workDate instanceof Date ? r.workDate : new Date(r.workDate))
      .toISOString()
      .slice(0, 10),
    startTime: r.startTime as string,
    endTime: r.endTime as string,
    workHours: Number(r.workHours),
    headcount: Number(r.headcount),
    filled: Number(r.filled),
    isUrgent: r.isUrgent as boolean,
    isNew: Date.now() - createdAt.getTime() < 3 * 24 * 60 * 60 * 1000,
    distanceM: 0,
    appliedCount: Number(r.applied_count ?? 0),
    tags: (r.tags as string[] | null) ?? [],
    nightShiftAllowance: r.nightShiftAllowance as boolean,
  };
}

// ============================================================================
// Phase 4 Plan 04 — Application bucket queries (APPL-02 / APPL-03)
// ============================================================================

/**
 * UI bucket → ApplicationStatus filter map.
 * Kept in sync with STATUS_TO_BUCKET in `src/lib/types/job.ts` — if a new
 * status is added there, add it here too (tsc will not catch the mismatch
 * automatically because this is a runtime mapping).
 */
const UPCOMING_STATUSES: PrismaApplicationStatus[] = ["pending", "confirmed"];
const ACTIVE_STATUSES: PrismaApplicationStatus[] = ["in_progress"];
// `cancelled` is intentionally excluded from the "done" bucket per list-worker
// test — only `completed` apps show in the 완료 tab. Cancelled apps stay
// visible in the UI elsewhere (notification center / history modal in Phase 5).
const DONE_STATUSES: PrismaApplicationStatus[] = ["completed"];

export type ApplicationBucket = "upcoming" | "active" | "done";

/**
 * APPL-02: Fetch a worker's applications, optionally filtered by UI bucket.
 *
 * bucket='upcoming' → pending + confirmed (대기 중, 수락됨)
 * bucket='active'   → in_progress (근무 중)
 * bucket='done'     → completed   (완료)
 * bucket=undefined  → all statuses
 *
 * Returns raw Prisma rows (not adapted to UI shape) so that the caller
 * can decide whether to adapt, aggregate earnings, etc. The tests
 * in tests/applications/list-worker.test.ts assert on `row.status` directly.
 */
export async function getApplicationsByWorker(
  workerId: string,
  opts: { bucket?: ApplicationBucket } = {},
) {
  const statusFilter =
    opts.bucket === "upcoming"
      ? { in: UPCOMING_STATUSES }
      : opts.bucket === "active"
        ? { in: ACTIVE_STATUSES }
        : opts.bucket === "done"
          ? { in: DONE_STATUSES }
          : undefined;

  return prisma.application.findMany({
    where: {
      workerId,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: {
      job: { include: { business: true } },
    },
    orderBy: { appliedAt: "desc" },
  });
}

/**
 * APPL-03: Fetch all applications for a single job (Business view).
 *
 * Returns rows shaped for the Biz applicant list UI:
 *   { id, status, appliedAt, worker: { id, name, ...profile }, workerProfile }
 *
 * Both `row.worker` (a flat object merging User + WorkerProfile basics)
 * and `row.workerProfile` (the full profile row, including rating) are
 * exposed so the /biz/posts/[id]/applicants page can render the applicant
 * card without a second query. This dual-shape is asserted by
 * tests/applications/list-biz.test.ts.
 *
 * Ordered by appliedAt ASC (FIFO fairness — Biz sees earliest applicants
 * first, matching D-04's "first-come first-served" principle).
 */
export async function getApplicationsByJob(jobId: string) {
  const rows = await prisma.application.findMany({
    where: { jobId },
    include: {
      worker: {
        include: { workerProfile: true },
      },
    },
    orderBy: { appliedAt: "asc" },
  });

  return rows.map((row) => {
    const profile = row.worker.workerProfile;
    return {
      id: row.id,
      jobId: row.jobId,
      workerId: row.workerId,
      status: row.status,
      appliedAt: row.appliedAt,
      checkInAt: row.checkInAt,
      checkOutAt: row.checkOutAt,
      // Flat worker shape used by the Biz applicant card. `name` comes from
      // WorkerProfile (the User row has no name column) — if a profile is
      // missing (shouldn't happen in production but can during tests) we
      // fall back to the user email so the UI always has something to show.
      worker: {
        id: row.worker.id,
        email: row.worker.email,
        name: profile?.name ?? row.worker.email ?? "익명",
        nickname: profile?.nickname ?? null,
        avatar: profile?.avatar ?? null,
        badgeLevel: profile?.badgeLevel ?? "newbie",
      },
      // Full profile row (including rating, completionRate, etc.) passed
      // through verbatim so the Biz side can rank/filter by these fields.
      workerProfile: profile,
    };
  });
}
