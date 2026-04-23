/**
 * scripts/review/review-runner.ts
 *
 * Phase 07.1 single-route smoke runner (Plan 01 Task 4).
 * Source of truth: D-17 (aggregate ALL gates before reporting — DO NOT short-circuit);
 *                  SC #1 substrate (exit 0 on smoke path).
 *
 * CLI:
 *   npx tsx scripts/review/review-runner.ts --route=<path> [--smoke] [--skip-stack]
 *   npm run review:smoke   (sets REVIEW_RUN=1 and --route=/)
 *
 * In Plan 01 this exercises the SINGLE-ROUTE smoke path. Plan 02's run-full-sweep.ts
 * reuses the same shape for 108 scenarios × 7 flows.
 *
 * Gates exercised in smoke:
 *   G6 (tsc), G7 (eslint), G16 (vitest), G1/G2/G3/G4/G5/G8/G13/G14 (Playwright spec),
 *   G9/G10/G11/G12 (LHCI).
 * NOT exercised in smoke: G15 (7 E2E loops — Plan 02).
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

type GateResult = {
  id: string;
  name: string;
  passed: boolean;
  observed: string;
  message?: string;
};

const IS_WINDOWS = process.platform === "win32";

function runGate(
  cmd: string,
  args: readonly string[],
): { status: number; stderr: string; stdout: string } {
  const r = spawnSync(cmd, [...args], {
    encoding: "utf8",
    shell: IS_WINDOWS,
    env: { ...process.env, REVIEW_RUN: "1" },
  });
  return {
    status: r.status ?? 1,
    stderr: r.stderr ?? "",
    stdout: r.stdout ?? "",
  };
}

async function runSmokeGates(route: string): Promise<GateResult[]> {
  const results: GateResult[] = [];

  // G6 — TypeScript compile check
  {
    const r = runGate("npx", ["tsc", "--noEmit"]);
    results.push({
      id: "G6",
      name: "TypeScript",
      passed: r.status === 0,
      observed: r.status === 0 ? "0 errors" : "errors present",
      message: r.stderr || r.stdout,
    });
  }

  // G7 — ESLint (warnings allowed, errors not)
  {
    const r = runGate("npx", ["eslint", ".", "--max-warnings=-1"]);
    results.push({
      id: "G7",
      name: "ESLint",
      passed: r.status === 0,
      observed: r.status === 0 ? "0 errors" : "errors present",
      message: r.stderr || r.stdout.slice(-2000),
    });
  }

  // G16 — vitest regression baseline (SC #9)
  {
    const r = runGate("npx", ["vitest", "run"]);
    results.push({
      id: "G16",
      name: "vitest",
      passed: r.status === 0,
      observed: r.status === 0 ? "all pass" : "failures present",
      message: r.stderr || r.stdout.slice(-2000),
    });
  }

  // G1..G5 + G8 + G13 + G14 — Playwright smoke spec
  // (the spec itself in tests/review/smoke/root-smoke.spec.ts wraps hookErrorCollectors +
  //  checkPageReady + runAxeCriticalSerious + probeCta)
  {
    const r = runGate("npx", [
      "playwright",
      "test",
      "--project=review-desktop",
      "--grep",
      "@smoke",
    ]);
    results.push({
      id: "G1-G5,G8,G13,G14",
      name: "Playwright smoke",
      passed: r.status === 0,
      observed: r.status === 0 ? "pass" : "fail",
      message: r.stderr || r.stdout.slice(-2000),
    });
  }

  // G9..G12 — Lighthouse CI autorun
  {
    const lhciUrl =
      route === "/" ? "http://localhost:3000" : `http://localhost:3000${route}`;
    const r = runGate("npx", [
      "lhci",
      "autorun",
      `--collect.url=${lhciUrl}`,
    ]);
    results.push({
      id: "G9-G12",
      name: "Lighthouse CI",
      passed: r.status === 0,
      observed: r.status === 0 ? "within budget" : "budget exceeded",
      message: r.stderr || r.stdout.slice(-2000),
    });
  }

  return results;
}

async function main(): Promise<void> {
  const routeArg = process.argv.find((a) => a.startsWith("--route="));
  const route = routeArg ? routeArg.slice("--route=".length) : "/";

  mkdirSync(".review", { recursive: true });

  console.log(`[review:smoke] route=${route}`);
  const results = await runSmokeGates(route);
  writeFileSync(".review/smoke-results.json", JSON.stringify(results, null, 2));

  const passCount = results.filter((r) => r.passed).length;
  console.log(
    `\n[review:smoke] route=${route} gates=${results.length} passed=${passCount}`,
  );
  for (const r of results) {
    console.log(
      `  ${r.id.padEnd(18)} ${r.name.padEnd(18)} ${r.passed ? "PASS" : "FAIL"} (${r.observed})`,
    );
  }

  const allPassed = results.every((r) => r.passed);
  process.exit(allPassed ? 0 : 1);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[review:smoke] error:", msg);
  process.exit(1);
});
