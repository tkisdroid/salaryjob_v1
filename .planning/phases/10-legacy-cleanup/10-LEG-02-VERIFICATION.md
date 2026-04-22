---
phase: 10
requirement: LEG-02
title: "Stale Clerk TODO in push/register route — verification evidence"
verified_on: 2026-04-22
status: already-satisfied
verified_by: gsd-execute-phase (Phase 10 inline planner+executor)
---

# LEG-02 Verification — No stale Clerk TODO, `/api/push/register` route is gone

## Requirement (verbatim from REQUIREMENTS.md)

> **LEG-02**: `src/app/api/push/register/route.ts`의 stale Clerk TODO 주석이 Supabase Auth 기반 주석으로 대체되거나 제거된다.

## Finding

Already satisfied — and the file the requirement names is itself already deleted.

The legacy `/api/push/register` route handler (which carried the stale Clerk TODO) was deleted during v1.0 Phase 4 Plan 06 — see `.planning/milestones/v1.0-ROADMAP.md` line 105:

> `04-06-web-push-PLAN.md` — Wave 4: sendPushToUser + subscribe/unsubscribe Server Actions + sw.js + ServiceWorkerRegistrar + PushPermissionBanner + Plan 04 TODO wiring + **legacy /api/push/register delete**

Push subscription registration is now handled via Server Actions (`src/lib/actions/push-actions.ts`), aligning with the Supabase Auth model (no Clerk webhook surface).

## Evidence

### 1. The file named in LEG-02 does not exist

```bash
find src -type f -name "route.ts" -path "*push*"
# → (no output)
```

```bash
ls src/app/api 2>&1
# → ls: cannot access 'src/app/api/': No such file or directory
```

There is no `src/app/api/` directory at all in the current tree. Push routes have been migrated to Server Actions.

### 2. Zero Clerk references anywhere under `src/` (excluding generated Prisma SDL string)

```bash
grep -rln -i "clerk" src/ --include="*.ts" --include="*.tsx"
# → src/generated/prisma/internal/class.ts (Prisma-generated inline schema SDL — not a Clerk code path)
```

No Clerk code, no Clerk imports, no Clerk TODOs anywhere in the application source.

### 3. Current push registration is Server Action based (Supabase Auth aware)

- `src/lib/actions/push-actions.ts` — Server Action that calls `requireWorker()` (Supabase Auth session) and writes to `prisma.pushSubscription`. No Clerk, no stale TODO.
- `src/components/worker/push-permission-banner.tsx` — client UI that calls the Server Action.
- `src/lib/services/push-notification.ts` / `src/lib/push.ts` — delivery-side helpers.

### 4. Remaining Clerk mentions in planning docs are historical references only

```bash
grep -rln -i "clerk" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=src
# → 12 files, all under .planning/, CLAUDE.md, .planning/codebase/, .planning/milestones/
```

These are historical narrative entries (v1.0 milestone audits, ARCHITECTURE.md legacy notes) that document the original Clerk plan and why it was dropped in favor of Supabase Auth. They are appropriate to keep as archaeological record and are not "stale TODOs" — they are closed-book history.

## Historical context

The v1.1 ROADMAP/REQUIREMENTS.md entries for LEG-02 (drafted 2026-04-15) were copied from the v1.0 audit backlog (`.planning/milestones/v1.0-MILESTONE-AUDIT.md` line 136: "Stale Clerk TODO comment at src/app/api/push/register/route.ts. Non-blocking (no Clerk code path). Remove in cleanup phase."). By the time the v1.1 ROADMAP was written, Phase 4 Plan 06 had already deleted the file, so the TODO was gone with its host. LEG-02 simply needed verification, not mutation.

## Status

**SATISFIED.** `src/app/api/push/register/route.ts` does not exist; zero Clerk strings anywhere in `src/` app code; push registration uses Supabase-Auth-aware Server Actions. No Phase 10 code change required for LEG-02.
