---
phase: 10
requirement: LEG-01
title: "/my/schedule MOCK removal — verification evidence"
verified_on: 2026-04-22
status: already-satisfied
verified_by: gsd-execute-phase (Phase 10 inline planner+executor)
---

# LEG-01 Verification — `/my/schedule` is on real Supabase data

## Requirement (verbatim from REQUIREMENTS.md)

> **LEG-01**: `src/app/(worker)/my/schedule/page.tsx`의 로컬 MOCK 상수(availability/match history)가 제거되고 실 DB 쿼리로 대체되어 실제 사용자의 예약·지원 이력이 표시된다.

## Finding

Already satisfied. The Phase 5 "live-app hardening" work (commit `d24e452`, 2026-04-11) replaced the Phase 1 local MOCK constants with real Supabase/Prisma queries. No further code mutation is required in Phase 10 to meet LEG-01.

## Evidence

### 1. No local MOCK constants in the file

```bash
grep -nE "MOCK|mock" src/app/\(worker\)/my/schedule/page.tsx
# → no output (exit 1)
```

### 2. The page reads the worker's real availability + real Job matches

Source: `src/app/(worker)/my/schedule/page.tsx` (lines 110-120)

```ts
export default async function SchedulePage() {
  const session = await requireWorker();
  const profile = await prisma.workerProfile.findUnique({
    where: { userId: session.id },
    select: { availabilitySlots: true },
  });

  const hasAvailability = (profile?.availabilitySlots.length ?? 0) > 0;
  const recommendations = hasAvailability
    ? await getWorkerJobMatches(session.id, { limit: 12 })
    : [];
```

- `prisma.workerProfile.findUnique(...)` — real Supabase query against `worker_profiles` table (the `availabilitySlots` column was declared in Phase 5, `prisma/schema.prisma` ~line 103).
- `getWorkerJobMatches(session.id, ...)` — `src/lib/services/worker-job-matching.ts` reads real `Job` rows via `getJobsPaginated()` and scores them against the worker's stored availability slots + preferred categories.

### 3. No mock-data import in the file

```bash
grep -nE "from ['\"](?:@/lib/mock-data|\.+/.*mock-data)" src/app/\(worker\)/my/schedule/page.tsx
# → no output (exit 1)
```

### 4. Existing vitest exit gate already enforces no mock-data imports anywhere in `src/`

`tests/exit/mock-removal.test.ts` — 3 assertions GREEN:

```
 ✓ tests/exit/mock-removal.test.ts (3 tests) 30ms
   ✓ src/lib/mock-data.ts does not exist (ENOENT)
   ✓ no src/ file imports from @/lib/mock-data or relative mock-data path
   ✓ prisma/seed.ts does not import from ../src/lib/mock-data

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

## Historical context — why the ROADMAP/REQUIREMENTS looked stale

The v1.1 ROADMAP was drafted 2026-04-15; the `/my/schedule` MOCK cleanup had already shipped 2026-04-11 (commit `d24e452`) as part of the Phase 5 "live-app hardening" sweep. The Phase 10 entry carried the assumption that Phase 1 legacy MOCK was still in the file — it wasn't. The requirement is **behaviorally satisfied**; LEG-01 simply needed verification, not mutation.

## Status

**SATISFIED.** Source of truth: `src/app/(worker)/my/schedule/page.tsx` at HEAD. No Phase 10 code change required for LEG-01.
