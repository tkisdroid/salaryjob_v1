---
phase: 9
slug: ui-ux-full-sweep-55-routes-desktop-mobile-375px
status: plans-authored
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-23
updated: 2026-04-23
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `09-RESEARCH.md` Validation Architecture section;
> finalized 2026-04-23 by planner to match 09-01/02/03-PLAN.md tasks.
> `nyquist_compliant` flips to `true` during Task 03-02 after human sign-off in Task 03-03.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | @playwright/test 1.59.1 (e2e) + @axe-core/playwright 4.11.2 + vitest 3.2.4 (static-analysis unit tests) |
| **Config file** | `playwright.config.ts` (existing — projects `review-desktop` + `mobile-375`); Phase 9 specs inherit via `testDir: './tests/review'`; no playwright.config.ts edit needed |
| **Quick run command** | `REVIEW_RUN=1 npx playwright test tests/review/phase9/worker-checklist.spec.ts --project=review-desktop` (single spec, ~3-5 min) |
| **Full suite command** | `REVIEW_RUN=1 npm run review:phase9` (wired by Plan 01 Task 01-04 — runs 5 Playwright specs under both projects; ~20-30 min) + `npx vitest run tests/review/phase9/token-drift.test.ts` |
| **Estimated runtime** | quick ≤ 5 min; full sweep ~25 min matching Phase 07.1 D-17 budget |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit` + touched spec via Playwright `--list` to confirm registration.
- **After Plan 01 wave complete:** `npm run review:phase9:verify` (bootstrap; exits 0) + `npm run review:phase9:tokens` (drift analyzer dry-run).
- **After Plan 02 wave complete:** `REVIEW_RUN=1 npm run review:phase9 -- --project=review-desktop --grep @phase9-worker` (single-persona smoke, ~5 min).
- **Before `/gsd:verify-work 9`:** Full `npm run review:phase9` must run AND `.review/phase9-issues.json` aggregate must show 0 critical / 0 high without fixCommit (`--verify` exits 0).
- **Max feedback latency:** 60s for Plan 01 tasks; 5 min for Plan 02 per-spec smoke; 25-30 min for full sweep per viewport × persona matrix.

---

## Per-Task Verification Map

*Finalized 2026-04-23 matching 09-01/02/03-PLAN.md task IDs and commands.*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 0 | QA-01..05 (infra) | infra | `npx tsc --noEmit && test -f tests/review/phase9/checklist-base.ts && test -f tests/review/phase9/config/token-allowlist.json && test -f tests/review/phase9/config/empty-state-map.json && grep -q "TAB_BAR_HEIGHT" tests/review/phase9/checklist-base.ts` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 0 | QA-01..05 (infra) | infra | `npx tsc --noEmit && test -f tests/review/phase9/fixtures/empty-state.ts && grep -q "seedEmptyProfile" tests/review/phase9/fixtures/empty-state.ts && npx tsx tests/review/phase9/fixtures/empty-state.ts --dry-run` | ❌ W0 | ⬜ pending |
| 09-01-03 | 01 | 0 | QA-01..05 (infra) | infra | `npx tsc --noEmit && test -f scripts/review/phase9-issue-writer.ts && test -f scripts/review/phase9-token-drift.ts && test -f scripts/review/phase9-report-writer.ts && npx tsx scripts/review/phase9-issue-writer.ts --verify` | ❌ W0 | ⬜ pending |
| 09-01-04 | 01 | 0 | QA-01..05 (infra) | infra | `test -f .review/.gitkeep && grep -q "review:phase9" package.json && grep -q ".review/\*.json" .gitignore && grep -q "!.review/.gitkeep" .gitignore && npm run review:phase9:verify && REVIEW_RUN=1 npx playwright test tests/review/phase9/ --list` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 1 | QA-01 | e2e | `npx tsc --noEmit && REVIEW_RUN=1 npx playwright test tests/review/phase9/worker-checklist.spec.ts --list` (expect 40 tests listed: 20 worker routes × 2 projects) | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 1 | QA-02, QA-03 | e2e | `npx tsc --noEmit && REVIEW_RUN=1 npx playwright test tests/review/phase9/biz-checklist.spec.ts --list && REVIEW_RUN=1 npx playwright test tests/review/phase9/admin-checklist.spec.ts --list` (expect 40 biz + 8 admin tests listed) | ❌ W0 | ⬜ pending |
| 09-02-03 | 02 | 1 | QA-01, QA-02, QA-03 | e2e | `REVIEW_RUN=1 npx playwright test tests/review/phase9/empty-state.spec.ts --list` (expect 24 tests listed: 12 routes × 2 projects) — requires seedEmptyProfile/restorePopulatedProfile hooks grep-matched | ❌ W0 | ⬜ pending |
| 09-02-04 | 02 | 1 | QA-05 (tab-bar) | e2e | `REVIEW_RUN=1 npx playwright test tests/review/phase9/tab-bar-occlusion.spec.ts --list` (expect 108 tests listed: 54 routes × 2 projects, runtime skips non-mobile-375 and HIDE_TAB_BAR_PATTERNS) | ❌ W0 | ⬜ pending |
| 09-02-05 | 02 | 1 | QA-05 (token drift) + Phase 9 manifest sanity | static | `npx vitest run tests/review/phase9/token-drift.test.ts` (expect 6 assertions PASS: 54/20/20/4/10 sanity + scanDrift writes shard) | ❌ W0 | ⬜ pending |
| 09-03-01a | 03 | 3 | QA-04 (aggregate) | infra | `test -f .review/phase9-issues.json && npx tsx scripts/review/phase9-issue-writer.ts --stats` (prints {critical,high,medium,low,info,total} JSON) | ❌ W0 | ⬜ pending |
| 09-03-01b | 03 | 3 | QA-04 (fix loop) | checkpoint | MANUAL (blocking): human reviewer addresses every critical/high, populates `fixCommit: <sha>`, re-runs sweep until `npx tsx scripts/review/phase9-issue-writer.ts --verify` exits 0. Resume-signals: `all-C-H-resolved` / `paused: <reason>` / `stop: <reason>` | N/A (checkpoint) | ⬜ pending |
| 09-03-02 | 03 | 3 | QA-04 + closes QA-01..05 | integration | `npx tsx scripts/review/phase9-issue-writer.ts --verify && grep -q "^phase9_complete: true" .planning/phases/09-ui-ux-full-sweep-55-routes-desktop-mobile-375px/09-REVIEW.md && grep -q "^critical_issues: 0" .planning/phases/09-ui-ux-full-sweep-55-routes-desktop-mobile-375px/09-REVIEW.md && grep -q "^high_issues: 0" .planning/phases/09-ui-ux-full-sweep-55-routes-desktop-mobile-375px/09-REVIEW.md && grep -q "^routes_swept: 54" .planning/phases/09-ui-ux-full-sweep-55-routes-desktop-mobile-375px/09-REVIEW.md` | ❌ W0 | ⬜ pending |
| 09-03-03 | 03 | 3 | QA-01..05 sign-off | checkpoint | MANUAL (blocking): human attests all 5 ROADMAP Success Criteria, spot-checks 9 routes (3 per persona) in headed mode, flips REQUIREMENTS.md QA-01..QA-05 from in-progress to `complete (YYYY-MM-DD, commit <sha>)`, updates STATE.md Phase Progress + closure commit. Resume-signals: `signed-off: all 5 SC PASS` / `signed-off-with-deferrals: <list>` / `rework: <reason>` / `stop: <reason>` | N/A (checkpoint) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Coverage Verification

- **Requirement → Task traceability (finalized):**
  - **QA-01** (Worker routes checklist) → 09-02-01 (worker-checklist.spec.ts under both projects: worker × review-desktop + worker × mobile-375)
  - **QA-02** (Business routes checklist) → 09-02-02 (biz-checklist.spec.ts under both projects)
  - **QA-03** (Admin routes checklist) → 09-02-02 (admin-checklist.spec.ts under both projects)
  - **QA-04** (critical/high fix commits linked) → 09-03-01a (aggregate) + 09-03-01b (human fix loop, checkpoint) + 09-03-02 (`--verify` gate)
  - **QA-05** (token drift + duplicate button + tab-bar occlusion = 0) → 09-02-04 (tab-bar-occlusion.spec.ts) + 09-02-05 (token-drift.test.ts vitest) + button-dup bucket embedded in 09-02-01/02 specs
- **No task without verify:** every Plan 01/02/03 task has either an `<automated>` block (including the subset listed above) or a named `checkpoint:human-verify` with resume-signal contract. Checkpoints 09-03-01b + 09-03-03 are the only manual-only entries.
- **Sampling continuity:** no 3 consecutive tasks without automated verify — each manual checkpoint is bracketed by automated tasks (03-01a aggregate before 03-01b checkpoint; 03-02 verify-gate after 03-01b; 03-03 closure flip follows 03-02 with its own automated grep acceptance).

---

## Wave 0 Requirements

Wave 0 substrate (owned by Plan 01 — Tasks 01-01 through 01-04):

- [ ] `tests/review/phase9/checklist-base.ts` — Task 01-01 — shared fixtures: persona storage (STORAGE_STATE), viewport config (PHASE9_VIEWPORTS), TAB_BAR_HEIGHT=66, TAB_BAR_HIDDEN (2 regexes), routesForPersona(), isTabBarHidden(), Phase9Issue type
- [ ] `tests/review/phase9/config/token-allowlist.json` — Task 01-01 — 3-tier regex allowlist derived from globals.css `@theme inline`
- [ ] `tests/review/phase9/config/empty-state-map.json` — Task 01-01 — 12 entries mapping route → expected Korean empty-state phrase
- [ ] `tests/review/phase9/fixtures/empty-state.ts` — Task 01-02 — seedEmptyProfile() + restorePopulatedProfile() (destructive DELETE of fixture applications/jobs/reviews/settlements, keeps identity rows)
- [ ] `scripts/review/phase9-issue-writer.ts` — Task 01-03 — aggregator with `--aggregate` / `--verify` / `--stats` modes; consumes all `.review/phase9-*.json` shards into `.review/phase9-issues.json`
- [ ] `scripts/review/phase9-token-drift.ts` — Task 01-03 — static-analysis walker; reads token-allowlist.json; writes `.review/phase9-token-drift.json`
- [ ] `scripts/review/phase9-report-writer.ts` — Task 01-03 — emits 09-REVIEW.md with `phase9_complete` frontmatter + issue table + SC appendix placeholder
- [ ] `.review/.gitkeep` + `.gitignore` shards-ignore entry — Task 01-04
- [ ] `package.json` scripts: `review:phase9`, `review:phase9:tokens`, `review:phase9:aggregate`, `review:phase9:verify`, `review:phase9:report` — Task 01-04
- [ ] `REVIEW_MANIFEST_SELFCHECK=1 npx tsx tests/review/routes/manifest.ts` continues to pass (Phase 07.1 invariant — Phase 9 must not break it) — verified indirectly by `npx tsc --noEmit` + `npx playwright test tests/review/ --list`

**Framework install:** None. All runtime deps present; dev deps present per Phase 07.1 completion.

**`.planning/REQUIREMENTS.md` evolution:** Rows QA-01..QA-05 stay `pending` during Plan 01 (Wave 0) + Plan 02 (Wave 1), flip to `in-progress` during Plan 03 Task 03-02, flip to `complete (YYYY-MM-DD, commit <sha>)` during Plan 03 Task 03-03 human sign-off.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Task | Test Instructions |
|----------|-------------|------------|------|-------------------|
| Semantic fix authoring for critical/high findings | QA-04 | Phase 07.1 auto-fix loop is scoped to mechanical fixes (regex, unused imports). Phase 9 findings are semantic design decisions (CTA consolidation, empty-state copy, token palette alignment) and MUST be human-authored per RESEARCH.md Pitfall 4. | 09-03-01b | For each critical/high entry in `.review/phase9-issues.json`: read message+evidence, reproduce in browser, author fix in src/, commit as `fix(09): <slug> [qa-NN]`, populate `fixCommit: <short-sha>`, re-run full sweep. Repeat until `--verify` exits 0. |
| Visual spot-check (catches white-screen / skeleton-only / load-stuck states that pass automation) | QA-01, QA-02, QA-03 | axe + content assertions can PASS on placeholder/skeleton states; only a human eye catches "looks wrong but technically renders." | 09-03-03 (Part B) | Reviewer picks 3 random routes per persona (worker/biz/admin = 9), opens in headed browser at both Desktop (1440×900) + Mobile 375×812, confirms substantive content, clicks primary CTA, scrolls to bottom, records verdict in 09-REVIEW.md Visual Spot-Check section. New Phase9Issue if any fail. |
| 5 ROADMAP Success Criteria attestation | QA-01..05 | Numeric gates (counts=0, --verify exit 0) are necessary but not sufficient. SC #1-#5 require human judgment that the issue table ACTUALLY represents buckets fully cleared, not just technically zero. | 09-03-03 (Part A) | Reviewer reads 09-REVIEW.md issue table by persona, compares against each SC verbatim from ROADMAP Phase 9 §Success Criteria, marks PASS/FAIL with evidence reference. |
| Deferred-issue MOCK-LOG entry | QA-04 | External-key dependencies (e.g., real OCR, real Toss Payments) cannot be fixed in v1.1; must be deferred with documented re-verify path per milestone-wide MOCK Policy. | 09-03-01b (DEFER branch) | If human chooses DEFER for an issue, downgrade severity to `medium`, set `fixCommit: "deferred-v1.2-<slug>"`, append to `.planning/phases/09-*/MOCK-LOG.md` with mocked path / reason / re-verify step / target milestone. |
| Closure commit + REQUIREMENTS.md + STATE.md flip | QA-01..05 + milestone tracking | GSD workflow requires human-authored closure commits that carry the final short-SHA reference. Automation cannot self-attest milestone progress without human sign-off per milestone v1.1 acceptance gate. | 09-03-03 (Parts C, D) | Flip QA-01..05 rows from `in-progress` to `complete (YYYY-MM-DD, commit <sha>)`. Add Phase 9 = Complete row to STATE.md Phase Progress. Commit `docs(09): close Phase 9 — UI/UX Full Sweep signed off [qa-01..05]`. |

---

## Nyquist Compliance Notes

**`nyquist_compliant: false`** currently because:
1. Plan 01 + Plan 02 + Plan 03 tasks are authored (2026-04-23) but NOT yet executed — rows 09-01-01..09-03-03 all ⬜ pending.
2. Flips to `true` ONLY after Plan 03 Task 03-02 passes (`phase9_complete: true` in 09-REVIEW.md) AND Task 03-03 human sign-off recorded.

**Sampling bound checks (all satisfied by the plan design):**
- No watch-mode flags (`--watch` / `--ui`) anywhere in plans (grep-verify: `grep -rE "(--watch|--ui)" .planning/phases/09-*/09-0[123]-PLAN.md` returns 0 matches)
- Every Wave 1 task has `<automated>` block; checkpoints (09-03-01b, 09-03-03) bracketed by automated gates
- Full-sweep feedback latency ~25-30 min matches Phase 07.1 D-17 ≤ 30 min budget
- Per-task commit smoke ≤ 5 min (single-spec `--list` or vitest single-file)

---

## Validation Sign-Off

- [x] Every Plan 01/02/03 task has `<automated>` verify command OR `checkpoint:human-verify` gate with resume-signal contract
- [x] Sampling continuity preserved (no 3 consecutive tasks without automated verify)
- [x] Wave 0 substrate fully owned by Plan 01 Tasks 01-01..01-04 (enumerated above)
- [x] No watch-mode flags in any harness script
- [x] Feedback latency < 60s for per-file smoke; < 30 min for full sweep
- [ ] `nyquist_compliant: true` in frontmatter — flips during Plan 03 Task 03-02
- [ ] Rows 09-01-01..09-03-03 flipped to ✅ green as tasks execute
- [ ] Final approval: `/gsd:verify-work 9` after Plan 03 Task 03-03 `signed-off: all 5 SC PASS`

**Approval:** plans authored 2026-04-23; awaiting execution.
