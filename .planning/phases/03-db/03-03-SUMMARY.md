---
phase: 03-db
plan: "03"
subsystem: worker-profile-crud
tags: [wave-2, worker-profile, server-actions, supabase-storage, avatar-upload, zod, react-19, useActionState]
requires:
  - phase3-schema-live
  - shared-form-state-types
  - storage-public-bucket
  - avatar-rls-policies
provides:
  - worker-profile-crud
  - avatar-upload-helper
  - worker-profile-edit-page
  - worker-profile-server-actions
affects:
  - src/lib/db/queries.ts
  - src/lib/supabase/storage.ts
  - src/app/(worker)/my/profile/edit/
  - tests/profile/worker-profile.test.ts
  - tests/storage/avatar-upload.test.ts
  - vitest.config.ts
tech_stack:
  added:
    - react-19-useActionState-pattern
    - supabase-storage-server-upload
    - zod-profile-validation-schema
  patterns:
    - Server Action + useActionState (two-form pattern)
    - DAL requireWorker() + prisma.upsert for owner-safe writes
    - Zod safeParse with fieldErrors projection to client form
    - Three-layer file validation (presence + size + MIME allow-list)
    - Fixed-path upsert avatar storage (avatars/{userId}/avatar.{ext})
    - server-only alias stub for vitest compatibility
key_files:
  created:
    - src/lib/supabase/storage.ts
    - src/app/(worker)/my/profile/edit/actions.ts
    - src/app/(worker)/my/profile/edit/page.tsx
    - src/app/(worker)/my/profile/edit/worker-profile-edit-form.tsx
    - tests/stubs/server-only.ts
  modified:
    - src/lib/db/queries.ts
    - tests/profile/worker-profile.test.ts
    - tests/storage/avatar-upload.test.ts
    - vitest.config.ts
    - .planning/phases/03-db/deferred-items.md
decisions:
  - "Two independent <form> elements in the Client Component (avatar + profile fields) so they have separate useActionState lifecycles and cannot block each other"
  - "upload helper returns discriminated union { publicUrl } | { error } instead of throwing, so Server Actions can project the error to FieldActionResult without try/catch noise"
  - "Avatar preview uses <img> with eslint-disable (not next/image) — URL.createObjectURL blob URLs are incompatible with Next.js image optimizer"
  - "Cache-busting ?v={Date.now()} appended to public URL so <img src> updates immediately after upsert (fixed path means otherwise-stale CDN cache)"
  - "Test WORK-04 uses runtime-table + static source grep for owner enforcement instead of mocking requireWorker — simpler, catches drift"
  - "server-only package stubbed in vitest.config.ts alias (not mocked per-test) because Next bundles it internally and vitest runs outside Next's resolver"
metrics:
  task_count: 3
  commits: 3
  tests_added: 11
  tests_todo: 2
  duration_minutes: 14
  completed: 2026-04-10
requirements:
  - WORK-01
  - WORK-02
  - WORK-03
  - WORK-04
---

# Phase 3 Plan 03: Worker Profile CRUD + Avatar Upload Summary

Wired the `/my/profile/edit` page to the real DB with two Server Actions (`updateWorkerProfile`, `uploadAvatar`), a Supabase Storage helper enforcing server-side size + MIME validation, and 11 passing tests covering WORK-01..04 + D-01. First Wave 2 plan — proves the Server Action + Storage + DAL + @supabase/ssr pattern that 03-04 and 03-05 will follow.

## What Shipped

### 1. `src/lib/supabase/storage.ts` (new — 87 LOC)

Exports `AVATAR_BUCKET`, `uploadAvatarFile`, `getAvatarPublicUrl`.

**Validation layers (three):**
1. File presence + non-empty (`file.size === 0` → "파일을 선택해주세요")
2. Size ≤ 5MB (`5 * 1024 * 1024` bytes → "파일 크기는 5MB 이하여야 합니다")
3. MIME in `{image/jpeg, image/png, image/webp}` → "JPEG, PNG, WebP 파일만 업로드 가능합니다"

**Path convention:** `avatars/{userId}/avatar.{ext}` — matches 03-02's Storage RLS policy which anchors on `(storage.foldername(name))[2] = auth.uid()::text`.

**Upsert strategy:** `upsert: true` so re-uploads overwrite at the same path (per research §1.5 fixed-path strategy). No cleanup needed.

**Cache-busting:** Returns `{publicUrl}?v={Date.now()}` so `<img>` elements re-fetch after an upsert instead of showing the stale cached version.

Returns a discriminated union:
```ts
type UploadAvatarResult = { publicUrl: string } | { error: string };
```

### 2. `src/lib/db/queries.ts` — APPEND (new function at end, 15 LOC)

```ts
export async function getWorkerProfileByUserId(userId: string) {
  return prisma.workerProfile.findUnique({ where: { userId } });
}
```

Returns the raw Prisma `WorkerProfile` row (nullable) for edit-form prefill. Does NOT call `verifySession` — caller is responsible for session check (via `requireWorker()` in the page). This is the critical design distinction from Phase 2's `getCurrentWorker()` which both authenticates AND adapts to the UI `Worker` shape with stubs.

Existing exports (`getJobs`, `getCurrentWorker`, etc.) untouched.

### 3. `src/app/(worker)/my/profile/edit/actions.ts` (new — 147 LOC)

**Two Server Actions, both guarded by `requireWorker()`:**

#### `updateWorkerProfile(_prevState, formData)` — WORK-01..04

- `requireWorker()` → session with `id`, `email`, `role`.
- Zod schema whitelist: `name` (required, 1–50 char), `nickname` (optional, ≤30), `bio` (optional, ≤140), `preferredCategories` (JobCategory[] default []).
- **WORK-03 read-only fields (`badgeLevel`, `rating`, `totalJobs`, `completionRate`) are NEVER read from FormData.** Zod `z.object` without `.passthrough()` silently drops unknown keys, so any hidden form input for these fields is ignored.
- **WORK-04 owner enforcement:** `prisma.workerProfile.upsert({ where: { userId: session.id } })` — no form-supplied userId accepted. Tested both by runtime query and a static grep against the source file.
- DB errors caught, generic Korean message returned — never leaks `e.message` to the user.
- `revalidatePath('/my')` + `revalidatePath('/my/profile/edit')` after success.

#### `uploadAvatar(_prevState, formData)` — D-01 + WORK-01

- `requireWorker()` + `formData.get("avatar")`.
- Delegates to `uploadAvatarFile(session.id, file)` for validation + upload.
- On success, `prisma.workerProfile.upsert` writes the cache-busting public URL to `workerProfile.avatar`. Upsert handles the "profile doesn't exist yet" case by creating a minimal profile with `name: session.email ?? "이름 미설정"`.
- Same revalidatePath calls on success.

### 4. `src/app/(worker)/my/profile/edit/page.tsx` (new — 55 LOC)

Server Component:
```tsx
export default async function WorkerProfileEditPage() {
  const session = await requireWorker();
  const profile = await getWorkerProfileByUserId(session.id);
  const initialProfile = profile ?? { /* synthesized empty */ };
  return <WorkerProfileEditForm {...initialProfileProps} />;
}
```

Synthesizes an empty profile shape for first-edit case (Phase 2 signup may have created a User row with no WorkerProfile). Passes typed props to the Client Component — does NOT pass the raw Prisma row (avoids leaking Decimal types and `createdAt`/`updatedAt` to the client bundle).

**No `"use client"` directive** — verified by grep acceptance criterion.

### 5. `src/app/(worker)/my/profile/edit/worker-profile-edit-form.tsx` (new — 249 LOC)

Client Component. Two `useActionState` calls (one per independent form):

```tsx
const [profileState, profileAction, isProfilePending] = useActionState<
  ProfileFormState, FormData
>(updateWorkerProfile, null);
const [avatarState, avatarAction, isAvatarPending] = useActionState<
  AvatarFormState, FormData
>(uploadAvatar, null);
```

- **Avatar form:** file input with `accept="image/jpeg,image/png,image/webp"`, local `URL.createObjectURL` preview before submit, server URL replaces preview on success.
- **Profile form:** name / nickname / bio / category toggle buttons (hidden inputs mirror the React state so FormData includes selections). Read-only stats section displays badge/rating/totalJobs/completionRate with a dashed border + `aria-label="읽기 전용 지표"`.
- **Error display:** `role="alert" aria-live="polite"` for errors, `role="status"` for successes. Field-level errors shown next to inputs via `profileState.fieldErrors?.name`.
- **`<img>` (not `<Image>`) for avatar preview** — `URL.createObjectURL` blob URLs are incompatible with the Next.js image optimizer. `eslint-disable` pragma justifies it.

### 6. `tests/profile/worker-profile.test.ts` — CONVERTED from `describe.skip` scaffold (127 LOC)

4 passing tests + 1 todo:

| # | Test | Covers |
|---|---|---|
| 1 | `persists all fields via prisma.workerProfile.update` | WORK-01 + WORK-02 |
| 2 | `returns badge/rating/totalJobs/completionRate from DB` | WORK-03 |
| 3 | `with a different userId returns that user's profile only` | WORK-04 |
| 4 | `updateWorkerProfile uses session.id — static check` | WORK-04 code-level |
| todo | `E2E: logged-in worker can POST form and see name updated on /my` | Playwright territory |

**Seed isolation:** Test 1 uses `try/finally` to restore `worker@dev.gignow.com`'s original name/nickname/bio/preferredCategories after mutation. Verified post-run: profile name is `김지훈` (seed value), not `테스트 김지훈` (test mutation).

**Seed lookup by email** (not hardcoded UUID) so tests survive reseeding.

### 7. `tests/storage/avatar-upload.test.ts` — CONVERTED from `describe.skip` scaffold (84 LOC)

7 passing tests + 1 todo:

| # | Test | Covers |
|---|---|---|
| 1 | `AVATAR_BUCKET constant equals 'public'` | Config sanity |
| 2 | `rejects a 6MB file with size error` | Size cap (5MB) |
| 3 | `rejects an empty file` | Presence check |
| 4 | `rejects text/plain` | MIME allow-list |
| 5 | `rejects application/pdf` | MIME allow-list (2nd case) |
| 6 | `source file constructs avatars/{userId}/avatar.{ext} path for jpeg` | Static path + upsert check |
| 7 | `source file whitelists exactly jpeg, png, webp` | Static MIME check + gif/svg exclusion |
| todo | `E2E: authenticated worker uploads 1MB PNG` | Playwright territory |

Tests construct `File` objects in-memory via `new File([Uint8Array], name, {type})` — no real Supabase Storage call, which would require auth cookies unavailable in Vitest Node env.

### 8. `vitest.config.ts` + `tests/stubs/server-only.ts` — test environment fix

Added alias:
```ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    'server-only': path.resolve(__dirname, './tests/stubs/server-only.ts'),
  },
},
```

Next.js bundles `server-only` internally at `next/dist/compiled/server-only/`. Vitest runs outside Next's resolver and cannot find it, so modules guarded by `import "server-only"` (including `src/lib/db/queries.ts` and `src/lib/supabase/storage.ts`) fail to load in tests. The stub is an empty module — the `import "server-only"` statement is still present at the top of the source files (maintaining the client-bundle guard in production builds), vitest just resolves it to an empty export.

## Verification Results

### Task-level gates

| Task | Gate | Result |
|---|---|---|
| 1 | `tsc --noEmit` new errors on storage.ts + queries.ts | 0 new errors (4 pre-existing from 03-01 baseline) |
| 1 | `grep AVATAR_BUCKET` | 4 matches in storage.ts (export + 3 usages) |
| 1 | `grep uploadAvatarFile` | 1 in storage.ts (exported function), 2 in actions.ts (import + call) |
| 1 | `grep "await createClient"` in storage.ts | 2 |
| 2 | `tsc --noEmit` new errors on 3 new files | 0 |
| 2 | `"use server"` in actions.ts | 1 |
| 2 | `"use client"` in page.tsx | 0 |
| 2 | `"use client"` in form.tsx | 1 |
| 2 | `requireWorker` usages in actions.ts | 4 (import + 2 calls + comment) |
| 2 | `revalidatePath` usages in actions.ts | 5 |
| 2 | `formData.get("userId")` count | 0 (WORK-04 guard) |
| 2 | `formData.get("badgeLevel")` count | 0 (WORK-03 guard) |
| 2 | `useActionState` in form.tsx | 3 (import + 2 calls) |
| 3 | `vitest run tests/profile/worker-profile.test.ts` | 4 pass, 1 todo, 0 fail |
| 3 | `vitest run tests/storage/avatar-upload.test.ts` | 7 pass, 1 todo, 0 fail |
| 3 | `describe.skip(` in either file | 0 |
| 3 | Seed `worker@dev.gignow.com` profile name after test run | `김지훈` (restored, NOT `테스트 김지훈`) |

### Full-suite regression check

```
Test Files  1 failed | 11 passed | 4 skipped (16)
     Tests  1 failed | 32 passed | 26 todo (59)
```

- **11 passed test files** (up from 10 at end of 03-01 — this plan adds worker-profile + avatar-upload files to the passing column)
- **32 passed tests** (up from the baseline 8 at 03-01 Wave 0)
- **1 failed test:** `tests/data/migrations.test.ts > DATA-03 > RLS is disabled on jobs` — this is a stale Phase 2 assertion that was invalidated by 03-02 re-enabling jobs RLS. Logged to `deferred-items.md`. Pre-existing failure, NOT caused by 03-03. Verified by reading the test source and the 03-02 migration files.

## Deviations from Plan

### 1. [Rule 3 - Blocker] `server-only` import unresolvable in Vitest

**Found during:** Task 3 first `vitest run` — both new test files crashed at collect time:
```
Error: Cannot find package 'server-only' imported from 'src/lib/supabase/storage.ts'
```

**Root cause:** Next.js 16 bundles `server-only` internally at `node_modules/next/dist/compiled/server-only/`. There is no top-level `node_modules/server-only` package. Next's own Webpack/Turbopack resolver handles this, but Vitest runs outside that resolver. Any module that `import "server-only"` (including Phase 2's `src/lib/dal.ts`, `src/lib/db/queries.ts`, and the new `src/lib/supabase/storage.ts`) fails to load in tests.

**Fix:** Added a `resolve.alias` entry to `vitest.config.ts` mapping `'server-only' → './tests/stubs/server-only.ts'`. The stub is an empty module (`export {};`). The `import "server-only"` statements in source files are retained — they still enforce the client-bundle guard in Next.js builds. This is a test-environment-only fix; production bundles are unchanged.

**Why not Rule 4 (architectural):** This is a test tooling gap, not an architectural decision. The alias is a standard vitest pattern for stubbing packages that the runtime doesn't need. No schema, API, or data-flow change. Less than 10 LOC total.

**Files modified:** `vitest.config.ts` (+4 LOC alias), `tests/stubs/server-only.ts` (+5 LOC new file).

**Commit:** `a98068a` (bundled with Task 3).

### 2. [Rule 2 - Critical functionality] Avatar preview also renders blob: URLs

**Found during:** Task 2 form.tsx authoring. The plan's `displayAvatar.startsWith("http")` check would treat the local `URL.createObjectURL` preview (which produces `blob:http://...`) correctly (it starts with `blob:` not `http:`), meaning the preview code path would NOT render the `<img>` — it would fall through to the emoji div. This would break the "selected file preview" UX specified in the plan's Task 2 behavior section.

**Fix:** Changed the conditional from `displayAvatar.startsWith("http")` to `displayAvatar.startsWith("http") || displayAvatar.startsWith("blob:")`. Both real public URLs (after successful upload) and local preview blob URLs now render via `<img>`. No other plan behavior affected.

**Files modified:** `src/app/(worker)/my/profile/edit/worker-profile-edit-form.tsx` (1-line conditional change).

**Commit:** `417a50e` (Task 2).

### 3. [Environment] Worktree bootstrap — node_modules junction, env files, Prisma client regeneration

**Found during:** Task 1 first `tsc --noEmit` attempt.

**Issue:** This git worktree (`.claude/worktrees/agent-aecdf4af`) was created without `node_modules`, `.env.local`, `.env`, or a generated Prisma client at `src/generated/prisma/`. All three are gitignored. Without them, `tsc`, `vitest`, and `prisma generate` all fail.

**Fix:**
- Copied `.env.local` from main repo to both `.env.local` and `.env` in the worktree (pattern established by 03-02).
- Created a Windows junction: `mklink /J node_modules ..\..\..\node_modules` pointing at the main repo's installed packages.
- Ran `prisma generate` against the worktree's `prisma/schema.prisma` so `src/generated/prisma/` reflects the Phase 3 Job columns from 03-01.

Files modified: None tracked by git (all 3 are gitignored).

**Not a deviation from the plan's intent** — worktree bootstrap is an orchestrator responsibility. Documenting here so future executor spawns in fresh worktrees follow the same pattern.

## Authentication Gates

None. All three tasks executed against existing `.env.local` DATABASE_URL (inherited from Phase 2) and the Supabase project already authenticated in Phase 2. No user interaction required.

## Deferred Issues

### 1. `tests/data/migrations.test.ts` DATA-03 "RLS disabled on jobs" stale assertion

Logged to `.planning/phases/03-db/deferred-items.md` section "From 03-03". Phase 2 test expects `jobs.rowsecurity = false`, but 03-02 intentionally re-enabled jobs RLS. Pre-existing failure, unrelated to 03-03 scope. Recommended fix in a follow-up plan that owns `tests/data/` updates.

## Known Stubs

None in 03-03 code. All files are wired to real implementations:
- `updateWorkerProfile` → real Prisma upsert
- `uploadAvatar` → real Supabase Storage upload
- `getWorkerProfileByUserId` → real Prisma findUnique
- Page → real DAL + real query
- Form → real Server Actions

Pre-existing stubs in `src/lib/db/queries.ts` `adaptJob` (`duties: []`, `requirements: []`, `tags: []`, `distanceM: 0`, `settlementStatus: null`, etc.) are NOT introduced by this plan and are scheduled for resolution in 03-05 (POST CRUD) and 03-06 (public list + PostGIS distance).

## Commits

| # | Hash | Type | Message |
|---|---|---|---|
| 1 | `62750bd` | feat | `feat(03-03): add avatar storage helper + getWorkerProfileByUserId query` |
| 2 | `417a50e` | feat | `feat(03-03): worker profile edit page + Server Actions (WORK-01..04)` |
| 3 | `a98068a` | test | `test(03-03): convert worker-profile + avatar-upload scaffolds to real tests` |

## Requirements Completed

- **WORK-01** (Worker profile: name, nickname, avatar, bio) — `updateWorkerProfile` persists name/nickname/bio; `uploadAvatar` persists avatar URL. Tested by runtime Prisma update round-trip.
- **WORK-02** (Worker preferredCategories) — `updateWorkerProfile` persists `preferredCategories: JobCategory[]`. Tested by write + re-read assertion.
- **WORK-03** (Badge/rating/totalJobs/completionRate read-only exposure) — Form displays all 4 fields under `aria-label="읽기 전용 지표"`, Server Action's Zod schema does NOT accept them from FormData (grep-verified: 0 `formData.get("badgeLevel")` etc.). `getWorkerProfileByUserId` returns the real DB values including badge enum + Decimal rating.
- **WORK-04** (Own-row RLS + DAL owner check) — Server Action uses `requireWorker().id` for the Prisma `where` clause; no form-supplied userId. Static source check (`tests/profile/worker-profile.test.ts > session.id static check`) asserts the pattern is preserved across refactors.
- **D-01 (partial)** — Supabase Storage upload helper with 3-layer validation + cache-busting URL. Full E2E (real file upload through authenticated Server Action) is deferred to Phase 3 UAT.

## What's Unblocked

- **03-04 (Business profile CRUD):** Same Server Action + useActionState + DAL pattern. Reuses `src/lib/form-state.ts` types and the same Zod-safeParse → fieldErrors projection. 03-04 will only differ in the Prisma model (`businessProfile` vs `workerProfile`) and the field whitelist.
- **03-05 (Job CRUD):** Same `uploadAvatarFile` pattern can be generalized to job photos if needed (or a distinct helper). The `avatars/{userId}/...` path convention scales to `jobs/{jobId}/photos/{n}.{ext}` with a different RLS policy.
- **Phase 3 UAT:** `/my/profile/edit` is now a real route that a human tester can visit to exercise the flow end-to-end.

## Threat Flags

None. The surface introduced matches the plan's `<threat_model>` exactly:
- T-03-03-01 (FormData.userId tampering) — mitigated by whitelist + grep test
- T-03-03-02 (badgeLevel/rating elevation) — mitigated by Zod schema (drops unknown keys)
- T-03-03-03 (unbounded bio) — mitigated by Zod max(140)
- T-03-03-04 (MIME spoofing) — accepted, 3-layer validation applied
- T-03-03-08 (DB error leak) — mitigated by try/catch + generic Korean message

No new network endpoints, auth paths, or trust-boundary surfaces outside the register.

## Self-Check: PASSED

**Files verified present in worktree after commits:**
- `src/lib/supabase/storage.ts` — FOUND (87 LOC, contains `AVATAR_BUCKET`, `uploadAvatarFile`, `getAvatarPublicUrl`)
- `src/lib/db/queries.ts` — FOUND (modified, contains new `getWorkerProfileByUserId` + existing exports intact)
- `src/app/(worker)/my/profile/edit/actions.ts` — FOUND (147 LOC, `updateWorkerProfile` + `uploadAvatar`)
- `src/app/(worker)/my/profile/edit/page.tsx` — FOUND (55 LOC, Server Component)
- `src/app/(worker)/my/profile/edit/worker-profile-edit-form.tsx` — FOUND (249 LOC, Client Component)
- `tests/profile/worker-profile.test.ts` — FOUND (127 LOC, 4 tests + 1 todo, no `describe.skip`)
- `tests/storage/avatar-upload.test.ts` — FOUND (84 LOC, 7 tests + 1 todo, no `describe.skip`)
- `tests/stubs/server-only.ts` — FOUND (5 LOC stub)
- `vitest.config.ts` — FOUND (modified with `server-only` alias)
- `.planning/phases/03-db/deferred-items.md` — FOUND (updated with DATA-03 stale test)
- `.planning/phases/03-db/03-03-SUMMARY.md` — FOUND (this file)

**Commits verified via `git log --oneline`:**
- `62750bd` — FOUND (Task 1: storage helper + query)
- `417a50e` — FOUND (Task 2: Server Actions + page + form)
- `a98068a` — FOUND (Task 3: tests + vitest alias)

**Test run verified:** 11 passing tests across the two new files, 2 todo. Seed `worker@dev.gignow.com` profile name = `김지훈` (unchanged by test run — seed isolation holds).

**Baseline TypeScript errors verified:** 4 pre-existing (prisma.config.ts directUrl, 2× tests/proxy/redirect.test.ts unstable_doesProxyMatch, vitest.config.ts) — unchanged. Zero new errors from 03-03 source files.
