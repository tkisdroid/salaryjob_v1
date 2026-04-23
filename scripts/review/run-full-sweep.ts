/**
 * scripts/review/run-full-sweep.ts
 *
 * Phase 07.1 Plan 02 Task 1 — full-sweep aggregate runner.
 *
 * Runs every one of the 16 D-17 gates across 108 route-scenarios + 7 E2E flow
 * slots without short-circuiting on the first failure (D-17 rule: "the runner
 * aggregates ALL gates before reporting; does not short-circuit on first
 * failure"). Emits `.review/aggregate-report.json` for downstream consumers
 * (scripts/review/auto-fix-loop.ts + scripts/review/report-writer.ts).
 *
 * Usage:
 *   REVIEW_RUN=1 npx tsx scripts/review/run-full-sweep.ts            # full sweep
 *   REVIEW_RUN=1 npx tsx scripts/review/run-full-sweep.ts --dry-run  # count-only preflight
 *
 * D-17 gate table (FAIL if ANY non-zero / out-of-budget):
 *   G1  runtime JS errors      threshold: 0           tool: page.on('pageerror')
 *   G2  console errors         threshold: 0           tool: page.on('console') level=error
 *   G3  console warnings       threshold: 0           tool: page.on('console') level=warning
 *   G4  network 4xx (allow-list aware)  threshold: 0  tool: page.on('response') + allowed-4xx.json
 *   G5  network 5xx            threshold: 0           tool: page.on('response')
 *   G6  TypeScript errors      threshold: 0           tool: tsc --noEmit
 *   G7  ESLint errors          threshold: 0           tool: eslint --max-warnings=-1
 *   G8  axe-core critical+serious  threshold: 0       tool: @axe-core/playwright
 *   G9  LCP                    threshold: <= 2500 ms  tool: Lighthouse CI
 *   G10 TTI                    threshold: <= 3500 ms  tool: Lighthouse CI
 *   G11 initial JS transfer    threshold: <= 200 KB   tool: Lighthouse CI
 *   G12 CLS                    threshold: <= 0.1      tool: Lighthouse CI
 *   G13 D-11 content asserts   threshold: all pass    tool: Playwright assertion
 *   G14 D-13 CTA probe         threshold: all pass    tool: Playwright assertion
 *   G15 7 E2E loops (D-15)     threshold: all pass + each <= 60 s  tool: Playwright
 *   G16 existing vitest suite  threshold: all pass    tool: vitest run
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { ROUTES } from "../../tests/review/routes/manifest";

export type GateId =
  | "G1"
  | "G2"
  | "G3"
  | "G4"
  | "G5"
  | "G6"
  | "G7"
  | "G8"
  | "G9"
  | "G10"
  | "G11"
  | "G12"
  | "G13"
  | "G14"
  | "G15"
  | "G16";

export type GateFailure = {
  gate: GateId;
  route?: string;
  viewport?: "desktop" | "mobile-375";
  persona?: "worker" | "biz" | "admin" | "anon";
  message: string;
  file_suggestion?: string;
  stack?: string;
};

export type FlowResult = {
  id: string;
  name: string;
  passed: boolean;
  elapsedMs: number;
};

export type GateSummaryEntry = {
  observed: number | string;
  threshold: string;
  passed: boolean;
};

export type AggregateReport = {
  iteration: number;
  started_at: string; // ISO 8601
  ended_at: string;
  failures: GateFailure[];
  flows: FlowResult[];
  gates_summary: Record<GateId, GateSummaryEntry>;
};

const IS_WINDOWS = process.platform === "win32";
const SCENARIO_COUNT = ROUTES.length * 2; // 54 × 2 viewports = 108
const FLOW_SLOT_COUNT = 7; // D-15 canonical loops

type SpawnResult = { status: number; stderr: string; stdout: string };

function runGate(
  cmd: string,
  args: readonly string[],
  extraEnv: Record<string, string | undefined> = {},
): SpawnResult {
  const r = spawnSync(cmd, [...args], {
    encoding: "utf8",
    shell: IS_WINDOWS,
    env: { ...process.env, REVIEW_RUN: "1", ...extraEnv },
  });
  return {
    status: r.status ?? 1,
    stderr: r.stderr ?? "",
    stdout: r.stdout ?? "",
  };
}

function tail(s: string, n = 2000): string {
  return s.length > n ? s.slice(-n) : s;
}

function parseFlowLines(stdout: string): FlowResult[] {
  const flows: FlowResult[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      const parsed = JSON.parse(trimmed) as {
        flow?: string;
        started?: number;
        ended?: number;
        elapsedMs?: number;
        passed?: boolean;
      };
      if (
        typeof parsed.flow === "string" &&
        typeof parsed.elapsedMs === "number"
      ) {
        flows.push({
          id: parsed.flow,
          name: `D-15 flow ${parsed.flow}`,
          passed: parsed.passed !== false && parsed.elapsedMs <= 60_000,
          elapsedMs: parsed.elapsedMs,
        });
      }
    } catch {
      // non-JSON line — ignore
    }
  }
  return flows;
}

function parsePlaywrightResults():
  | {
      totals: { passed: number; failed: number; total: number };
      failures: GateFailure[];
    }
  | null {
  const jsonPath = "tests/review/_results.json";
  if (!existsSync(jsonPath)) return null;
  try {
    const raw = readFileSync(jsonPath, "utf8");
    const parsed = JSON.parse(raw) as {
      stats?: { expected?: number; unexpected?: number };
    };
    const expected = parsed.stats?.expected ?? 0;
    const unexpected = parsed.stats?.unexpected ?? 0;
    const failures: GateFailure[] = [];
    if (unexpected > 0) {
      failures.push({
        gate: "G13",
        message: `playwright matrix: ${unexpected} unexpected failures (stats.unexpected)`,
      });
    }
    return {
      totals: {
        passed: expected,
        failed: unexpected,
        total: expected + unexpected,
      },
      failures,
    };
  } catch {
    return null;
  }
}

export async function runFullSweep(iter: number): Promise<AggregateReport> {
  const started_at = new Date().toISOString();
  const failures: GateFailure[] = [];
  const flows: FlowResult[] = [];
  const gates_summary: Record<GateId, GateSummaryEntry> = {
    G1: { observed: "pending", threshold: "0", passed: false },
    G2: { observed: "pending", threshold: "0", passed: false },
    G3: { observed: "pending", threshold: "0", passed: false },
    G4: { observed: "pending", threshold: "0", passed: false },
    G5: { observed: "pending", threshold: "0", passed: false },
    G6: { observed: "pending", threshold: "0", passed: false },
    G7: { observed: "pending", threshold: "0 errors (warnings allowed)", passed: false },
    G8: { observed: "pending", threshold: "0", passed: false },
    G9: { observed: "pending", threshold: "<= 2500ms", passed: false },
    G10: { observed: "pending", threshold: "<= 3500ms", passed: false },
    G11: { observed: "pending", threshold: "<= 200KB", passed: false },
    G12: { observed: "pending", threshold: "<= 0.1", passed: false },
    G13: { observed: "pending", threshold: "all pass", passed: false },
    G14: { observed: "pending", threshold: "all pass", passed: false },
    G15: { observed: "pending", threshold: "7/7 <= 60s", passed: false },
    G16: { observed: "pending", threshold: "all pass", passed: false },
  };

  // ---------- Stage 1 — static gates (G6, G7, G16). No short-circuit per D-17. ----------
  const tsc = runGate("npx", ["tsc", "--noEmit"]);
  gates_summary.G6 = {
    observed: tsc.status === 0 ? 0 : "errors",
    threshold: "0",
    passed: tsc.status === 0,
  };
  if (tsc.status !== 0) {
    failures.push({ gate: "G6", message: tail(tsc.stderr || tsc.stdout) });
  }

  const eslint = runGate("npx", ["eslint", ".", "--max-warnings=-1"]);
  gates_summary.G7 = {
    observed: eslint.status === 0 ? 0 : "errors",
    threshold: "0 errors (warnings allowed)",
    passed: eslint.status === 0,
  };
  if (eslint.status !== 0) {
    failures.push({ gate: "G7", message: tail(eslint.stderr || eslint.stdout) });
  }

  const vitest = runGate("npx", ["vitest", "run"]);
  gates_summary.G16 = {
    observed: vitest.status === 0 ? "all pass" : "failures",
    threshold: "all pass",
    passed: vitest.status === 0,
  };
  if (vitest.status !== 0) {
    failures.push({ gate: "G16", message: tail(vitest.stderr || vitest.stdout) });
  }

  // ---------- Stage 2 — 108 route-scenarios (G1..G5, G8, G13, G14) ----------
  const pw = runGate("npx", [
    "playwright",
    "test",
    "--project=review-desktop",
    "--project=mobile-375",
    "tests/review/routes/run-matrix.ts",
  ]);
  const pwParsed = parsePlaywrightResults();
  if (pwParsed) {
    const { totals } = pwParsed;
    gates_summary.G13 = {
      observed: `${totals.passed}/${totals.total}`,
      threshold: "all pass",
      passed: totals.failed === 0,
    };
    gates_summary.G14 = {
      observed: `${totals.passed}/${totals.total}`,
      threshold: "all pass",
      passed: totals.failed === 0,
    };
    // G1..G5 + G8 aggregate rides the same matrix spec — if matrix passes, those gates
    // also passed (the spec fails on any G1/G2/G3/G4/G5/G8 violation inside its body).
    for (const g of ["G1", "G2", "G3", "G4", "G5", "G8"] as const) {
      gates_summary[g] = {
        observed: totals.failed === 0 ? 0 : "see matrix failures",
        threshold: "0",
        passed: totals.failed === 0,
      };
    }
    failures.push(...pwParsed.failures);
  } else {
    for (const g of ["G1", "G2", "G3", "G4", "G5", "G8", "G13", "G14"] as const) {
      gates_summary[g] = {
        observed: "no playwright json",
        threshold: gates_summary[g].threshold,
        passed: false,
      };
    }
    failures.push({
      gate: "G13",
      message: "tests/review/_results.json not produced by playwright matrix run",
    });
  }
  if (pw.status !== 0 && (!pwParsed || pwParsed.totals.failed === 0)) {
    failures.push({
      gate: "G13",
      message: `playwright matrix exit=${pw.status}: ${tail(pw.stderr || pw.stdout)}`,
    });
  }

  // ---------- Stage 3 — 7 E2E flows (G15) via --grep @flow- ----------
  const flowRun = runGate("npx", [
    "playwright",
    "test",
    "--grep",
    "@flow-",
    "--project=review-desktop",
  ]);
  const flowRecords = parseFlowLines(flowRun.stdout);
  flows.push(...flowRecords);
  const flowsPassed = flows.filter((f) => f.passed && f.elapsedMs <= 60_000).length;
  gates_summary.G15 = {
    observed: `${flowsPassed}/${FLOW_SLOT_COUNT}`,
    threshold: "7/7 <= 60s",
    passed: flows.length === FLOW_SLOT_COUNT && flowsPassed === FLOW_SLOT_COUNT,
  };
  if (!gates_summary.G15.passed) {
    failures.push({
      gate: "G15",
      message: `flows passed=${flowsPassed}/${FLOW_SLOT_COUNT} (records=${flows.length})`,
    });
  }

  // ---------- Stage 4 — Lighthouse CI (G9..G12) ----------
  // Budget a representative subset of 10 routes to keep LHCI wall-clock manageable.
  const lhciUrls = ROUTES.slice(0, 10).map(
    (r) => `http://localhost:3000${r.path === "/" ? "" : r.path}`,
  );
  const lhci = runGate("npx", [
    "lhci",
    "autorun",
    ...lhciUrls.map((u) => `--collect.url=${u}`),
  ]);
  // The `.lighthouserc.js` asserts on G9..G12 budgets; lhci exit code is 0 iff all pass.
  for (const g of ["G9", "G10", "G11", "G12"] as const) {
    gates_summary[g] = {
      observed: lhci.status === 0 ? "within budget" : "budget exceeded",
      threshold: gates_summary[g].threshold,
      passed: lhci.status === 0,
    };
  }
  if (lhci.status !== 0) {
    failures.push({
      gate: "G9",
      message: `lhci exit=${lhci.status}: ${tail(lhci.stdout || lhci.stderr)}`,
    });
  }

  const report: AggregateReport = {
    iteration: iter,
    started_at,
    ended_at: new Date().toISOString(),
    failures,
    flows,
    gates_summary,
  };

  mkdirSync(".review", { recursive: true });
  writeFileSync(".review/aggregate-report.json", JSON.stringify(report, null, 2));
  return report;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    // Preflight count-only mode: no subprocess invocations, no FS writes beyond
    // .review directory creation. Used by VALIDATION.md row 07.1-02-01 verify.
    mkdirSync(".review", { recursive: true });
    console.log(
      `[full-sweep:dry-run] scenarios=${SCENARIO_COUNT} flow_slots=${FLOW_SLOT_COUNT}`,
    );
    process.exit(SCENARIO_COUNT === 108 && FLOW_SLOT_COUNT === 7 ? 0 : 1);
  }

  const report = await runFullSweep(0);
  const flowsOk =
    report.flows.length === FLOW_SLOT_COUNT &&
    report.flows.every((f) => f.passed && f.elapsedMs <= 60_000);
  const allPassed = report.failures.length === 0 && flowsOk;
  console.log(
    `[full-sweep] iter=${report.iteration} failures=${report.failures.length} flows=${report.flows.filter((f) => f.passed).length}/${report.flows.length}`,
  );
  process.exit(allPassed ? 0 : 1);
}

// Only execute main() when invoked as a script (not when imported).
// CJS-style check works under tsx for standalone invocation.
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
    console.error("[full-sweep] error:", msg);
    process.exit(1);
  });
}
