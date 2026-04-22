/**
 * scripts/review/run-review.ts
 *
 * Phase 07.1 Plan 02 Task 5 — top-level orchestrator invoked by `npm run review`.
 *
 * Pipeline:
 *   1. (optional) start-local-stack — skipped with --skip-stack for CI-cached envs
 *   2. run-full-sweep iter 0
 *   3. if failures > 0 → run-auto-fix-loop (bounded by D-21 + --max-iter override)
 *   4. run-full-sweep (post-fix, iter N)
 *   5. report-writer emits .planning/phases/07.1-<slug>/07.1-REVIEW.md
 *
 * CLI:
 *   npx tsx scripts/review/run-review.ts                 # full orchestration
 *   npx tsx scripts/review/run-review.ts --skip-stack    # skip stack bootstrap
 *   npx tsx scripts/review/run-review.ts --max-iter 5    # override D-21 cap
 *   npx tsx scripts/review/run-review.ts --smoke         # unit-test-style smoke
 *                                                        #   (writes a synthetic REVIEW.md
 *                                                        #    without invoking real sweep)
 */

import { spawnSync } from "node:child_process";
import { runFullSweep, type AggregateReport } from "./run-full-sweep";
import { runAutoFixLoop, type IterationLog } from "./auto-fix-loop";
import { writeReport } from "./report-writer";

const REVIEW_MD =
  ".planning/phases/07.1-automated-review-harness-zero-error-gate/07.1-REVIEW.md";

const IS_WINDOWS = process.platform === "win32";

function argFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0 || idx + 1 >= process.argv.length) return undefined;
  return process.argv[idx + 1];
}

function startLocalStack(): void {
  console.log("[run-review] Step 1: starting local stack");
  const r = spawnSync(
    "npx",
    ["tsx", "scripts/review/start-local-stack.ts"],
    { stdio: "inherit", shell: IS_WINDOWS },
  );
  if (r.status !== 0) {
    console.error("[run-review] start-local-stack failed");
    process.exit(r.status ?? 1);
  }
}

function buildSmokeReport(): {
  report: AggregateReport;
  iterations: IterationLog[];
} {
  // --smoke path (unit-test-style): construct a synthetic "pending" AggregateReport
  // so writeReport can be exercised without booting the stack or running any
  // subprocesses.
  //
  // IMPORTANT: this is a shape-verification artifact, not a real sign-off.
  // All gates are marked `passed: false` with observed="pending (smoke)" so the
  // emitted REVIEW.md carries `production_ready: false`, which is correct for
  // the Plan 02 auto-only execution run (Task 6 human-verify checkpoint is
  // deferred — real sweep has not been performed).
  const now = new Date().toISOString();
  const pending = (threshold: string) => ({
    observed: "pending (smoke)",
    threshold,
    passed: false,
  });
  const synthetic: AggregateReport = {
    iteration: 0,
    started_at: now,
    ended_at: now,
    failures: [
      {
        gate: "G15",
        message:
          "smoke-mode placeholder — full sweep + auto-fix-loop + real report have NOT executed yet (awaiting deferred Task 4 + Task 6 human checkpoints)",
      },
    ],
    flows: [],
    gates_summary: {
      G1: pending("0"),
      G2: pending("0"),
      G3: pending("0"),
      G4: pending("0"),
      G5: pending("0"),
      G6: pending("0"),
      G7: pending("0 errors (warnings allowed)"),
      G8: pending("0"),
      G9: pending("<= 2500ms"),
      G10: pending("<= 3500ms"),
      G11: pending("<= 200KB"),
      G12: pending("<= 0.1"),
      G13: pending("all pass"),
      G14: pending("all pass"),
      G15: pending("7/7 <= 60s"),
      G16: pending("all pass"),
    },
  };
  return { report: synthetic, iterations: [] };
}

async function main(): Promise<void> {
  const skipStack = argFlag("--skip-stack");
  const smoke = argFlag("--smoke");
  const maxIterOverride = Number(argValue("--max-iter"));

  if (smoke) {
    console.log(
      "[run-review] --smoke: writing synthetic REVIEW.md without invoking sweep",
    );
    const { report, iterations } = buildSmokeReport();
    const { productionReady } = await writeReport(REVIEW_MD, report, iterations);
    console.log(
      `[run-review] --smoke done. production_ready=${productionReady} -> ${REVIEW_MD}`,
    );
    process.exit(productionReady ? 0 : 1);
  }

  if (!skipStack) startLocalStack();

  console.log("[run-review] Step 2: initial full sweep");
  const initial = await runFullSweep(0);

  let finalReport: AggregateReport = initial;
  let iterationLog: IterationLog[] = [];

  if (initial.failures.length > 0) {
    console.log(
      `[run-review] Step 3: auto-fix loop (failures=${initial.failures.length}, max_iter=${isFinite(maxIterOverride) ? maxIterOverride : "D-21 default"})`,
    );
    const result = await runAutoFixLoop(
      async (_failures) => {
        // Default generator: no-op. A real fix-generation strategy is Claude's
        // Discretion (D-22) and is wired by the operator when they invoke this.
        return [];
      },
      {},
    );
    iterationLog = result.iterations;

    console.log("[run-review] Step 4: post-fix full sweep");
    finalReport = await runFullSweep(result.iterations.length);
  }

  console.log("[run-review] Step 5: writing REVIEW.md");
  const { productionReady } = await writeReport(
    REVIEW_MD,
    finalReport,
    iterationLog,
  );
  console.log(
    `[run-review] done. production_ready=${productionReady} -> ${REVIEW_MD}`,
  );
  process.exit(productionReady ? 0 : 1);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[run-review] error:", msg);
  process.exit(1);
});
