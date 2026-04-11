---
phase: 5
slug: reviews-settlements
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from 05-RESEARCH.md § Validation Architecture. The planner fills the Per-Task Verification Map during plan creation.

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

> Filled by planner during plan creation. Template rows below — expand with actual task IDs.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-XX-YY | XX | N | REV-01 | T-05-XX | Worker can write biz review exactly once per application | integration | `npm test -- --run tests/reviews/create-worker-to-biz.test.ts` | ❌ W0 | ⬜ pending |
| 05-XX-YY | XX | N | REV-02 | T-05-XX | Business can write worker review exactly once per application | integration | `npm test -- --run tests/reviews/create-biz-to-worker.test.ts` | ❌ W0 | ⬜ pending |
| 05-XX-YY | XX | N | REV-03 | T-05-XX | Unique constraint on (applicationId, direction) rejects duplicates | integration | `npm test -- --run tests/reviews/uniqueness.test.ts` | ❌ W0 | ⬜ pending |
| 05-XX-YY | XX | N | REV-04 | T-05-XX | rating/reviewCount updates atomically on review insert | integration | `npm test -- --run tests/reviews/aggregate.test.ts` | ❌ W0 | ⬜ pending |
| 05-XX-YY | XX | N | SETL-01 | T-05-XX | checkOut flips status=settled + earnings locked in single txn | integration | `npm test -- --run tests/settlements/checkout-settled-transition.test.ts` | ❌ W0 | ⬜ pending |
| 05-XX-YY | XX | N | SETL-02 | T-05-XX | getBizSettlements returns only own jobs' settled earnings | integration | `npm test -- --run tests/settlements/biz-history.test.ts` | ❌ W0 | ⬜ pending |
| 05-XX-YY | XX | N | SETL-03 | T-05-XX | Worker total + this-month aggregates match sum of settled | integration | `npm test -- --run tests/settlements/worker-aggregates.test.ts` | ❌ W0 | ⬜ pending |
| 05-XX-YY | XX | N | DATA-05 | — | grep `mock-data` in src/ (excl. src/generated/) returns 0 | unit | `npm test -- --run tests/exit/mock-removal.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 (Foundation plan) must create RED-state stubs for all the test files referenced above:

- [ ] `tests/reviews/create-worker-to-biz.test.ts` — REV-01 happy path + error cases
- [ ] `tests/reviews/create-biz-to-worker.test.ts` — REV-02 happy path + error cases
- [ ] `tests/reviews/uniqueness.test.ts` — REV-03 duplicate guard under concurrency
- [ ] `tests/reviews/aggregate.test.ts` — REV-04 atomic rating math + reviewCount increment
- [ ] `tests/settlements/checkout-settled-transition.test.ts` — SETL-01 single-txn status flip
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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (Planner fills)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (Planner checks)
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (Phase 4 precedent: never use `--watch` in CI path)
- [ ] Feedback latency < 90s quick / 180s full
- [ ] `nyquist_compliant: true` set in frontmatter after planner completes the map

**Approval:** pending (planner will flip on successful /gsd-plan-phase verification loop)
