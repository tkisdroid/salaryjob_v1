# Phase 07.1 — Deferred Items (Scope Boundary Log)

This file tracks pre-existing issues discovered during Plan 01 execution that are **out of scope** for the review-harness substrate work. Per CONTEXT.md §canonical_refs these are already flagged as "Known Drift" in STATE.md. Do not fix in Plan 01; re-evaluate during Plan 02 full sweep or later phases.

## Pre-existing TypeScript drift (baseline, not caused by Plan 01)

Verified 2026-04-23 via `git stash` round-trip: these errors exist on the clean `v1.1/auto-phase-07.1-to-10` branch tip prior to any Plan 01 edits.

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

**Why deferred:**
- Not introduced by Plan 01 Tasks 1-4 (proven by baseline tsc run pre-edit on branch tip 397319b).
- Located in `src/lib/ocr/` — outside Plan 01 file scope (plan only touches `.planning/`, `docs/`, `scripts/`, `tests/review/`, `playwright.config.ts`, `vitest.config.ts`, `.lighthouserc.js`, `package.json`, `.gitignore`).
- Per `<deviation_rules>` SCOPE BOUNDARY: "Only auto-fix issues DIRECTLY caused by the current task's changes. Pre-existing warnings, linting errors, or failures in unrelated files are out of scope."
- Likely introduced during `3698274 feat: auto-fill biz profile from OCR verified data` (most recent OCR touch on branch).

**Resolution path:**
- Plan 02 auto-fix loop (G6 `tsc --noEmit` gate) will surface these; D-19 whitelist covers `src/lib/services/**` (adjacent) but NOT `src/lib/ocr/**`. Planner may need to extend WHITELIST for the auto-fix loop, or schedule a dedicated fix commit.
- Alternatively: track under v1.2 drift backlog alongside STATE.md "Known Risks" entries (`tests/proxy/redirect.test.ts` + `tests/storage/avatar-upload.test.ts`).
