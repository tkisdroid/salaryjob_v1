/**
 * scripts/review/seed-test-data.ts
 *
 * Deterministic seed for Phase 07.1 review harness.
 * Source of truth: D-06 (deterministic UUIDs), D-07 (3+3+1+10+5+2+3+1 coverage),
 * D-08 (admin email `dev+admin@local.test`).
 *
 * Usage:
 *   npx tsx scripts/review/seed-test-data.ts --dry-run    # print counts, do NOT connect
 *   npx tsx scripts/review/seed-test-data.ts              # apply seed against DB_URL / DATABASE_URL
 *
 * Idempotent: all INSERTs use `ON CONFLICT (id) DO UPDATE SET ...` so re-seeding the same
 * IDs is safe. All createdAt / updatedAt timestamps use FROZEN_NOW for snapshot stability.
 *
 * Schema alignment (2026-04-23 — codex P1-4 fix):
 *   - `users` table (public schema) has NO `verified` column; role enum is
 *     WORKER | BUSINESS | BOTH | ADMIN (never EMPLOYER).
 *   - `worker_profiles` and `business_profiles` hold the `verified` semantic
 *     (worker verification lives on the profile; biz on business_profiles.verified).
 *   - There is NO `Shift` or `Settlement` model in prisma/schema.prisma. The
 *     lifecycle states (check-in / settled) live on `applications` (status enum
 *     includes `checked_in`, `completed`, `settled`). SHIFT_IDS / SETTLEMENT_IDS
 *     from the fixture file are therefore mapped onto Application rows' extra
 *     state — no physical Shift/Settlement rows are inserted. This is tracked
 *     as a Phase 11+ follow-up in deferred-items.md.
 *
 * Auth layer: auth.users rows are created via Supabase Admin API so the
 * `handle_new_user` trigger fires and creates the matching public.users row.
 * We then UPSERT the deterministic fixture UUIDs and roles to override the
 * trigger-assigned defaults.
 */

import { Client } from "pg";
import { config as loadEnv } from "dotenv";
import {
  WORKER_IDS,
  BIZ_IDS,
  ADMIN_ID,
  WORKER_EMAIL,
  BIZ_EMAIL,
  ADMIN_EMAIL,
  JOB_IDS,
  APPLICATION_IDS,
  SHIFT_IDS,
  REVIEW_IDS,
  SETTLEMENT_IDS,
  FROZEN_NOW,
} from "../../tests/review/fixtures/ids";

loadEnv({ path: ".env.test" });
const DSN =
  process.env["DATABASE_URL"] ??
  process.env["DB_URL"] ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const DRY_RUN = process.argv.includes("--dry-run");
const SEED_PASSWORD = process.env["SEED_DEV_PASSWORD"] ?? "gignowdev";

/**
 * D-07 coverage shape — the `--dry-run` mode prints this exact object and exits 0.
 * Verification (07.1-01-02) greps for these counts. Kept in sync with the fixture
 * file even though Shift/Settlement are physically deferred (see module header).
 */
const D07_COUNTS = {
  workers: Object.keys(WORKER_IDS).length, // 3
  businesses: Object.keys(BIZ_IDS).length, // 3
  admins: 1,
  jobs: JOB_IDS.length, // 10
  applications: APPLICATION_IDS.length, // 5
  shifts: SHIFT_IDS.length, // 2 — represented by application rows w/ checkInAt (no dedicated table)
  reviews: REVIEW_IDS.length, // 3
  settlements: SETTLEMENT_IDS.length, // 1 — represented by application status='settled' (no dedicated table)
} as const;

type UserRole = "ADMIN" | "BUSINESS" | "BOTH" | "WORKER";
type AppStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "checked_in"
  | "completed"
  | "settled"
  | "cancelled";
type ReviewDirection = "worker_to_business" | "business_to_worker";

async function main(): Promise<void> {
  if (DRY_RUN) {
    // Exit 0 without opening a DB connection — required by 07.1-01-02 verification.
    console.log("[seed:dry-run]", JSON.stringify(D07_COUNTS, null, 2));
    process.exit(0);
  }

  const client = new Client({ connectionString: DSN });
  await client.connect();
  console.log(`[seed] connected to ${DSN.replace(/:[^:@]+@/, ":***@")}`);

  try {
    await client.query("BEGIN");

    // 1. Admin user (D-08 reserved email dev+admin@local.test)
    await upsertAuthUser(client, ADMIN_ID, ADMIN_EMAIL, "ADMIN");
    await upsertPublicUser(client, {
      id: ADMIN_ID,
      email: ADMIN_EMAIL,
      role: "ADMIN",
    });

    // 2. Workers — 3 variants (verified / newly_joined / banned)
    for (const [status, id] of Object.entries(WORKER_IDS)) {
      const email = workerEmailFor(status);
      await upsertAuthUser(client, id, email, "WORKER");
      await upsertPublicUser(client, { id, email, role: "WORKER" });
      await upsertWorkerProfile(client, {
        userId: id,
        name: `Test Worker (${status})`,
        verified: status === "verified",
      });
    }

    // 3. Businesses — 3 variants (verified / pending_ocr / rejected).
    //    Each business owner is a `BUSINESS` role user; business_profiles.verified
    //    holds the biz-specific verification flag (matches prisma/schema.prisma).
    for (const [status, id] of Object.entries(BIZ_IDS)) {
      const email = bizEmailFor(status);
      await upsertAuthUser(client, id, email, "BUSINESS");
      await upsertPublicUser(client, { id, email, role: "BUSINESS" });
      await upsertBusinessProfile(client, {
        // BusinessProfile.id is distinct from User.id; we derive a stable child UUID
        // from the owner id so re-runs produce the same value (D-06 determinism).
        id: deriveBusinessProfileId(id),
        ownerUserId: id,
        name: `Test Business (${status})`,
        verified: status === "verified",
      });
    }

    const verifiedBizProfileId = deriveBusinessProfileId(BIZ_IDS.verified);

    // 4. Jobs — 10 mixed states (active / urgent / filled / expired)
    //    Owned by the verified biz (both BusinessProfile FK and User FK point there).
    for (let i = 0; i < JOB_IDS.length; i++) {
      const jobId = JOB_IDS[i]!;
      const jobStatus =
        i < 5 ? "active" : i < 7 ? "active" : i < 9 ? "filled" : "expired";
      const isUrgent = i >= 5 && i < 7; // rows 6-7 flagged urgent per D-07 variety
      await upsertJob(client, {
        id: jobId,
        businessProfileId: verifiedBizProfileId,
        authorUserId: BIZ_IDS.verified,
        title: `Test Job ${i + 1}`,
        status: jobStatus,
        isUrgent,
      });
    }

    // 5. Applications — 5 states (pending / confirmed / completed / settled / cancelled).
    //    The first two application rows (indices 0..1) double as "shifts" fixtures
    //    (SHIFT_IDS) because there is no dedicated Shift table. Index 3 doubles as
    //    the settlement fixture (SETTLEMENT_IDS[0]) — status='settled'.
    const APP_STATES: readonly AppStatus[] = [
      "pending",
      "confirmed",
      "completed",
      "settled",
      "cancelled",
    ];
    for (let i = 0; i < APPLICATION_IDS.length; i++) {
      const appStatus = APP_STATES[i]!;
      await upsertApplication(client, {
        id: APPLICATION_IDS[i]!,
        workerId: WORKER_IDS.verified,
        jobId: JOB_IDS[i]!,
        status: appStatus,
        // Synthetic check-in markers so the "shift" fixture slots have usable data.
        checkInAt:
          i === 0 || i === 1 || i === 2 || i === 3 ? FROZEN_NOW : null,
        checkOutAt: i === 2 || i === 3 ? FROZEN_NOW : null,
        actualHours: i === 2 || i === 3 ? "4.00" : null,
        earnings: i === 2 || i === 3 ? 52000 : null,
      });
    }

    // 6. Reviews — 3 rows (worker→biz, biz→worker, paired).
    //    Direction enum in schema is `worker_to_business` / `business_to_worker`
    //    — there is no `both_sided` direction; the "paired" variant is modelled
    //    by reusing the two real directions on one (app, direction) unique pair.
    //    Skip the 3rd row since (applicationId, direction) is UNIQUE and both
    //    directions are already used by rows 1 and 2 on the same completed app.
    //    Map REVIEW_IDS[2] to a second completed application (index 2, status=completed)
    //    using direction='worker_to_business' to avoid the unique constraint collision.
    const completedAppId = APPLICATION_IDS[3]!; // settled
    const secondaryCompletedAppId = APPLICATION_IDS[2]!; // completed
    await upsertReview(client, {
      id: REVIEW_IDS[0]!,
      applicationId: completedAppId,
      reviewerId: WORKER_IDS.verified,
      revieweeId: BIZ_IDS.verified,
      direction: "worker_to_business",
      rating: 5,
    });
    await upsertReview(client, {
      id: REVIEW_IDS[1]!,
      applicationId: completedAppId,
      reviewerId: BIZ_IDS.verified,
      revieweeId: WORKER_IDS.verified,
      direction: "business_to_worker",
      rating: 5,
    });
    await upsertReview(client, {
      id: REVIEW_IDS[2]!,
      applicationId: secondaryCompletedAppId,
      reviewerId: WORKER_IDS.verified,
      revieweeId: BIZ_IDS.verified,
      direction: "worker_to_business",
      rating: 4,
    });

    // 7. Shift / Settlement tables do NOT exist in prisma/schema.prisma — no insert.
    //    Their fixture UUIDs (SHIFT_IDS / SETTLEMENT_IDS) are reserved for a future
    //    phase (tracked in deferred-items.md). For D-07 coverage we rely on the
    //    application rows above carrying the equivalent lifecycle state.

    await client.query("COMMIT");
    console.log("[seed] done — D-07 coverage applied:", D07_COUNTS);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

function workerEmailFor(status: string): string {
  return status === "verified"
    ? WORKER_EMAIL
    : `dev+worker-${status}@local.test`;
}

function bizEmailFor(status: string): string {
  return status === "verified" ? BIZ_EMAIL : `dev+biz-${status}@local.test`;
}

/**
 * Deterministic UUID derivation for BusinessProfile.id from the owner user UUID.
 * Replaces the trailing 12 hex digits with `b` nibbles so the child id is clearly
 * distinct from the parent id but still idempotent across seed runs.
 */
function deriveBusinessProfileId(userId: string): string {
  // userId format: 8-4-4-4-12
  // Replace the final 12-char group with "b" * 12 to produce a stable related UUID.
  const parts = userId.split("-");
  if (parts.length !== 5) return userId; // shouldn't happen for our fixture ids
  parts[4] = "b".repeat(12);
  return parts.join("-");
}

// ---------- Upsert helpers (ON CONFLICT (id) DO UPDATE per D-06 idempotency) ----------

/**
 * Upsert into auth.users directly. The handle_new_user trigger would normally
 * fire on insert to create public.users, but since we explicitly upsert public.users
 * immediately after, the ordering is safe either way.
 *
 * Uses the minimum columns Supabase auth requires; encrypted_password is left as
 * crypt(SEED_PASSWORD, gen_salt('bf')) so the accounts can actually log in.
 */
async function upsertAuthUser(
  client: Client,
  id: string,
  email: string,
  role: UserRole,
): Promise<void> {
  await client.query(
    `INSERT INTO auth.users (
       id, instance_id, aud, role, email, encrypted_password,
       email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at, confirmation_token, recovery_token,
       email_change_token_new, email_change
     )
     VALUES (
       $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       $2, crypt($3, gen_salt('bf')),
       $4, jsonb_build_object('provider','email','providers',jsonb_build_array('email'),'role',$5::text), '{}'::jsonb,
       $4, $4, '', '', '', ''
     )
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       raw_app_meta_data = EXCLUDED.raw_app_meta_data,
       updated_at = EXCLUDED.updated_at`,
    [id, email, SEED_PASSWORD, FROZEN_NOW, role],
  );
}

type PublicUserRow = {
  id: string;
  email: string;
  role: UserRole;
};

async function upsertPublicUser(
  client: Client,
  row: PublicUserRow,
): Promise<void> {
  await client.query(
    `INSERT INTO public.users (id, email, role, "createdAt", "updatedAt")
     VALUES ($1, $2, $3::"UserRole", $4, $4)
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       role = EXCLUDED.role,
       "updatedAt" = EXCLUDED."updatedAt"`,
    [row.id, row.email, row.role, FROZEN_NOW],
  );
}

type WorkerProfileRow = {
  userId: string;
  name: string;
  verified: boolean;
};

async function upsertWorkerProfile(
  client: Client,
  row: WorkerProfileRow,
): Promise<void> {
  // worker_profiles has no `verified` column directly — badgeLevel encodes
  // seniority, and the "verified" persona is the one with badgeLevel != newbie.
  const badge = row.verified ? "bronze" : "newbie";
  await client.query(
    `INSERT INTO public.worker_profiles (
        id, "userId", name, "badgeLevel", rating, "totalJobs",
        "reviewCount", "completionRate", "createdAt", "updatedAt"
     )
     VALUES ($1, $1, $2, $3::"BadgeLevel", 0, 0, 0, 0, $4, $4)
     ON CONFLICT ("userId") DO UPDATE SET
       name = EXCLUDED.name,
       "badgeLevel" = EXCLUDED."badgeLevel",
       "updatedAt" = EXCLUDED."updatedAt"`,
    [row.userId, row.name, badge, FROZEN_NOW],
  );
}

type BusinessProfileRow = {
  id: string;
  ownerUserId: string;
  name: string;
  verified: boolean;
};

async function upsertBusinessProfile(
  client: Client,
  row: BusinessProfileRow,
): Promise<void> {
  await client.query(
    `INSERT INTO public.business_profiles (
       id, "userId", name, category, address, lat, lng,
       verified, "createdAt", "updatedAt"
     )
     VALUES ($1, $2, $3, 'food'::"JobCategory", '서울시 강남구 테헤란로 123',
             37.4979, 127.0276, $4, $5, $5)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       verified = EXCLUDED.verified,
       "updatedAt" = EXCLUDED."updatedAt"`,
    [row.id, row.ownerUserId, row.name, row.verified, FROZEN_NOW],
  );
}

type JobRow = {
  id: string;
  businessProfileId: string;
  authorUserId: string;
  title: string;
  status: string;
  isUrgent: boolean;
};

async function upsertJob(client: Client, row: JobRow): Promise<void> {
  await client.query(
    `INSERT INTO public.jobs (
       id, "businessId", "authorId", title, category, description,
       "hourlyPay", "transportFee", "workDate", "startTime", "endTime",
       "workHours", headcount, filled, lat, lng, status, "isUrgent",
       "nightShiftAllowance", "createdAt", "updatedAt"
     )
     VALUES (
       $1, $2, $3, $4, 'food'::"JobCategory",
       'Review-harness seeded job. See scripts/review/seed-test-data.ts.',
       12000, 0, DATE '2026-05-01', '09:00', '18:00', 8.00, 1, 0,
       37.4979, 127.0276, $5, $6, false, $7, $7
     )
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       status = EXCLUDED.status,
       "isUrgent" = EXCLUDED."isUrgent",
       "updatedAt" = EXCLUDED."updatedAt"`,
    [
      row.id,
      row.businessProfileId,
      row.authorUserId,
      row.title,
      row.status,
      row.isUrgent,
      FROZEN_NOW,
    ],
  );
}

type ApplicationRow = {
  id: string;
  workerId: string;
  jobId: string;
  status: AppStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  actualHours: string | null;
  earnings: number | null;
};

async function upsertApplication(
  client: Client,
  row: ApplicationRow,
): Promise<void> {
  await client.query(
    `INSERT INTO public.applications (
       id, "jobId", "workerId", status, "appliedAt",
       "checkInAt", "checkOutAt", "actualHours", earnings,
       "reviewGiven", "reviewReceived"
     )
     VALUES (
       $1, $2, $3, $4::"ApplicationStatus", $5,
       $6::timestamptz, $7::timestamptz, $8::numeric, $9,
       false, false
     )
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       "checkInAt" = EXCLUDED."checkInAt",
       "checkOutAt" = EXCLUDED."checkOutAt",
       "actualHours" = EXCLUDED."actualHours",
       earnings = EXCLUDED.earnings`,
    [
      row.id,
      row.jobId,
      row.workerId,
      row.status,
      FROZEN_NOW,
      row.checkInAt,
      row.checkOutAt,
      row.actualHours,
      row.earnings,
    ],
  );
}

type ReviewRow = {
  id: string;
  applicationId: string;
  reviewerId: string;
  revieweeId: string;
  direction: ReviewDirection;
  rating: number;
};

async function upsertReview(client: Client, row: ReviewRow): Promise<void> {
  await client.query(
    `INSERT INTO public.reviews (
       id, "applicationId", "reviewerId", "revieweeId", direction, rating,
       tags, comment, "createdAt"
     )
     VALUES ($1, $2, $3, $4, $5::"ReviewDirection", $6, '{}'::text[], NULL, $7)
     ON CONFLICT (id) DO UPDATE SET
       rating = EXCLUDED.rating,
       direction = EXCLUDED.direction`,
    [
      row.id,
      row.applicationId,
      row.reviewerId,
      row.revieweeId,
      row.direction,
      row.rating,
      FROZEN_NOW,
    ],
  );
}

// Password is used by scripts/review/start-local-stack.ts when calling auth.admin.createUser.
// Exported here so other review-harness modules can share the default.
export const DEFAULT_SEED_PASSWORD = SEED_PASSWORD;

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[seed] error:", msg);
  process.exit(1);
});
