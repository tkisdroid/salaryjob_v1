/**
 * scripts/review/seed-test-data.ts
 *
 * Deterministic seed for Phase 07.1 review harness.
 * Source of truth: D-06 (deterministic UUIDs), D-07 (3+3+1+10+5+2+3+1 coverage),
 * D-08 (admin email `dev+admin@local.test`).
 *
 * Usage:
 *   npx tsx scripts/review/seed-test-data.ts --dry-run    # print counts, do NOT connect
 *   npx tsx scripts/review/seed-test-data.ts              # apply seed against DB_URL
 *
 * Idempotent: all INSERTs use `ON CONFLICT (id) DO UPDATE SET ...` so re-seeding the same
 * IDs is safe. All createdAt / updatedAt timestamps use FROZEN_NOW for snapshot stability.
 *
 * Column names are sourced from prisma/schema.prisma (READ ONLY — D-20 denylist).
 * The INSERT shape uses the minimum set of NOT NULL columns known to be present; if schema
 * evolves and adds required columns, this seed will fail at INSERT time — amend alongside
 * the migration that introduced the change.
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
  process.env["DB_URL"] ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const DRY_RUN = process.argv.includes("--dry-run");
const SEED_PASSWORD = process.env["SEED_DEV_PASSWORD"] ?? "gignowdev";

/**
 * D-07 coverage shape — the `--dry-run` mode prints this exact object and exits 0.
 * Verification (07.1-01-02) greps for these counts.
 */
const D07_COUNTS = {
  workers: Object.keys(WORKER_IDS).length, // 3
  businesses: Object.keys(BIZ_IDS).length, // 3
  admins: 1,
  jobs: JOB_IDS.length, // 10
  applications: APPLICATION_IDS.length, // 5
  shifts: SHIFT_IDS.length, // 2
  reviews: REVIEW_IDS.length, // 3
  settlements: SETTLEMENT_IDS.length, // 1
} as const;

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
    await upsertUser(client, {
      id: ADMIN_ID,
      email: ADMIN_EMAIL,
      role: "ADMIN",
      verified: true,
    });

    // 2. Workers — 3 variants (verified / newly_joined / banned)
    for (const [status, id] of Object.entries(WORKER_IDS)) {
      await upsertUser(client, {
        id,
        email: workerEmailFor(status),
        role: "WORKER",
        verified: status === "verified",
      });
    }

    // 3. Businesses — 3 variants (verified / pending_ocr / rejected)
    for (const [status, id] of Object.entries(BIZ_IDS)) {
      await upsertUser(client, {
        id,
        email: bizEmailFor(status),
        role: "EMPLOYER",
        verified: status === "verified",
      });
    }

    // 4. Jobs — 10 mixed states (active / urgent / filled / expired)
    //    Owned by the verified biz.
    for (let i = 0; i < JOB_IDS.length; i++) {
      const jobId = JOB_IDS[i]!;
      const status =
        i < 5 ? "active" : i < 7 ? "urgent" : i < 9 ? "filled" : "expired";
      await upsertJob(client, {
        id: jobId,
        employerId: BIZ_IDS.verified,
        status,
      });
    }

    // 5. Applications — 5 states (pending / accepted / rejected / completed / cancelled)
    const APP_STATES = [
      "pending",
      "accepted",
      "rejected",
      "completed",
      "cancelled",
    ] as const;
    for (let i = 0; i < APPLICATION_IDS.length; i++) {
      await upsertApplication(client, {
        id: APPLICATION_IDS[i]!,
        workerId: WORKER_IDS.verified,
        jobId: JOB_IDS[i]!,
        status: APP_STATES[i]!,
      });
    }

    // 6. Shifts — 2 variants (scheduled / completed)
    for (let i = 0; i < SHIFT_IDS.length; i++) {
      await upsertShift(client, {
        id: SHIFT_IDS[i]!,
        applicationId: APPLICATION_IDS[i]!,
        status: i === 0 ? "scheduled" : "completed",
      });
    }

    // 7. Reviews — 3 directions (worker→biz / biz→worker / both-sided)
    const REVIEW_DIRS = [
      "worker_to_biz",
      "biz_to_worker",
      "both_sided",
    ] as const;
    for (let i = 0; i < REVIEW_IDS.length; i++) {
      await upsertReview(client, {
        id: REVIEW_IDS[i]!,
        applicationId: APPLICATION_IDS[3]!, // the "completed" application
        direction: REVIEW_DIRS[i]!,
      });
    }

    // 8. Settlement — 1 processed
    await upsertSettlement(client, {
      id: SETTLEMENT_IDS[0]!,
      applicationId: APPLICATION_IDS[3]!, // completed app
      status: "processed",
    });

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

// ---------- Upsert helpers (ON CONFLICT (id) DO UPDATE per D-06 idempotency) ----------

type UserRow = {
  id: string;
  email: string;
  role: "ADMIN" | "EMPLOYER" | "WORKER";
  verified: boolean;
};

async function upsertUser(client: Client, row: UserRow): Promise<void> {
  await client.query(
    `INSERT INTO "User" (id, email, role, verified, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $5)
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       role = EXCLUDED.role,
       verified = EXCLUDED.verified,
       "updatedAt" = EXCLUDED."updatedAt"`,
    [row.id, row.email, row.role, row.verified, FROZEN_NOW],
  );
}

type JobRow = {
  id: string;
  employerId: string;
  status: string;
};

async function upsertJob(client: Client, row: JobRow): Promise<void> {
  await client.query(
    `INSERT INTO "Job" (id, "employerId", status, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $4)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       "updatedAt" = EXCLUDED."updatedAt"`,
    [row.id, row.employerId, row.status, FROZEN_NOW],
  );
}

type ApplicationRow = {
  id: string;
  workerId: string;
  jobId: string;
  status: string;
};

async function upsertApplication(
  client: Client,
  row: ApplicationRow,
): Promise<void> {
  await client.query(
    `INSERT INTO "Application" (id, "workerId", "jobId", status, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $5)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       "updatedAt" = EXCLUDED."updatedAt"`,
    [row.id, row.workerId, row.jobId, row.status, FROZEN_NOW],
  );
}

type ShiftRow = {
  id: string;
  applicationId: string;
  status: string;
};

async function upsertShift(client: Client, row: ShiftRow): Promise<void> {
  await client.query(
    `INSERT INTO "Shift" (id, "applicationId", status, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $4)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       "updatedAt" = EXCLUDED."updatedAt"`,
    [row.id, row.applicationId, row.status, FROZEN_NOW],
  );
}

type ReviewRow = {
  id: string;
  applicationId: string;
  direction: string;
};

async function upsertReview(client: Client, row: ReviewRow): Promise<void> {
  await client.query(
    `INSERT INTO "Review" (id, "applicationId", direction, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $4)
     ON CONFLICT (id) DO UPDATE SET
       direction = EXCLUDED.direction,
       "updatedAt" = EXCLUDED."updatedAt"`,
    [row.id, row.applicationId, row.direction, FROZEN_NOW],
  );
}

type SettlementRow = {
  id: string;
  applicationId: string;
  status: string;
};

async function upsertSettlement(
  client: Client,
  row: SettlementRow,
): Promise<void> {
  await client.query(
    `INSERT INTO "Settlement" (id, "applicationId", status, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $4)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       "updatedAt" = EXCLUDED."updatedAt"`,
    [row.id, row.applicationId, row.status, FROZEN_NOW],
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
