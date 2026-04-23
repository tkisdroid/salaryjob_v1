---
phase: 9
slug: ui-ux-full-sweep-55-routes-desktop-mobile-375px
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-23
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `09-RESEARCH.md` Validation Architecture section; planner to finalize per-task rows.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | @playwright/test 1.59.1 (e2e) + @axe-core/playwright 4.11.2 + vitest 3.2.4 (static-analysis unit tests) |
| **Config file** | `playwright.config.ts` (existing — projects `review-desktop` + `mobile-375`); new `tests/review/phase9/*` specs + `.lighthouserc.js` reused from Phase 07.1 |
| **Quick run command** | `REVIEW_RUN=1 npx playwright test tests/review/phase9/ --project=review-desktop --grep @smoke` |
| **Full suite command** | `npm run review:phase9` (NEW — Wave 0 wires it; orchestrates 108 scenarios × 6 checklist specs + issue writer) |
| **Estimated runtime** | quick ≤ 60s; full sweep ≤ 45 min per viewport × 3 personas (worker/biz/admin) |

---

## Sampling Rate

- **After every task commit:** Run `vitest run` (token-drift static tests) + touched Playwright spec.
- **After every plan wave:** Run `npm run review:phase9 --grep @smoke` (Wave 0 smoke across 3 personas × 1 route).
- **Before `/gsd:verify-work`:** Full `npm run review:phase9` must exit 0 AND `.review/phase9-issues.json` shows 0 critical / 0 high (low/info allowed per QA-04 policy).
- **Max feedback latency:** 60 seconds for Wave 1 tasks; 45 minutes per persona × viewport for full sweep.

---

## Per-Task Verification Map

*Planner to finalize per-task rows based on RESEARCH.md Validation Architecture. Seed rows below cover QA-01..QA-05 buckets.*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 0 | QA-01..05 | infra | `test -f tests/review/phase9/checklist-base.ts && grep -q 'REVIEW_RUN' playwright.config.ts` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 0 | QA-01..05 | infra | `test -f scripts/review/phase9-issue-writer.ts && test -f .review/.gitkeep` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 1 | QA-01 | e2e | `npx playwright test tests/review/phase9/worker-*.spec.ts --project=review-desktop` (expect 0 failures) | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 1 | QA-02 | e2e | `npx playwright test tests/review/phase9/biz-*.spec.ts --project=review-desktop` (expect 0 failures) | ❌ W0 | ⬜ pending |
| 09-02-03 | 02 | 1 | QA-03 | e2e | `npx playwright test tests/review/phase9/admin-*.spec.ts --project=review-desktop` (expect 0 failures) | ❌ W0 | ⬜ pending |
| 09-02-04 | 02 | 2 | QA-01..03 | e2e | `npx playwright test tests/review/phase9/ --project=mobile-375` (expect 0 failures for button-dup, empty-state, error-toast, nav-gap buckets) | ❌ W0 | ⬜ pending |
| 09-02-05 | 02 | 2 | QA-05 | static | `npx vitest run tests/review/phase9/token-drift.test.ts && npx playwright test tests/review/phase9/tab-bar-occlusion.spec.ts --project=mobile-375` | ❌ W0 | ⬜ pending |
| 09-03-01 | 03 | 3 | QA-04 | checkpoint | MANUAL: human reviews `.review/phase9-issues.json`, authors fix commits per critical/high entry, links commit SHA → issue id, re-runs full sweep until 0 C/H | N/A (checkpoint) | ⬜ pending |
| 09-03-02 | 03 | 3 | QA-04 | integration | `node scripts/review/phase9-issue-writer.ts --verify` (expect 0 critical / 0 high; all C/H have linked `fixCommit` field) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Coverage Verification

- **Requirements coverage (seeded — planner must confirm):**
  - QA-01 → 09-02-01 (Worker routes × desktop) + 09-02-04 (Worker × mobile-375)
  - QA-02 → 09-02-02 (Biz routes × desktop) + 09-02-04 (Biz × mobile-375)
  - QA-03 → 09-02-03 (Admin routes × desktop) + 09-02-04 (Admin × mobile-375)
  - QA-04 → 09-03-01 (human fix loop) + 09-03-02 (issue-writer verify gate)
  - QA-05 → 09-02-05 (token-drift static + tab-bar occlusion)
- **No task without verify:** every Wave 1/2/3 task has either an automated command or a named checkpoint.
- **Sampling continuity:** no 3 consecutive tasks without automated verify.

---

## Wave 0 Requirements

Wave 0 substrate (planner seeds infra in Plan 01):

- [ ] `tests/review/phase9/checklist-base.ts` — shared fixtures: persona auth, viewport config, route-manifest importer (reuses Phase 07.1 `tests/review/routes/manifest.ts`)
- [ ] `tests/review/phase9/fixtures/empty-state.ts` — seed overlay for "empty" persona (worker with 0 applications, biz with 0 jobs, admin with 0 pending biz)
- [ ] `scripts/review/phase9-issue-writer.ts` — structured issue writer: reads Playwright test attachments, writes `.review/phase9-issues.json` with fields (id, severity, route, viewport, bucket, evidence, fixCommit)
- [ ] `.review/.gitkeep` — output directory exists
- [ ] `playwright.config.ts` — add `phase9` project tag OR confirm existing `review-desktop`/`mobile-375` suffice
- [ ] `package.json` — add `review:phase9` npm script invoking the full sweep
- [ ] `.planning/REQUIREMENTS.md` — QA-01..QA-05 status moved from `pending` to `in-progress` when Wave 1 starts

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual spot-check (white-screen / skeleton-only / content-loading-stuck false-PASS) | QA-01..03 | axe + content assertions can PASS on placeholder/skeleton states — needs human eye on 3 random routes per persona | Verifier opens 3 random routes per persona (worker/biz/admin) from `tests/review/routes/manifest.ts`; confirms substantive content rendered; fail phase if any blank. |
| shadcn design-taste subjective call | QA-05 | Token drift regex catches hardcoded values but can't judge whether a deliberate custom spacing is acceptable (e.g. hero section may have a designed exception) | Verifier reviews each token-drift finding; marks as accept (append to allowlist) or reject (fix required). |
| Fix-commit human authoring | QA-04 | Phase 07.1 auto-fix loop is scoped to mechanical fixes (unused imports, regex replacements). Phase 9 findings are semantic (design decisions, copy changes, UX flow) and MUST be human-authored per RESEARCH.md Pitfall 4. | For each critical/high entry in `.review/phase9-issues.json`, human authors a fix commit; appends `fixCommit: <sha>` to the issue entry; re-runs the full sweep; repeats until 0 C/H remain. |
| Error-toast injection acceptance | QA-01..03 | Playwright route interception produces synthetic 500s — human must confirm the toast copy and visual treatment match the product voice (Korean, friendly, not technical) | Verifier triggers 1 error per persona via the harness, reads the toast, confirms copy acceptable or files an issue. |

---

## Nyquist Compliance Notes

**`nyquist_compliant: false` (pending planner finalization)** because:
1. Per-task rows 09-02-* and 09-03-* are seeded but planner must split the per-viewport × per-persona matrix into concrete tasks (RESEARCH.md open question #3 about parallelism).
2. Wave 0 substrate is enumerated but not yet owned by a plan task.

**Planner to flip `nyquist_compliant: true`** once:
- Every task has `<verify><automated>` block OR `checkpoint:human-verify` gate
- Wave 0 substrate fully owned by Plan 01 tasks
- No watch-mode flags (`--watch` / `--ui`) in harness scripts
- Feedback latency fits the bound (60s Wave 1 / 45min full sweep per persona × viewport)

**`wave_0_complete: true`** once Plan 01 Tasks 01-01 + 01-02 commit.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify command or manual checkpoint
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (enumerated above)
- [ ] No watch-mode flags (`--watch` / `--ui` banned in harness scripts)
- [ ] Feedback latency < 60s for Wave 1 tasks, < 45 min for full sweep per persona × viewport
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending (awaiting planner to finalize per-task rows; then `/gsd:verify-work 9` for final approval after execution).
