# Phase 04 — Deferred Items

Out-of-scope items discovered during plan execution. Tracked for later cleanup plans.

## From Plan 04-04 execution

### Pre-existing TypeScript errors (not introduced by this plan)

1. **`tests/storage/avatar-upload.test.ts:7` — TS2322**
   `Uint8Array<ArrayBufferLike>` not assignable to `BlobPart`.
   Phase 2/3 test file, unrelated to Phase 4. Likely a Node types upgrade
   side-effect. Needs a `new Uint8Array(buffer).slice().buffer` workaround
   or a lib.dom.d.ts pin. Scope: Phase 5 test cleanup.

2. **`vitest.config.ts:6` — TS2769**
   vite/vitest plugin type mismatch (rollup vs rolldown PluginContextMeta).
   Pre-existing per Plan 04-02 SUMMARY "Known Follow-ups". Not introduced
   by the `fileParallelism: false` addition in this plan. Fix belongs to
   a dependency-upgrade plan.

## From Plan 04-07 execution

### Pre-existing test failures (not introduced by this plan)

1. **`tests/data/seed.test.ts` — 5 failures (0 rows in all tables)**
   Worktree DB has no Phase 3 seed data loaded. Verified to fail identically
   with my changes stashed — queries.ts additions are additive and non-breaking.
   Fix: run Phase 3 seed script against the worktree DB before running
   tests/data, or rebase worktree onto a seed-initialized snapshot. Scope:
   parallel-executor orchestration.

2. **`tests/data/migrations.test.ts` — 1 failure ("RLS disabled" assertion)**
   Expected Phase 4/5 scope state. Reproduces identically without my changes.
   Out of scope for 04-07.
