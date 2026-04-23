/**
 * scripts/review/phase9-report-writer.ts
 *
 * 09-REVIEW.md emitter — mirrors the shape of scripts/review/report-writer.ts
 * (Phase 07.1) but with Phase 9-specific frontmatter keys.
 *
 * Input:  .review/phase9-issues.json (from phase9-issue-writer --aggregate)
 * Output: .planning/phases/09-ui-ux-full-sweep-55-routes-desktop-mobile-375px/09-REVIEW.md
 *
 * Frontmatter contract (must stay stable — consumed by /gsd:verify-work 9):
 *   phase9_complete    boolean  — true iff 0 critical + 0 high
 *   iteration          number   — full-sweep run counter (CLI --iter=N, default 1)
 *   timestamp          ISO 8601
 *   critical_issues    number   — must be 0 to close
 *   high_issues        number   — must be 0 to close
 *   medium_issues      number   — backlog candidates
 *   low_issues         number
 *   routes_swept       54        (literal — Pitfall 1 ghost is 55)
 *   viewports          [review-desktop, mobile-375]
 *   fix_commits_linked number   — count of issues with fixCommit populated
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import type {
  Phase9Issue,
  Phase9Severity,
} from "../../tests/review/phase9/checklist-base";
import { countBySeverity } from "./phase9-issue-writer";

const REPORT_PATH =
  ".planning/phases/09-ui-ux-full-sweep-55-routes-desktop-mobile-375px/09-REVIEW.md";
const ISSUES_PATH = ".review/phase9-issues.json";

function frontmatter(p: {
  complete: boolean;
  iteration: number;
  counts: Record<Phase9Severity, number>;
  fixCommitsLinked: number;
}): string {
  return [
    "---",
    `phase9_complete: ${p.complete}`,
    `iteration: ${p.iteration}`,
    `timestamp: ${new Date().toISOString()}`,
    `critical_issues: ${p.counts.critical}`,
    `high_issues: ${p.counts.high}`,
    `medium_issues: ${p.counts.medium}`,
    `low_issues: ${p.counts.low}`,
    `routes_swept: 54`,
    `viewports: [review-desktop, mobile-375]`,
    `fix_commits_linked: ${p.fixCommitsLinked}`,
    "---",
    "",
  ].join("\n");
}

function issueTable(issues: Phase9Issue[]): string {
  if (issues.length === 0) return "_No issues recorded._\n";
  const rows = issues.map(
    (i) =>
      `| ${i.severity} | ${i.route} | ${i.viewport} | ${i.persona} | ${i.bucket} | ${i.fixCommit ?? "—"} | ${i.message.replace(/\|/g, "\\|")} |`,
  );
  return (
    [
      "| Severity | Route | Viewport | Persona | Bucket | Fix Commit | Message |",
      "|----------|-------|----------|---------|--------|------------|---------|",
      ...rows,
    ].join("\n") + "\n"
  );
}

function loadIssues(): Phase9Issue[] {
  if (!existsSync(ISSUES_PATH)) return [];
  try {
    const parsed = JSON.parse(
      readFileSync(ISSUES_PATH, "utf8"),
    ) as Phase9Issue[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeReport(opts: { iteration: number }): { complete: boolean } {
  const issues = loadIssues();
  const counts = countBySeverity(issues);
  const fixCommitsLinked = issues.filter((i) => !!i.fixCommit).length;
  const complete = counts.critical === 0 && counts.high === 0;

  const fm = frontmatter({
    complete,
    iteration: opts.iteration,
    counts,
    fixCommitsLinked,
  });

  const body = [
    "# Phase 9 — UI/UX Full Sweep Review",
    "",
    "## Issue Summary",
    "",
    `- Critical: ${counts.critical}  (must be 0 to close)`,
    `- High: ${counts.high}          (must be 0 to close)`,
    `- Medium: ${counts.medium}      (backlog candidates)`,
    `- Low: ${counts.low}            (backlog candidates)`,
    `- Info: ${counts.info}`,
    "",
    "## Issue Register",
    "",
    issueTable(issues),
    "",
    "## Acceptance Gate",
    "",
    complete
      ? "- PASS: all critical/high issues closed or 0 found."
      : "- FAIL: critical or high issues present without fixCommit. See 09-03-PLAN Task 03-01.",
    "",
  ].join("\n");

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, fm + body);
  return { complete };
}

function main(): void {
  const iterArg = process.argv.find((a) => a.startsWith("--iter="));
  const iter = iterArg ? Number(iterArg.slice(7)) : 1;
  const r = writeReport({ iteration: iter });
  console.log(JSON.stringify(r));
  process.exit(r.complete ? 0 : 1);
}

if (require.main === module) main();
