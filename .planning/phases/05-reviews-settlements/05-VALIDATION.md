---
phase: 5
slug: reviews-settlements
status: active
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-11
revised: 2026-04-11
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from 05-RESEARCH.md § Validation Architecture. Populated by planner (revision 1) with real task IDs extracted from Plans 01-07.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x + Playwright 1.x (inherited from Phase 4) |
| **Config file** | `vitest.config.ts` (fileParallelism: false — set in Phase 4) |
| **Quick run command** | `npm test -- --run tests/reviews tests/settlements` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~90 seconds quick / ~180 seconds full (Phase 4 baseline 86s for 109 tests) |

---

## Sampling Rate

- **After every task commit:** Run quick scope (plan-specific test directory)
- **After every plan wave:** Run `npm test -- --run` full suite
- **Before verification:** Full suite green + `next build` clean + grep assertion for DATA-05
- **Max feedback latency:** 90 seconds for quick, 180 seconds for full

---

## Per-Task Verification Map

> Populated by planner revision 1 from Plans 01-07 actual task IDs. Wave 0 (Plan 01) creates the RED test files; downstream plans turn them GREEN.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | (Wave 0 fixtures) | T-05-11 | Phase 5 fixtures isolated to @test.local users with abort-on-prod guard | unit | `npx tsc --noEmit tests/fixtures/phase5/index.ts tests/fixtures/phase5/settlements.ts` | ❌ W0 creates | ⬜ pending |
| 05-01-02 | 01 | 1 | REV-01/REV-02/REV-03/REV-04 | T-05-02, T-05-03 | RED test scaffolds: 10 review test cases module-resolution fail | integration | `npx vitest run tests/reviews 2>&1` (expect RED) | ❌ W0 creates | ⬜ pending |
| 05-01-03 | 01 | 1 | SETL-01/SETL-02/SETL-03/DATA-05 | T-05-10 | RED test scaffolds: 4 settlement+exit test files module-resolution fail; VALIDATION.md re-verification | integration | `npx vitest run tests/settlements tests/exit 2>&1` (expect RED) | ❌ W0 creates | ⬜ pending |
| 05-03-01 | 03 | 3 | REV-01/REV-03/REV-04 | T-05-02, T-05-03 | createWorkerReview persists row once; atomic rating aggregation via $transaction+$executeRaw | integration | `npm test -- --run tests/reviews/create-worker-to-biz.test.ts tests/reviews/uniqueness.test.ts tests/reviews/aggregate.test.ts` | ✅ W0 | ⬜ pending |
| 05-03-02 | 03 | 3 | REV-02/REV-03/REV-04 | T-05-01, T-05-02 | createBusinessReview persists row once; ownership gate via requireJobOwner; atomic rating aggregation | integration | `npm test -- --run tests/reviews/create-biz-to-worker.test.ts` | ✅ W0 | ⬜ pending |
| 05-03-03 | 03 | 3 | REV-01/REV-02 | — | Review query helpers (getReviewByApplication, getReviewsForUser) | unit | `npx tsc --noEmit src/lib/db/queries.ts` | — | ⬜ pending |
| 05-04-01 | 04 | 3 | SETL-01 | T-05-17 | checkOut flips status=settled in single txn + safeRevalidate migration + Phase 4 regression intact | integration | `npm test -- --run tests/applications tests/settlements/checkout-settled-transition.test.ts` | ✅ W0 | ⬜ pending |
| 05-04-02 | 04 | 3 | SETL-02/SETL-03 | T-05-07, T-05-15 | Worker + biz settlement queries return correct aggregates with Asia/Seoul boundary | integration | `npm test -- --run tests/settlements/worker-aggregates.test.ts tests/settlements/biz-history.test.ts` | ✅ W0 | ⬜ pending |
| 05-06-01 | 06 | 5 | DATA-05 | T-05-10 | prisma/seed.ts detached from src/lib/mock-data via inlined/extracted seed-data | unit | `npx tsx prisma/seed.ts` (smoke) | — | ⬜ pending |
| 05-06-02 | 06 | 5 | DATA-05 | T-05-10, T-05-23 | mock-data.ts absent + grep 0 matches + Mock* aliases stripped | unit | `npm test -- --run tests/exit/mock-removal.test.ts` | ✅ W0 | ⬜ pending |
| 05-07-01 | 07 | 6 | REV-01..04, SETL-01..03, DATA-05 | T-05-25 | Full gate evidence captured in 05-VERIFICATION.md (no fabricated numbers) | e2e | `npx vitest run && NODE_ENV=production npx next build` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 (Plan 01) creates RED-state stubs for all the test files referenced above:

- [ ] `tests/reviews/create-worker-to-biz.test.ts` — REV-01 happy path + error cases
- [ ] `tests/reviews/create-biz-to-worker.test.ts` — REV-02 happy path + error cases
- [ ] `tests/reviews/uniqueness.test.ts` — REV-03 duplicate guard under concurrency
- [ ] `tests/reviews/aggregate.test.ts` — REV-04 atomic rating math + reviewCount increment
- [ ] `tests/settlements/checkout-settled-transition.test.ts` — SETL-01 single-txn status flip (uses todo-then-promote pattern for enum safety; see H1 fix)
- [ ] `tests/settlements/biz-history.test.ts` — SETL-02 RLS/ownership + result shape
- [ ] `tests/settlements/worker-aggregates.test.ts` — SETL-03 sum/this-month KST boundary
- [ ] `tests/exit/mock-removal.test.ts` — DATA-05 grep assertion, exit code gate
- [ ] `tests/fixtures/phase5/index.ts` — shared fixtures (settled applications with earnings, past reviews)

**Framework install:** None — Phase 4 Wave 0 already installed vitest + playwright + all test helpers. Phase 5 reuses the exact same test setup.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end loop under 1 min | Phase 5 success criterion #5 | Requires real browser session, real DB, stopwatch | Seed fresh test user, run `탐색 → 지원 → 확정 → 체크인 → 체크아웃 → 리뷰 → 정산` against live Supabase, time the full loop |
| Review UX feel matches Timee | REV-01/02 subjective | Taste call — cannot automate | Open `/my/applications/[id]/review`, verify star picker, tag chips, textarea follow the check-in confirmation flow's visual rhythm |
| Settlement list mobile readability | SETL-01/02/03 layout | Visual — needs mobile viewport | `/my/settlements` and `/biz/settlements` at 375px width, verify no horizontal scroll, totals readable |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (Planner confirmed during revision 1)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 01 creates all 8 test files + VALIDATION.md re-verification)
- [x] No watch-mode flags (Phase 4 precedent: never use `--watch` in CI path)
- [x] Feedback latency < 90s quick / 180s full
- [x] `nyquist_compliant: true` set in frontmatter (revision 1)

**Approval:** populated by planner revision 1 (2026-04-11). Plan 01 Task 3 re-verifies this map is still populated after Wave 0 test file creation.
