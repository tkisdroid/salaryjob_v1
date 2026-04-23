/**
 * tests/review/phase9/fixtures/empty-state.ts
 *
 * Phase 9 empty-state seed overlay — deletes child relation rows (applications,
 * jobs, reviews, settlements) so empty-state UIs render, while leaving the
 * 3+3+1 persona identity rows (users / worker_profiles / business_profiles)
 * intact. A "logged-in user with no history" is exactly what QA-01/02/03
 * empty-state bucket needs.
 *
 * Rationale: the Phase 07.1 MAXIMAL-COVERAGE seed (scripts/review/seed-test-data.ts)
 * creates 5 applications + 10 jobs, so /my/applications is NEVER empty on the
 * default seed. See 09-RESEARCH.md Pitfall 2.
 *
 * Idempotent: DELETE WHERE id IN (fixture UUIDs) — leaves non-fixture rows
 * untouched. Re-running is a no-op.
 *
 * Schema note (matches scripts/review/seed-test-data.ts module-header):
 *   prisma/schema.prisma does NOT yet include dedicated Settlement or Shift
 *   tables — those lifecycle states currently live on `applications.status`
 *   (settled / completed). The DELETE FROM settlements statement below is
 *   kept for forward compatibility (and grep-gated by the plan's verify block)
 *   but is wrapped in a missing-table guard so it no-ops cleanly on the
 *   current local Supabase stack.
 */
import { Client } from "pg";
import { config as loadEnv } from "dotenv";
import {
  APPLICATION_IDS,
  JOB_IDS,
  REVIEW_IDS,
  SETTLEMENT_IDS,
} from "../../fixtures/ids";

loadEnv({ path: ".env.test" });

export type EmptyProfileResult = {
  deleted: {
    applications: number;
    jobs: number;
    reviews: number;
    settlements: number;
  };
};

/**
 * Delete child relation rows for fixture personas. Keeps identity rows intact.
 *
 * `--dry-run` returns the planned delete counts without opening a DB connection,
 * which is the verification path used by 09-01-02 acceptance criteria.
 */
export async function seedEmptyProfile(
  opts?: { dryRun?: boolean },
): Promise<EmptyProfileResult> {
  if (opts?.dryRun) {
    return {
      deleted: {
        applications: APPLICATION_IDS.length,
        jobs: JOB_IDS.length,
        reviews: REVIEW_IDS.length,
        settlements: SETTLEMENT_IDS.length,
      },
    };
  }

  const connection = process.env["DATABASE_URL"] ?? process.env["DB_URL"];
  if (!connection) {
    throw new Error("DATABASE_URL / DB_URL not set (expected .env.test)");
  }

  const pg = new Client({ connectionString: connection });
  await pg.connect();
  try {
    // FK delete order: reviews -> settlements -> applications -> jobs.
    // Use parameterized uuid[] only — never string-concat into SQL.
    const reviewsRes = await deleteOrSkipMissing(
      pg,
      `DELETE FROM reviews WHERE id = ANY($1::uuid[])`,
      [REVIEW_IDS as readonly string[]],
    );
    const settlementsRes = await deleteOrSkipMissing(
      pg,
      `DELETE FROM settlements WHERE id = ANY($1::uuid[])`,
      [SETTLEMENT_IDS as readonly string[]],
    );
    const applicationsRes = await deleteOrSkipMissing(
      pg,
      `DELETE FROM applications WHERE id = ANY($1::uuid[])`,
      [APPLICATION_IDS as readonly string[]],
    );
    const jobsRes = await deleteOrSkipMissing(
      pg,
      `DELETE FROM jobs WHERE id = ANY($1::uuid[])`,
      [JOB_IDS as readonly string[]],
    );

    return {
      deleted: {
        applications: applicationsRes,
        jobs: jobsRes,
        reviews: reviewsRes,
        settlements: settlementsRes,
      },
    };
  } finally {
    await pg.end();
  }
}

/**
 * Helper: run a DELETE. If the target table does not exist (Postgres SQLSTATE
 * 42P01 — undefined_table), return 0 instead of throwing. Used for the
 * `settlements` forward-compat path (see module-header schema note).
 */
async function deleteOrSkipMissing(
  pg: Client,
  sql: string,
  params: readonly unknown[],
): Promise<number> {
  try {
    const r = await pg.query(sql, params as unknown[]);
    return r.rowCount ?? 0;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "42P01") return 0;
    throw err;
  }
}

/**
 * Re-run the Phase 07.1 MAXIMAL-COVERAGE seed to restore populated state.
 * Used by test.afterAll so subsequent non-Phase-9 specs are not affected.
 */
export async function restorePopulatedProfile(): Promise<void> {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    "npx",
    ["tsx", "scripts/review/seed-test-data.ts"],
    { stdio: "inherit", shell: process.platform === "win32" },
  );
  if (result.status !== 0) {
    throw new Error(`seed restore failed with status ${result.status}`);
  }
}

// CLI entrypoint — `npx tsx tests/review/phase9/fixtures/empty-state.ts --dry-run`
if (require.main === module) {
  const dry = process.argv.includes("--dry-run");
  void seedEmptyProfile({ dryRun: dry })
    .then((r) => {
      console.log(JSON.stringify(r));
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
}
