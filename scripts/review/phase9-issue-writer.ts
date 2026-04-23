/**
 * scripts/review/phase9-issue-writer.ts
 *
 * Phase 9 issue aggregator + QA-04 verify gate.
 *
 * Input shards: .review/phase9-*.json (written by Plan 02 specs and by
 * phase9-token-drift.ts).
 * Aggregate:    .review/phase9-issues.json (deduped by Phase9Issue.id).
 *
 * CLI modes:
 *   --aggregate    Read shards, write aggregate, print count summary.
 *   --verify       Exit 0 iff (critical+high === 0) AND every C/H has fixCommit.
 *                  This is the gate Plan 03 Task 03-02 runs before sign-off.
 *   --stats        Print {critical, high, medium, low, info, total} single JSON line.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type {
  Phase9Issue,
  Phase9Severity,
} from "../../tests/review/phase9/checklist-base";

const REVIEW_DIR = ".review";
const AGGREGATE_PATH = join(REVIEW_DIR, "phase9-issues.json");
const SHARD_RE = /^phase9-.*\.json$/;

/**
 * Read every .review/phase9-*.json shard (excluding the aggregate itself)
 * and return a de-duplicated list keyed by Phase9Issue.id.
 */
export function aggregateShards(): Phase9Issue[] {
  if (!existsSync(REVIEW_DIR)) return [];
  const files = readdirSync(REVIEW_DIR).filter(
    (f) => SHARD_RE.test(f) && f !== "phase9-issues.json",
  );
  const seen = new Map<string, Phase9Issue>();
  for (const f of files) {
    try {
      const raw = readFileSync(join(REVIEW_DIR, f), "utf8");
      const arr = JSON.parse(raw) as Phase9Issue[];
      if (!Array.isArray(arr)) continue;
      for (const iss of arr) {
        if (iss && typeof iss.id === "string") seen.set(iss.id, iss);
      }
    } catch (err) {
      console.error(
        `[phase9-issue-writer] skip malformed shard ${f}: ${(err as Error).message}`,
      );
    }
  }
  return [...seen.values()];
}

export function writeAggregate(issues: Phase9Issue[]): void {
  mkdirSync(REVIEW_DIR, { recursive: true });
  writeFileSync(AGGREGATE_PATH, JSON.stringify(issues, null, 2));
}

export function countBySeverity(
  issues: Phase9Issue[],
): Record<Phase9Severity, number> {
  const counts: Record<Phase9Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const i of issues) counts[i.severity]++;
  return counts;
}

export type VerifyOutcome = {
  ok: boolean;
  reason?: string;
  counts: Record<Phase9Severity, number>;
};

/**
 * QA-04 gate: every critical + high issue must carry a fixCommit SHA.
 * Plan 03 Task 03-02 invokes this via `npm run review:phase9:verify`.
 */
export function verifyIssues(issues: Phase9Issue[]): VerifyOutcome {
  const counts = countBySeverity(issues);
  const blockers = issues.filter(
    (i) => i.severity === "critical" || i.severity === "high",
  );
  const unfixed = blockers.filter((i) => !i.fixCommit);
  if (unfixed.length > 0) {
    return {
      ok: false,
      reason: `${unfixed.length} critical/high issue(s) without fixCommit: ${unfixed
        .map((i) => i.id)
        .join(", ")}`,
      counts,
    };
  }
  return { ok: true, counts };
}

function loadAggregate(): Phase9Issue[] {
  if (!existsSync(AGGREGATE_PATH)) return [];
  try {
    const parsed = JSON.parse(
      readFileSync(AGGREGATE_PATH, "utf8"),
    ) as Phase9Issue[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function main(): void {
  if (process.argv.includes("--aggregate")) {
    const issues = aggregateShards();
    writeAggregate(issues);
    const counts = countBySeverity(issues);
    console.log(
      `[phase9-issue-writer] aggregated ${issues.length} issue(s): ${JSON.stringify(counts)}`,
    );
    process.exit(0);
  }
  if (process.argv.includes("--verify")) {
    const result = verifyIssues(loadAggregate());
    console.log(JSON.stringify(result));
    process.exit(result.ok ? 0 : 1);
  }
  if (process.argv.includes("--stats")) {
    const issues = loadAggregate();
    const counts = countBySeverity(issues);
    console.log(JSON.stringify({ ...counts, total: issues.length }));
    process.exit(0);
  }
  console.error("usage: --aggregate | --verify | --stats");
  process.exit(2);
}

if (require.main === module) main();
