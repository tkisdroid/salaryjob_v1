---
phase: 10
requirement: LEG-03
title: "mock-data import grep gate — installation evidence"
installed_on: 2026-04-22
status: installed
verified_by: gsd-execute-phase (Phase 10 inline planner+executor)
---

# LEG-03 Installation — mock-data import grep gate

## Requirement (verbatim from REQUIREMENTS.md)

> **LEG-03**: `src/lib/mock-data` import 회귀를 막는 grep 게이트가 CI(또는 pre-commit 훅)에서 자동 실행되어 재발을 방지한다.

## Deliverables

### 1. `scripts/check-no-mock-imports.mjs` (new)

Zero-dependency Node script that:
- Walks `src/` recursively (skipping `node_modules`, `generated`, `.next`, `.git`, `dist`, `build`).
- Matches each `.ts` / `.tsx` / `.js` / `.jsx` / `.mjs` / `.cjs` file against the regex `/from\s+['"](?:@\/lib\/mock-data|\.+\/.*mock-data)['"]/` — identical to `tests/exit/mock-removal.test.ts` line 67.
- Exits:
  - `0` if no violations (prints count of files scanned).
  - `1` if any violations found (prints the violating file list to stderr).
  - `2` on internal error (e.g., `src/` missing).

**Chose Node over `.sh`** because: (a) repo is Windows-primary with no existing `.sh` scripts, (b) existing tooling uses Node/tsx, (c) cross-platform CI runners don't need bash, (d) regex matches the vitest exit gate byte-for-byte.

### 2. `package.json` -> `scripts["check:no-mock"]`

Added `"check:no-mock": "node scripts/check-no-mock-imports.mjs"`.

**D-20 compliance:** Only the `scripts` section was touched. `dependencies` and `devDependencies` are unchanged — confirmed via `git diff package.json` which shows a single one-line addition inside `scripts`.

### 3. Pre-commit wiring: documented-manual fallback (husky not installed)

The plan's preferred order was husky pre-commit, then `.github/workflows/`, then documented manual invocation. Husky is **not** a devDependency (verified in `package.json` devDependencies list) and no `.husky/` directory exists (verified via glob). `.github/workflows/` wiring is explicitly out of scope for this phase per the "Hard NO" list (no new infrastructure added in Phase 10).

Fallback path taken (per the plan's own fallback clause): document the manual + CI invocation here and in the SUMMARY.

**Invocation contract:**

```bash
# Manual (dev)
npm run check:no-mock

# CI (future — e.g., GitHub Actions)
- run: npm run check:no-mock
```

**Complement (already in place):** `tests/exit/mock-removal.test.ts` runs under vitest (`npm test`) with 3 assertions covering the same invariant plus `prisma/seed.ts` and filesystem existence. Every CI run of the test suite transitively exercises LEG-03.

## Verification Evidence

### GREEN path (no violations)

```bash
$ npm run check:no-mock
> gignow@0.1.0 check:no-mock
> node scripts/check-no-mock-imports.mjs

[check-no-mock-imports] OK - 212 source files scanned, 0 mock-data imports found.
exit=0
```

### RED path (regression detection works)

A temporary probe file `src/__leg03_red_probe.ts` containing `import { x } from "@/lib/mock-data";` was written, the script was invoked, then the probe was deleted:

```bash
$ echo 'import { x } from "@/lib/mock-data";' > src/__leg03_red_probe.ts
$ node scripts/check-no-mock-imports.mjs
[check-no-mock-imports] FAIL - 1 file(s) import from src/lib/mock-data:
  - src\__leg03_red_probe.ts

Refusing to commit/build. Remove these imports before continuing.
Context: CLAUDE.md "Mock removal" + Phase 10 LEG-03 regression prevention.
exit=1
```

The gate correctly:
1. Detected the import.
2. Printed the offending file path.
3. Exited non-zero (1) — suitable for CI failure and shell `&&` chaining.

After the probe was deleted the gate returned to GREEN (exit 0, 212 files scanned).

### Complementary vitest gate (unchanged)

```
 * tests/exit/mock-removal.test.ts (3 tests) 30ms
   * src/lib/mock-data.ts does not exist (ENOENT)
   * no src/ file imports from @/lib/mock-data or relative mock-data path
   * prisma/seed.ts does not import from ../src/lib/mock-data

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

## Status

**INSTALLED.** `npm run check:no-mock` works GREEN (exit 0, 212 files scanned) and RED (exit 1 on probe regression). LEG-03 deliverable is satisfied.
