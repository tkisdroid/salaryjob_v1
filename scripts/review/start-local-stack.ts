/**
 * scripts/review/start-local-stack.ts
 *
 * Phase 07.1 review-harness bootstrap orchestrator.
 * Source of truth: D-01..D-05 in CONTEXT.md; Pattern 1 in RESEARCH.md.
 *
 * Steps (idempotent — safe to re-run):
 *   1. Verify Docker Desktop is reachable (D-03 Windows/WSL2 fail-fast guard).
 *   2. `npx supabase start` — boots the local Postgres + Auth + Storage + Realtime + Studio + Inbucket.
 *   3. `npx supabase status --output env` — machine-parseable output piped to `.env.test` (D-04).
 *   4. `npx tsx scripts/apply-supabase-migrations.ts --target=local` — reuses existing runner (D-05).
 *   5. `npx prisma generate` — refreshes `src/generated/prisma` to match migrated schema.
 *   6. `npx tsx scripts/review/seed-test-data.ts` — deterministic D-06/D-07/D-08 fixtures.
 *   7. Print the 4 Supabase stack URLs (D-04 locked values).
 *
 * Failure paths include Windows-specific remediation hints (Pitfall 1 HNS port conflict,
 * Pitfall 2 WSL2 memory starvation).
 */

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const IS_WINDOWS = process.platform === "win32";

function runOrExit(
  cmd: string,
  args: readonly string[],
  errMsg: string,
): void {
  const r = spawnSync(cmd, [...args], {
    stdio: "inherit",
    shell: IS_WINDOWS,
  });
  if (r.status !== 0) {
    console.error(errMsg);
    process.exit(r.status ?? 1);
  }
}

async function main(): Promise<void> {
  // Step 1 — Docker reachability check (actionable WSL2 error per D-03)
  const docker = spawnSync("docker", ["info"], {
    encoding: "utf8",
    shell: IS_WINDOWS,
  });
  if (docker.status !== 0) {
    console.error(
      "[review:stack] Docker Desktop not reachable. " +
        "On Windows, open Docker Desktop and wait for it to show 'Running'. " +
        "See docs/review-harness.md for WSL2 + Docker setup steps.",
    );
    process.exit(1);
  }

  // Step 2 — supabase start (idempotent; returns fast if already up)
  runOrExit(
    "npx",
    ["supabase", "start"],
    "[review:stack] supabase start failed. " +
      "If port-reservation (WSAEACCES) error, run `net stop hns && net start hns` in admin cmd. " +
      "See docs/review-harness.md Pitfall 1.",
  );

  // Step 3 — supabase status --output env, remap CLI var names -> app-expected,
  //          write .env.test (D-04). Supabase CLI emits API_URL / ANON_KEY / DB_URL /
  //          SERVICE_ROLE_KEY; the Next.js app reads NEXT_PUBLIC_SUPABASE_URL,
  //          NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  //          DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY. We preserve the raw CLI names
  //          below the mapped block so tooling that consumes either shape still works.
  const status = spawnSync(
    "npx",
    ["supabase", "status", "--output", "env"],
    { encoding: "utf8", shell: IS_WINDOWS },
  );
  if (status.status !== 0) {
    console.error("[review:stack] supabase status failed");
    process.exit(status.status ?? 1);
  }
  const raw = parseEnvOutput(status.stdout);
  const mapped = buildAppEnv(raw);
  writeFileSync(".env.test", mapped, { mode: 0o600 });
  console.log("[review:stack] wrote .env.test (mapped to app-expected var names)");

  // Step 4 — apply migrations against local target (reuse existing runner per D-05)
  runOrExit(
    "npx",
    ["tsx", "scripts/apply-supabase-migrations.ts", "--target=local"],
    "[review:stack] migrations failed",
  );

  // Step 5 — prisma generate (prevent src/generated/prisma drift per Runtime State Inventory)
  runOrExit(
    "npx",
    ["prisma", "generate"],
    "[review:stack] prisma generate failed",
  );

  // Step 6 — seed deterministic data (D-06/D-07/D-08)
  runOrExit(
    "npx",
    ["tsx", "scripts/review/seed-test-data.ts"],
    "[review:stack] seed failed",
  );

  // Step 7 — final health summary (D-04 URLs)
  console.log("\n[review:stack] READY");
  console.log("  API:      http://127.0.0.1:54321");
  console.log(
    "  DB:       postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  );
  console.log("  Studio:   http://127.0.0.1:54323");
  console.log("  Inbucket: http://127.0.0.1:54324");
}

/**
 * Parse `supabase status --output env` stdout into a KEY->VALUE map.
 * Accepts `KEY=VALUE`, `KEY="VALUE"`, and `KEY='VALUE'` line shapes.
 * Ignores blank lines and `#` comments (future-proof against CLI changes).
 */
function parseEnvOutput(stdout: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of stdout.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/**
 * Build the .env.test body with app-expected variable names. The mapping is:
 *   API_URL          -> NEXT_PUBLIC_SUPABASE_URL
 *   ANON_KEY         -> NEXT_PUBLIC_SUPABASE_ANON_KEY  (and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for bwd compat)
 *   DB_URL           -> DATABASE_URL
 *   SERVICE_ROLE_KEY -> SUPABASE_SERVICE_ROLE_KEY
 * Raw CLI names are kept at the end of the file so other tooling still resolves.
 */
function buildAppEnv(raw: Record<string, string>): string {
  const apiUrl = raw["API_URL"] ?? "http://127.0.0.1:54321";
  const anonKey = raw["ANON_KEY"] ?? "";
  const dbUrl =
    raw["DB_URL"] ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  const serviceRole = raw["SERVICE_ROLE_KEY"] ?? "";

  const lines = [
    "# Generated by scripts/review/start-local-stack.ts — DO NOT EDIT BY HAND",
    "# Mapped from `supabase status --output env` to app-expected names.",
    `NEXT_PUBLIC_SUPABASE_URL=${apiUrl}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${anonKey}`,
    `DATABASE_URL=${dbUrl}`,
    `SUPABASE_SERVICE_ROLE_KEY=${serviceRole}`,
    "",
    "# Raw supabase CLI names (kept for any tooling that still reads them):",
  ];
  for (const [key, value] of Object.entries(raw)) {
    lines.push(`${key}=${value}`);
  }
  return lines.join("\n") + "\n";
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[review:stack] error:", msg);
  process.exit(1);
});
