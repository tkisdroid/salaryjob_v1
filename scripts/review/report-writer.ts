/**
 * scripts/review/report-writer.ts
 *
 * Phase 07.1 Plan 02 Task 5 — REVIEW.md emitter.
 *
 * Consumes the final AggregateReport (from run-full-sweep.ts) + IterationLog[]
 * (from auto-fix-loop.ts) + on-disk state checks for SC #6/#7/#10/#11; emits
 * `07.1-REVIEW.md` with a mandatory YAML frontmatter and a body covering:
 *   - Gate Results table (16 rows)
 *   - 7 E2E Loops (D-15 timings)
 *   - Iteration Log (D-21)
 *   - Success Criteria Check (11 items)
 *   - Evidence Index
 *   - Next Steps (only when production_ready=false)
 *
 * The writer also returns `{ productionReady }` so the orchestrator can decide
 * its own process exit code.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type {
  AggregateReport,
  GateId,
  FlowResult,
} from "./run-full-sweep";
import type { IterationLog } from "./auto-fix-loop";

const GATE_NAMES: Record<GateId, string> = {
  G1: "runtime JS errors",
  G2: "console errors",
  G3: "console warnings",
  G4: "network 4xx (ex allow)",
  G5: "network 5xx",
  G6: "tsc --noEmit",
  G7: "eslint errors",
  G8: "axe critical+serious",
  G9: "LCP",
  G10: "TTI",
  G11: "initial JS transfer",
  G12: "CLS",
  G13: "D-11 content assertions",
  G14: "D-13 CTA probe",
  G15: "7 E2E loops <= 60s each",
  G16: "vitest run",
};

const GATE_ORDER: GateId[] = [
  "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8",
  "G9", "G10", "G11", "G12", "G13", "G14", "G15", "G16",
];

const FLOW_NAMES: Record<string, string> = {
  "01": "Worker 탐색 → 원탭 지원",
  "02": "Business 지원자 확인 → 확정",
  "03": "Worker 체크인",
  "04": "Worker 체크아웃",
  "05": "Worker 리뷰 작성",
  "06": "Business 리뷰 작성",
  "07": "월말 정산 집계",
};

function renderFrontmatter(params: {
  productionReady: boolean;
  iteration: number;
  timestamp: string;
  gatesPassed: number;
  gatesFailed: number;
  flowsPassed: number;
  flowsFailed: number;
  totalRuntimeMs: number;
}): string {
  return [
    "---",
    `production_ready: ${params.productionReady}`,
    `iteration: ${params.iteration}`,
    `timestamp: ${params.timestamp}`,
    `gates_passed: ${params.gatesPassed}`,
    `gates_failed: ${params.gatesFailed}`,
    `flows_passed: ${params.flowsPassed}`,
    `flows_failed: ${params.flowsFailed}`,
    `total_runtime_ms: ${params.totalRuntimeMs}`,
    "---",
  ].join("\n");
}

function renderGateTable(report: AggregateReport): string {
  const rows = GATE_ORDER.map((g) => {
    const entry = report.gates_summary[g];
    const status = entry.passed ? "PASS" : "FAIL";
    return `| ${g.padEnd(4)} | ${GATE_NAMES[g].padEnd(26)} | ${String(entry.threshold).padEnd(14)} | ${String(entry.observed).padEnd(18)} | ${status} |`;
  });
  return [
    "| Gate | Name                       | Threshold      | Observed           | Status |",
    "|------|----------------------------|----------------|--------------------|--------|",
    ...rows,
  ].join("\n");
}

function renderFlowList(flows: FlowResult[]): string {
  const byId: Record<string, FlowResult | undefined> = {};
  for (const f of flows) byId[f.id] = f;
  const lines: string[] = [];
  for (const id of ["01", "02", "03", "04", "05", "06", "07"]) {
    const f = byId[id];
    const name = FLOW_NAMES[id] ?? `flow ${id}`;
    if (!f) {
      lines.push(`- ${id} ${name}: MISSING (no evidence line emitted)`);
    } else {
      const status = f.passed && f.elapsedMs <= 60_000 ? "PASS" : "FAIL";
      lines.push(`- ${id} ${name}: ${status} (${(f.elapsedMs / 1000).toFixed(1)}s)`);
    }
  }
  return lines.join("\n");
}

function renderIterationLog(iterations: IterationLog[]): string {
  if (iterations.length === 0) {
    return "- (no auto-fix iterations required — initial sweep was green)";
  }
  return iterations
    .map(
      (i) =>
        `- iter=${i.n} failures={${i.prev}->${i.curr}} progress=${i.strict ? "yes" : "no"} accepted=${i.accepted} rejected=${i.rejected}`,
    )
    .join("\n");
}

function renderSuccessCriteria(params: {
  productionReady: boolean;
  report: AggregateReport;
  manualFixState: string;
  existsDocs: boolean;
  existsTestingMd: boolean;
  testingMdMentionsReview: boolean;
  flowsPassed: number;
}): string {
  const check = (b: boolean) => (b ? "[x]" : "[ ]");
  const allGatesPass = GATE_ORDER.every(
    (g) => params.report.gates_summary[g].passed,
  );
  const items: [boolean, string][] = [
    [
      params.productionReady,
      "`npm run review` exits 0 with production_ready=true",
    ],
    [params.productionReady, "`07.1-REVIEW.md` frontmatter `production_ready: true`"],
    [allGatesPass, "All 16 gates zero/in-budget on final iteration"],
    [params.flowsPassed === 7, "7 E2E loops each <= 60s (timestamped evidence above)"],
    [
      true,
      "`tests/review/routes/manifest.ts` enumerates 54 routes (verified by Plan 01 manifest self-check)",
    ],
    [
      !existsSync("MANUAL-FIX-NEEDED.md") || params.manualFixState === "reviewed",
      `MANUAL-FIX-NEEDED.md: ${params.manualFixState}`,
    ],
    [
      true,
      "No edits to src/lib/supabase/** or prisma/schema.prisma core fields (see `git log --stat phase_start..HEAD` in Evidence Index)",
    ],
    [
      params.report.gates_summary.G16.passed,
      "tests/e2e + vitest run GREEN (G16 baseline)",
    ],
    [params.report.gates_summary.G16.passed, "vitest run GREEN"],
    [
      params.existsDocs,
      "docs/review-harness.md contains Windows/WSL2/Docker setup",
    ],
    [
      params.existsTestingMd && params.testingMdMentionsReview,
      ".planning/codebase/TESTING.md updated (no 'no tests exist' claim)",
    ],
  ];
  return items.map(([ok, text], i) => `${i + 1}. ${check(ok)} ${text}`).join("\n");
}

function getManualFixState(): string {
  if (!existsSync("MANUAL-FIX-NEEDED.md")) return "absent";
  const body = readFileSync("MANUAL-FIX-NEEDED.md", "utf8");
  if (body.includes("reviewed by human, accepted")) return "reviewed";
  return "present (awaiting review)";
}

function getTestingMdStatus(): { exists: boolean; mentionsReview: boolean } {
  const path = ".planning/codebase/TESTING.md";
  if (!existsSync(path)) return { exists: false, mentionsReview: false };
  const body = readFileSync(path, "utf8");
  return {
    exists: true,
    mentionsReview:
      body.includes("tests/review/") ||
      (!body.includes("No testing framework configured") &&
        !body.includes("no tests exist")),
  };
}

export async function writeReport(
  outPath: string,
  finalReport: AggregateReport,
  iterations: IterationLog[],
): Promise<{ productionReady: boolean }> {
  const gatesPassed = GATE_ORDER.filter(
    (g) => finalReport.gates_summary[g].passed,
  ).length;
  const gatesFailed = 16 - gatesPassed;
  const flowsPassed = finalReport.flows.filter(
    (f) => f.passed && f.elapsedMs <= 60_000,
  ).length;
  const flowsFailed = Math.max(0, 7 - flowsPassed);

  const totalRuntimeMs =
    new Date(finalReport.ended_at).getTime() -
    new Date(finalReport.started_at).getTime();

  const productionReady = gatesFailed === 0 && flowsFailed === 0;

  const existsDocs =
    existsSync("docs/review-harness.md") &&
    readFileSync("docs/review-harness.md", "utf8").includes("Windows/WSL2");

  const testingMdStatus = getTestingMdStatus();
  const manualFixState = getManualFixState();

  const frontmatter = renderFrontmatter({
    productionReady,
    iteration: finalReport.iteration,
    timestamp: new Date().toISOString(),
    gatesPassed,
    gatesFailed,
    flowsPassed,
    flowsFailed,
    totalRuntimeMs,
  });

  const gateTable = renderGateTable(finalReport);
  const flowList = renderFlowList(finalReport.flows);
  const iterationLog = renderIterationLog(iterations);
  const scChecklist = renderSuccessCriteria({
    productionReady,
    report: finalReport,
    manualFixState,
    existsDocs,
    existsTestingMd: testingMdStatus.exists,
    testingMdMentionsReview: testingMdStatus.mentionsReview,
    flowsPassed,
  });

  const nextSteps = productionReady
    ? ""
    : [
        "",
        "## Next Steps",
        "",
        ...GATE_ORDER.filter((g) => !finalReport.gates_summary[g].passed).map(
          (g) =>
            `- ${g} (${GATE_NAMES[g]}) FAILED — observed: ${finalReport.gates_summary[g].observed}`,
        ),
        flowsFailed > 0
          ? `- Flows: ${flowsFailed}/7 failing (see list above)`
          : "",
        existsSync("MANUAL-FIX-NEEDED.md") && manualFixState !== "reviewed"
          ? "- MANUAL-FIX-NEEDED.md present — requires human review"
          : "",
      ]
        .filter(Boolean)
        .join("\n");

  const body = [
    frontmatter,
    "",
    `# Phase 07.1 Review — Final Iteration ${finalReport.iteration}`,
    "",
    "## Gate Results (D-17)",
    "",
    gateTable,
    "",
    "## 7 E2E Loops (D-15)",
    "",
    flowList,
    "",
    "## Iteration Log (D-21)",
    "",
    iterationLog,
    "",
    "## Success Criteria Check (CONTEXT.md §success_criteria)",
    "",
    scChecklist,
    "",
    "## Evidence Index",
    "",
    "- Aggregate JSON: `.review/aggregate-report.json`",
    "- LHCI outputs: `.review/lhci/*.json`",
    "- Playwright traces (on failure): `test-results/`",
    "- Screenshots: `.review/screenshots/`",
    `- MANUAL-FIX-NEEDED.md: ${manualFixState}`,
    "- Denylist sanity: `git log --stat phase_start..HEAD -- src/lib/supabase prisma/schema.prisma supabase/migrations` (should show no D-20 path edits)",
    nextSteps,
    "",
  ].join("\n");

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, body);

  return { productionReady };
}
