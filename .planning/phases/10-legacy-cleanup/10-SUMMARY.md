---
phase: 10-legacy-cleanup
plan: 10 (inline — no per-plan numbering; executor-planned Phase 10)
subsystem: infra
tags: [legacy-cleanup, ci-gate, mock-data, regression-prevention]

requires:
  - phase: 05-reviews-settlements
    provides: src/lib/mock-data.ts deletion + /my/schedule rewired to real Supabase queries (commits 6c5b5b2, d24e452)
  - phase: 04-db
    provides: /api/push/register route deletion + Server Action migration (Plan 04-06)

provides:
  - scripts/check-no-mock-imports.mjs — zero-dep Node grep gate for mock-data import regression
  - package.json "check:no-mock" npm script (D-20 compliant addition)
  - LEG-01 / LEG-02 / LEG-03 verification evidence documents
  - Formal closure of v1.0 carry-over legacy cleanup backlog

affects: [phase-11-worker-flow-codex-12-filled, phase-12-business-flow-codex-13-crud, phase-13-admin-codex-10, future-phases]

tech-stack:
  added: [node script regression gate]
  patterns: [cross-platform zero-dep CI checks via node .mjs, regex parity with vitest exit gates]

key-files:
  created:
    - scripts/check-no-mock-imports.mjs
    - .planning/phases/10-legacy-cleanup/10-LEG-01-VERIFICATION.md
    - .planning/phases/10-legacy-cleanup/10-LEG-02-VERIFICATION.md
    - .planning/phases/10-legacy-cleanup/10-LEG-03-VERIFICATION.md
    - .planning/phases/10-legacy-cleanup/10-SUMMARY.md
  modified:
    - package.json (scripts section only — "check:no-mock")

key-decisions:
  - "LEG-01/LEG-02 were pre-satisfied by Phase 4/5 work. Documented as verification-only instead of fabricating redundant mutations."
  - "Chose Node (.mjs) over bash (.sh) for check-no-mock-imports because repo is Windows-primary, has no existing .sh files, and Node is cross-platform CI friendly."
  - "Pre-commit hook wiring deferred to manual/CI invocation — husky is not a devDep and .github/workflows/ infra is out of scope per phase Hard NO list."
  - "Grep gate regex matches tests/exit/mock-removal.test.ts line 67 byte-for-byte so the two gates never disagree."

patterns-established:
  - "Phase 10 legacy-cleanup pattern: verification evidence files for already-satisfied requirements are first-class deliverables, not placeholders."
  - "Regression gates for removed artifacts ship alongside the cleanup phase that certifies their removal."

requirements-completed: [LEG-01, LEG-02, LEG-03]

duration: 7m
completed: 2026-04-22
---

# Phase 10: Legacy Cleanup & Milestone Close Summary

**Phase 1 legacy remnants certified gone (both already pre-removed by Phase 4/5) and a zero-dependency Node grep gate installed to prevent `src/lib/mock-data` import regression via `npm run check:no-mock`.**

## Performance

- **Duration:** 7 min (2026-04-22T19:54:29Z -> 2026-04-22T20:02:05Z)
- **Started:** 2026-04-22T19:54:29Z
- **Completed:** 2026-04-22T20:02:05Z
- **Tasks:** 3 (+ 1 closure task)
- **Files created:** 5
- **Files modified:** 1 (`package.json` scripts section only)
- **Commits:** 3 task commits + 1 closure commit (this file)

## Accomplishments

- **LEG-01 certified satisfied** — `/my/schedule/page.tsx` reads real worker availability from `prisma.workerProfile` and real job matches from `getWorkerJobMatches()`. No MOCK constants exist. Verification: `.planning/phases/10-legacy-cleanup/10-LEG-01-VERIFICATION.md`.
- **LEG-02 certified satisfied** — `/api/push/register` route was deleted in v1.0 Phase 4 Plan 06 (the file the requirement named no longer exists); push registration uses Supabase-Auth-aware Server Actions. Zero Clerk references in `src/` app code. Verification: `.planning/phases/10-legacy-cleanup/10-LEG-02-VERIFICATION.md`.
- **LEG-03 installed** — `scripts/check-no-mock-imports.mjs` + `npm run check:no-mock` gate catches any future `from "@/lib/mock-data"` or relative mock-data import at CI time. Red-Green verified: GREEN exit 0 on HEAD (212 files scanned), RED exit 1 with probe injection (clear error message). Verification: `.planning/phases/10-legacy-cleanup/10-LEG-03-VERIFICATION.md`.

## Task Commits

Each task was committed atomically:

1. **Task 1 (LEG-01):** verify `/my/schedule` already on real Supabase data — `d75164d` (docs)
2. **Task 2 (LEG-02):** verify push/register route already deleted, no Clerk TODOs — `61d981f` (docs)
3. **Task 3 (LEG-03):** install mock-data import grep gate — `8e2e9bc` (chore)

**Plan metadata (this commit):** `docs(10): complete Phase 10 legacy cleanup — SUMMARY + STATE + ROADMAP`

## Files Created/Modified

- `scripts/check-no-mock-imports.mjs` — Zero-dep Node regression gate. Walks `src/` and fails exit 1 on any `from "@/lib/mock-data"` or relative mock-data import. Exit 0 on clean (212 files scanned at HEAD).
- `package.json` — Added `"check:no-mock": "node scripts/check-no-mock-imports.mjs"` to `scripts`. `dependencies` / `devDependencies` untouched (D-20 compliant).
- `.planning/phases/10-legacy-cleanup/10-LEG-01-VERIFICATION.md` — Evidence that `/my/schedule/page.tsx` was already rewired to Prisma in Phase 5 commit `d24e452`.
- `.planning/phases/10-legacy-cleanup/10-LEG-02-VERIFICATION.md` — Evidence that `/api/push/register` route and its Clerk TODO were removed in v1.0 Phase 4 Plan 06; zero Clerk references in current `src/`.
- `.planning/phases/10-legacy-cleanup/10-LEG-03-VERIFICATION.md` — GREEN/RED verification transcript for the new grep gate + manual/CI invocation contract.
- `.planning/phases/10-legacy-cleanup/10-SUMMARY.md` — This file.

## Decisions Made

- **Verification-only for pre-satisfied requirements.** LEG-01 and LEG-02 were originally drafted in the v1.0 audit backlog (2026-04-13 and earlier) and carried forward into the v1.1 ROADMAP on 2026-04-15. By that date, Phase 4 Plan 06 (2026-04-11) had already deleted `/api/push/register` and Phase 5 live-app hardening (commit `d24e452`, 2026-04-11) had already rewired `/my/schedule` to real Supabase. The correct Phase 10 action was verification + documentation, not fabricated mutations.
- **Node over bash for the grep gate.** The spawning plan template suggested `.sh`, but no `.sh` files exist in `scripts/`, the repo is Windows-primary, and existing tooling is Node/tsx based. Using a `.mjs` script is cross-platform CI friendly and keeps regex parity with `tests/exit/mock-removal.test.ts` line 67 (same `IMPORT_PATTERN`).
- **Pre-commit wiring deferred to manual/CI fallback.** Husky is not a devDependency in `package.json` and no `.husky/` directory exists. `.github/workflows/` wiring is out of scope per the phase's Hard NO list ("Do NOT touch ... new infrastructure"). The documented fallback of manual + CI invocation was chosen; the complementary vitest gate (`tests/exit/mock-removal.test.ts`) already runs on every `npm test` so CI transitively enforces the same invariant.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched from bash (.sh) to Node (.mjs) for grep gate**
- **Found during:** Task 3 (LEG-03 gate installation)
- **Issue:** Plan template proposed `scripts/check-no-mock-imports.sh` using bash. Repo is Windows-primary, has no existing `.sh` files, and all `scripts/` tooling is Node (.ts via tsx or .mjs). A bash script would require WSL or git-bash on every dev box + CI runner and would diverge in regex flavor from the canonical vitest exit gate.
- **Fix:** Wrote `scripts/check-no-mock-imports.mjs` as a zero-dep Node script using the byte-for-byte same regex as `tests/exit/mock-removal.test.ts` line 67. npm script invocation changed from `bash scripts/check-no-mock-imports.sh` to `node scripts/check-no-mock-imports.mjs`.
- **Files modified:** `scripts/check-no-mock-imports.mjs` (new), `package.json`
- **Verification:** Red-Green transcript captured in `10-LEG-03-VERIFICATION.md`. GREEN = exit 0, 212 files scanned. RED = exit 1 on probe file with mock-data import, clear error listing offender.
- **Committed in:** `8e2e9bc` (Task 3 commit)

**2. [Rule 3 - Blocking] LEG-01 / LEG-02 reduced to verification-only**
- **Found during:** Tasks 1 and 2 (LEG-01 / LEG-02 planning)
- **Issue:** Plan template assumed `/my/schedule/page.tsx` still contained Phase 1 local MOCK constants and `/api/push/register/route.ts` still existed with a stale Clerk TODO. Inspection of HEAD showed both had been resolved by prior phases (Phase 5 commit `d24e452` for /my/schedule; v1.0 Phase 4 Plan 06 for /api/push/register). Fabricating edits to "remove" MOCKs that don't exist would have been dishonest and churned source control for no behavior change.
- **Fix:** Wrote verification-evidence documents capturing the current state with `find`/`grep`/`git log` outputs. Honored the "Hard NO — do NOT create new MOCK fallbacks as placeholders" clause by making no source edits.
- **Files modified:** None under `src/`. Verification files under `.planning/phases/10-legacy-cleanup/`.
- **Verification:**
  - LEG-01: `grep -nE "MOCK|mock" src/app/(worker)/my/schedule/page.tsx` -> no output (exit 1). Vitest exit gate `tests/exit/mock-removal.test.ts` 3/3 GREEN.
  - LEG-02: `find src -type f -name "route.ts" -path "*push*"` -> no output. `grep -rln -i "clerk" src/` -> only `src/generated/prisma/internal/class.ts` (generated SDL string, not a code path).
- **Committed in:** `d75164d` (LEG-01), `61d981f` (LEG-02)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking issue workarounds).
**Impact on plan:** No scope creep. Both deviations preserved plan intent — the CI gate works cross-platform; the cleanup certification is accurate and evidence-backed — while avoiding wasted edits and Windows-bash fragility.

## Issues Encountered

- `supabase/.temp/cli-latest` showed as an unrelated unstaged modification during Task 3 (auto-generated runtime state from Supabase CLI sessions). Excluded from commits; should be `.gitignore`-d at some future cleanup pass (out of scope for Phase 10).
- `.planning/phases/07.1-automated-review-harness-zero-error-gate/reviews/` appeared as untracked (auto-generated review harness output from prior Phase 07.1 executions). Left untouched; not part of Phase 10.

## User Setup Required

None — no external service configuration required. The grep gate is pure JavaScript with no env vars, no auth, no network.

## Next Phase Readiness

- **v1.1 cleanup backlog closed.** All three LEG requirements marked complete in traceability.
- **Phase 10 is now a floor, not a ceiling.** Any future re-introduction of `src/lib/mock-data` imports will be caught by two independent gates (`npm run check:no-mock` + `npx vitest run tests/exit/mock-removal.test.ts`).
- **Dependents unblocked:** Phase 11 (Worker Flow), Phase 12 (Business Flow), Phase 13 (Admin + Common) already completed against the underlying real-DB posture that LEG-01/02 certify. Their prior completion is not invalidated.
- **Remaining v1.1 work per ROADMAP:** Phase 7 (DB migration apply — Supabase network required), Phase 07.1 Plan 02 human checkpoints, Phase 8 (HUMAN-UAT), Phase 9 (UI/UX sweep). None are blocked by Phase 10.

## Self-Check

- [x] `scripts/check-no-mock-imports.mjs` exists — verified via `ls scripts/check-no-mock-imports.mjs` (file created mode 100644).
- [x] `npm run check:no-mock` exits 0 on HEAD — verified in terminal (`212 source files scanned, 0 mock-data imports found.`).
- [x] RED path verified — temporary probe `src/__leg03_red_probe.ts` triggered exit 1 with clear error; probe deleted immediately after; GREEN restored.
- [x] `package.json` diff is minimal and safe — verified via `git diff package.json` (single one-line addition inside `scripts`; dependencies untouched).
- [x] Task commits exist in git log — verified: `d75164d`, `61d981f`, `8e2e9bc` all present.
- [x] Verification files all exist — verified via glob: `10-LEG-01-VERIFICATION.md`, `10-LEG-02-VERIFICATION.md`, `10-LEG-03-VERIFICATION.md` all present in `.planning/phases/10-legacy-cleanup/`.
- [x] Vitest exit gate (`tests/exit/mock-removal.test.ts`) still passes 3/3 after all changes — re-run post-commit, still GREEN.
- [x] No source file edits (no behavior change in app) — `git diff --stat d24e452..HEAD -- 'src/**'` shows only `scripts/` (out of src/).

## Self-Check: PASSED

All deliverables exist, both paths (GREEN and RED) of the new gate are verified, the complementary vitest gate continues to pass, and all three task commits are present in the git log on branch `v1.1/auto-phase-07.1-to-10`.

---
*Phase: 10-legacy-cleanup*
*Completed: 2026-04-22*
