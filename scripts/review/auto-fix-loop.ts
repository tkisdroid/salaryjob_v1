/**
 * scripts/review/auto-fix-loop.ts
 *
 * Phase 07.1 Plan 02 Task 3 — auto-fix loop per D-19 / D-20 / D-21 / D-22.
 *
 * NEVER relax WHITELIST_PATTERNS or DENYLIST_PATTERNS without amending
 * CONTEXT.md first. The lists below are the written policy — the executable
 * form of D-19 / D-20 / CLAUDE.md mock-data guard.
 *
 * Usage:
 *   npx tsx scripts/review/auto-fix-loop.ts             # invokes loop against real sweep
 *   npx tsx scripts/review/auto-fix-loop.ts --dry-run   # enumerate lists + simulate 1 iter
 */

import { execSync, spawnSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";
import {
  runFullSweep,
  type AggregateReport,
  type GateFailure,
} from "./run-full-sweep";

// ============================================================================
// D-19 WRITABLE scope (whitelist — deny by default)
// Exactly 8 entries mirroring CONTEXT.md §D-19 line-by-line:
//   src/components/**
//   src/app/**/{page,layout,loading,error,not-found}.tsx
//   src/lib/actions/**
//   src/app/api/**/route.ts (excluding /api/webhooks/*)
//   src/lib/services/**     (excluding src/lib/services/payment*)
//   src/lib/validations/**
//   src/styles/**
//   tests/**
// ============================================================================
export const WHITELIST_PATTERNS: readonly RegExp[] = [
  /^src\/components\//,
  /^src\/app\/.*\/(page|layout|loading|error|not-found)\.tsx$/,
  /^src\/lib\/actions\//,
  /^src\/app\/api\/(?!webhooks\/).*\/route\.ts$/,
  /^src\/lib\/services\/(?!payment).*/,
  /^src\/lib\/validations\//,
  /^src\/styles\//,
  /^tests\//,
];

// ============================================================================
// D-20 DENY list (hard block — auto-fix MUST refuse + log MANUAL-FIX-NEEDED.md)
// At least 10 entries:
//   src/lib/supabase/**             (auth/RLS/storage clients — skeleton)
//   prisma/schema.prisma            (core fields guard)
//   supabase/migrations/**          (never regenerate migrations mid-review)
//   .env / .env.*                   (secrets/config perimeter)
//   next.config.ts                  (tech-stack lock)
//   package.json                    (stricter than D-20; see inline note below)
//   src/app/api/webhooks/**         (signature-verified boundaries)
//   src/lib/services/payment*       (Toss integration boundary)
//   middleware.ts                   (auth/session boundary)
//   src/lib/mock-data               (CLAUDE.md LEG-03 regression prevention)
// ============================================================================
export const DENYLIST_PATTERNS: readonly RegExp[] = [
  /^src\/lib\/supabase\//, // auth/RLS/storage clients — skeleton
  /^prisma\/schema\.prisma$/, // core fields guarded by Pitfall 6 pre-commit diff
  /^supabase\/migrations\//, // never regenerate migrations mid-review
  /^\.env/, // secrets/config perimeter — matches .env, .env.local, .env.test
  /^next\.config\.ts$/, // tech-stack lock
  // package.json: stricter than D-20 (which only bans deps) — conservative
  //   whole-file block; planned scripts edits go through Task 5 auto task.
  /^package\.json$/,
  /^src\/app\/api\/webhooks\//, // signature-verified boundaries
  /^src\/lib\/services\/payment/, // Toss integration boundary
  /^middleware\.ts$/, // auth/session boundary
  // Added per CLAUDE.md policy (LEG-03 regression prevention):
  /^src\/lib\/mock-data/,
];

export function isAllowedPath(relPath: string): boolean {
  const norm = relPath.replace(/\\/g, "/"); // Windows path normalization
  if (DENYLIST_PATTERNS.some((p) => p.test(norm))) return false;
  return WHITELIST_PATTERNS.some((p) => p.test(norm));
}

// ============================================================================
// D-21 iteration policy
// ============================================================================
export const MAX_ITER_STRICT = 3; // default pause after 3 iters without strict decrease
export const MAX_ITER_PROGRESS = 10; // hard ceiling even on strict decrease

export type IterationLog = {
  n: number;
  prev: number; // fail_count before this iter
  curr: number; // fail_count after this iter
  strict: boolean; // curr < prev
  accepted: number; // writes applied
  rejected: number; // writes blocked by D-20 → MANUAL-FIX-NEEDED.md
  duration_ms: number;
};

export type AutoFixOutcome = "green" | "paused" | "exhausted" | "escalated";

export type FixProposal = {
  file: string;
  newContent: string;
  reason: string;
  gate: GateFailure["gate"];
  route?: string;
};

export type RunLoopOptions = {
  dryRun?: boolean;
};

export type RunLoopResult = {
  outcome: AutoFixOutcome;
  iterations: IterationLog[];
};

// ============================================================================
// D-22 functional-correctness override
// Callers use this to force FAIL when G13 (content) or G14 (CTA) has failures
// even if G1..G12 all report zero (anti white-screen-passes rule).
// ============================================================================
export function hasFunctionalFailure(report: AggregateReport): boolean {
  return report.failures.some((f) => f.gate === "G13" || f.gate === "G14");
}

function appendManualFixEntry(p: FixProposal): string {
  const routePart = p.route ? ` at ${p.route}` : "";
  return `- [${p.file}] ${p.reason} — blocked by D-20; ${p.gate} gate${routePart}\n`;
}

function simulateDryRun(): RunLoopResult {
  console.log(
    "[auto-fix:dry-run] WHITELIST:",
    JSON.stringify(WHITELIST_PATTERNS.map(String)),
  );
  console.log(
    "[auto-fix:dry-run] DENY:",
    JSON.stringify(DENYLIST_PATTERNS.map(String)),
  );

  // Simulate ONE iteration with 2 synthetic proposals — 1 whitelisted, 1 denylisted.
  // No filesystem writes (we only LOG what would happen).
  const synthetic: FixProposal[] = [
    {
      file: "src/components/Button.tsx",
      newContent: "// (dry-run: would have been written)",
      reason: "synthetic G13 fix",
      gate: "G13",
      route: "/home",
    },
    {
      file: "src/lib/supabase/client.ts",
      newContent: "// (dry-run: would have been rejected)",
      reason: "synthetic denylist probe",
      gate: "G13",
      route: "/home",
    },
  ];

  const accepted = synthetic.filter((p) => isAllowedPath(p.file));
  const rejected = synthetic.filter((p) => !isAllowedPath(p.file));

  if (accepted.length !== 1 || rejected.length !== 1) {
    console.error(
      `[auto-fix:dry-run] self-check FAIL: accepted=${accepted.length} rejected=${rejected.length}`,
    );
    return { outcome: "escalated", iterations: [] };
  }

  console.log(
    `[auto-fix:dry-run] simulated iter: accepted=${accepted.length} (would writeFileSync ${accepted[0]!.file}), rejected=${rejected.length} (would append MANUAL-FIX-NEEDED.md)`,
  );
  console.log(
    `[auto-fix:dry-run] sample MANUAL-FIX-NEEDED.md entry: ${appendManualFixEntry(rejected[0]!).trimEnd()}`,
  );

  return {
    outcome: "green",
    iterations: [
      {
        n: 1,
        prev: synthetic.length,
        curr: 0,
        strict: true,
        accepted: accepted.length,
        rejected: rejected.length,
        duration_ms: 0,
      },
    ],
  };
}

export async function runAutoFixLoop(
  generateFixes: (failures: GateFailure[]) => Promise<FixProposal[]>,
  options: RunLoopOptions = {},
): Promise<RunLoopResult> {
  const iterations: IterationLog[] = [];

  if (options.dryRun) {
    return simulateDryRun();
  }

  // Real loop mechanics. Fix-generation strategy is Claude's Discretion (D-22) —
  // the caller injects a generator. This skeleton handles routing, scope, policy.
  let report = await runFullSweep(0);
  let prev = report.failures.length;
  let noProgress = 0;
  let iter = 0;

  while (report.failures.length > 0) {
    iter++;
    if (iter > MAX_ITER_PROGRESS) {
      return { outcome: "exhausted", iterations };
    }

    const start = Date.now();
    const proposals = await generateFixes(report.failures);

    const accepted: FixProposal[] = [];
    const rejected: FixProposal[] = [];
    for (const p of proposals) {
      if (isAllowedPath(p.file)) {
        accepted.push(p);
      } else {
        rejected.push(p);
      }
    }

    // D-20 escalation log — each rejection becomes a MANUAL-FIX-NEEDED.md line.
    for (const r of rejected) {
      appendFileSync("MANUAL-FIX-NEEDED.md", appendManualFixEntry(r));
    }

    // Apply accepted writes.
    for (const p of accepted) {
      writeFileSync(p.file, p.newContent);
    }
    if (accepted.length > 0) {
      execSync(
        `git add -A && git commit -m "fix(07.1-02): iter ${iter} — ${accepted.length} fixes, ${rejected.length} escalated [iter=${iter}]"`,
        { stdio: "inherit" },
      );
    }

    report = await runFullSweep(iter);
    const curr = report.failures.length;
    const strict = curr < prev;
    const log: IterationLog = {
      n: iter,
      prev,
      curr,
      strict,
      accepted: accepted.length,
      rejected: rejected.length,
      duration_ms: Date.now() - start,
    };
    iterations.push(log);
    console.log(
      `iter=${iter} failures={${prev}->${curr}} progress=${strict ? "yes" : "no"} accepted=${accepted.length} rejected=${rejected.length}`,
    );
    prev = curr;

    if (!strict) {
      noProgress++;
    } else {
      noProgress = 0;
    }

    if (iter >= MAX_ITER_STRICT && !strict) {
      return { outcome: "paused", iterations }; // D-21 default pause
    }
    if (noProgress >= 3) {
      return { outcome: "paused", iterations }; // D-21 3-no-progress pause
    }
  }

  return { outcome: "green", iterations };
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const result = await runAutoFixLoop(
    async (_failures) => {
      // Default generator: no-op placeholder. A real implementation is
      // Claude's Discretion (D-22) and is wired by the orchestrator.
      // For the dry-run verification this is never invoked.
      return [];
    },
    { dryRun },
  );
  console.log(
    `[auto-fix] outcome: ${result.outcome} iterations: ${result.iterations.length}`,
  );
  process.exit(
    result.outcome === "green" ? 0 : result.outcome === "paused" ? 2 : 1,
  );
}

// Retain spawnSync import for future subprocess-based generators.
void spawnSync;

const invokedDirectly = (() => {
  try {
    return require.main === module;
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[auto-fix] error:", msg);
    process.exit(1);
  });
}
