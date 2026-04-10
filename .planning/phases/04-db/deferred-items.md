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
