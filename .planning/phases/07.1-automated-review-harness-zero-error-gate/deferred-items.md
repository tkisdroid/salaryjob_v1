# Phase 07.1 — Deferred Items (Scope Boundary Log)

This file tracks pre-existing issues discovered during Plan 01 execution that are **out of scope** for the review-harness substrate work. Per CONTEXT.md §canonical_refs these are already flagged as "Known Drift" in STATE.md. Do not fix in Plan 01; re-evaluate during Plan 02 full sweep or later phases.

## Pre-existing TypeScript drift (baseline, not caused by Plan 01) — RESOLVED 2026-04-23

Verified 2026-04-23 via `git stash` round-trip: these errors existed on the clean `v1.1/auto-phase-07.1-to-10` branch tip prior to any Plan 01 edits.

```
src/lib/ocr/business-reg-processor.ts(67,46): error TS2345:
  Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.

src/lib/ocr/gemini.ts(132,7): error TS2322:
  Type '{ ok: true; fullText: string; candidateRegNumbers: never[]; }' is not
  assignable to type 'GeminiOcrResult'. Property 'candidateOwnerNames' is missing
  in type '{ ok: true; fullText: string; candidateRegNumbers: never[]; }' but
  required in type '{ ok: true; fullText: string; candidateRegNumbers: string[];
  candidateOwnerNames: string[]; }'.
```

**Resolution:** Fixed in commit `d087421` (codex-P1-1 + codex-P1-2) during the 2026-04-23 codex-review fix pass on branch `v1.1/auto-phase-07.1-to-10`. `npx tsc --noEmit` now exits 0.

- `gemini.ts`: empty-`parts` early-success return now includes `candidateOwnerNames: []`, so every `ok: true` path conforms to the `GeminiOcrResult` union type.
- `business-reg-processor.ts`: `Boolean(storedRegNumber)` replaced with `typeof storedRegNumber === 'string'` so TypeScript narrows `storedRegNumber` from `string | null` to `string` at the `.includes()` call site.

## Phase 11+ follow-up — Shift / Settlement table model design

The review-harness seed originally assumed dedicated `Shift` and `Settlement` tables, but `prisma/schema.prisma` has neither. For the codex P1-4 fix (commit `7c10cc1`) the lifecycle state that those rows were meant to capture is represented instead via the existing `applications` table:

- "Shift" lifecycle (SHIFT_IDS[...] in `tests/review/fixtures/ids.ts`): encoded via `applications.checkInAt` / `applications.checkOutAt` / `applications.status` transitions (`confirmed → in_progress → completed`).
- "Settlement" lifecycle (SETTLEMENT_IDS[...]): encoded via `applications.status = 'settled'` plus `earnings` / `actualHours` on the same row.

**Follow-up work (Phase 11+):** When the product introduces a dedicated `shifts` or `settlements` table (e.g. to back /biz/settlements aggregation or a cron-driven batch settlement flow), update `scripts/review/seed-test-data.ts` to insert into those real tables and wire the SHIFT_IDS / SETTLEMENT_IDS fixture UUIDs to the new `id` primary keys. Until then the current application-driven representation is sufficient for D-07 coverage in the review harness.

## Codex review fix pass — 2026-04-23

Full fix summary lives in the codex review MD under `## FIXES APPLIED 2026-04-23` at `.planning/phases/07.1-automated-review-harness-zero-error-gate/reviews/07.1-codex-review.md`. Eight commits, all on branch `v1.1/auto-phase-07.1-to-10`:

```
d087421  fix(07.1): add candidateOwnerNames and narrow storedRegNumber type [codex-P1-1 codex-P1-2]
1befe2f  fix(07.1): setup projects point at tests/review for auth.setup.ts discovery [codex-P1-5]
af46fce  fix(07.1): remap supabase CLI env var names to app-expected names [codex-P1-3]
7c10cc1  fix(07.1): align review seed with actual prisma schema [codex-P1-4]
73f85ea  fix(07.1): use cross-env for REVIEW_RUN env var on Windows [codex-P2-7]
c79d206  fix(07.1): lhci owns its own Next server lifecycle [codex-P2-6]
44990e4  fix(07.1): use correct entity ids for biz applicant + worker routes [codex-P2-8]
```
