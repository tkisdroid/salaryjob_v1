---
phase: 04-db
plan: 05
subsystem: shift-actions
tags: [server-actions, jwt, postgis, geofence, night-shift, jose, tdd]
requirements:
  - SHIFT-01
  - SHIFT-02
  - SHIFT-03
dependency_graph:
  requires:
    - "04-02 (requireApplicationOwner/requireJobOwner DAL helpers + noShowCount schema)"
    - "04-03 (applications RLS + PostGIS ready on Supabase)"
  provides:
    - "checkIn/checkOut Server Actions (Worker side) for /my/applications/[id]/check-in/page.tsx"
    - "generateCheckoutQrToken Server Action (Biz side) for QR modal"
    - "calculateNightShiftPremium + computeNightHoursOverlap (Asia/Seoul, ≥4h trigger)"
    - "calculateActualHours (15-min rounding) + calculateEarnings overload (shift form)"
    - "isWithinCheckInWindow / isWithinCheckOutWindow (pure time validators)"
    - "isWithinGeofence (PostGIS ST_DWithin wrapper, 200m default)"
    - "signCheckoutToken / verifyCheckoutToken (jose HS256, 10-min TTL)"
  affects:
    - "Phase 4 Plan 04-07 UI (Worker check-in flow now has real actions to wire)"
    - "Phase 4 Plan 04-04 application-actions (shares src/lib/errors/application-errors.ts)"
tech_stack:
  added:
    - "src/lib/night-shift.ts (Asia/Seoul night window arithmetic, no DST assumption)"
    - "src/lib/shift-validation.ts (pure time-window validators)"
    - "src/lib/geofence.ts (PostGIS ST_DWithin wrapper via \\$queryRaw)"
    - "src/lib/qr.ts (jose v6 HS256 sign/verify with alg-pinning)"
  patterns:
    - "Function overload for calculateEarnings: union-dispatch between legacy scheduled form (job obj) and Phase 4 shift form (hours, rates, premium) — preserves check-in-flow.tsx call site without rename"
    - "Fail-closed geofence: business-not-found → false; NULL location → true (graceful fallback + warn log) — geofence is one of three gates, not the only one"
    - "Server Action error taxonomy: throw ApplicationError(code) internally, return { success: false, error: code } at boundary, UI resolves Korean via applicationErrorToKorean"
    - "Rate limit via in-process Map<userId, lastMs> — acceptable here because legitimate Biz usage = one QR per shift end"
key_files:
  created:
    - "src/lib/night-shift.ts"
    - "src/lib/shift-validation.ts"
    - "src/lib/geofence.ts"
    - "src/lib/qr.ts"
    - "src/lib/errors/application-errors.ts"
    - "src/app/(worker)/my/applications/[id]/check-in/actions.ts"
    - "src/app/biz/posts/[id]/actions.ts"
  modified:
    - "src/lib/job-utils.ts"
decisions:
  - "calculateEarnings kept as a single exported name with a function-overload dispatching on first-arg type (number → shift form, object → legacy job form) — matches the exact signature the RED tests demand while preserving the existing check-in-flow.tsx call site that still passes a Job object"
  - "isWithinCheckInWindow parameter order is (now, workDate, startTime) to match tests/shift/check-in-time-window.test.ts; workDate accepts either YYYY-MM-DD string OR Date for API flexibility (Prisma Date columns return Date, Business form inputs may send string)"
  - "isWithinGeofence signature is (businessId, {lat,lng}, radiusM?) — object for coords per the test fixture, positional radius with default 200 — this is different from the PLAN's 4-positional draft but is the shape the test file locks in"
  - "signCheckoutToken accepts required nonce + optional ttlSeconds — tests pass ttlSeconds=300 for happy path and ttlSeconds=-60 for expired-token assertion. Negative TTL is intentionally NOT clamped so tests can mint already-expired tokens"
  - "application-errors.ts is authored in both Plan 04-04 and Plan 04-05 worktrees with IDENTICAL content — parallel Wave 3 execution cannot wait on cross-worktree files, and identical-byte merge resolves cleanly"
  - "Korea has no DST → Asia/Seoul is a FIXED UTC+9 offset → we avoid Intl.DateTimeFormat complexity and use `epochMs + 9h` for all wallclock math (computeNightHoursOverlap, isWithinCheckInWindow)"
  - "JWT secret decoder auto-detects 64-char hex string (production secret from Phase 4-01) vs arbitrary UTF-8 (test placeholder) — zero-configuration for both environments"
metrics:
  duration_seconds: 650
  tasks_completed: 8
  files_modified: 8
  commits: 7
  completed_at: "2026-04-10"
---

# Phase 04 Plan 05: Shift Actions Summary

**One-liner:** Worker check-in/check-out Server Actions with PostGIS geofence, jose HS256 QR JWT, Asia/Seoul night premium, and 15-min actual-hours rounding — all 6 SHIFT RED tests GREEN (28/28 assertions).

## What was built

Seven files implementing the full check-in → work → check-out lifecycle with pure-function libraries for the deterministic parts (time window, rounding, night premium, JWT sign/verify) and thin Server Action composition layers (checkIn, checkOut, generateCheckoutQrToken).

### Architecture

```
tests/shift/*.test.ts  ──── verify ────►  src/lib/{night-shift,shift-validation,qr,geofence,job-utils}
                                                           │
                                                           ▼
                                            composes ─►  Server Actions
                                                           │
                                       ┌───────────────────┴───────────────────┐
                                       ▼                                       ▼
                         src/app/(worker)/my/applications/         src/app/biz/posts/[id]/actions.ts
                         [id]/check-in/actions.ts                  (generateCheckoutQrToken)
                         (checkIn, checkOut)
```

Pure function layer is DB-free (unit-testable in <10ms per suite). Only `geofence.ts` touches Prisma — integration tested against real Supabase with `tests/shift/geofence.test.ts` (`describe.skipIf(!supabase)`), which landed in ~400ms.

### Night shift premium (`src/lib/night-shift.ts`)

```ts
export function computeNightHoursOverlap(checkIn: Date, checkOut: Date): number
export function calculateNightShiftPremium(checkIn, checkOut, hourlyPay): number
```

Walks each Seoul-local day whose night window `[D 22:00, D+1 06:00)` could overlap the `[checkIn, checkOut)` interval, sums overlap in minutes, returns hours. Premium is `floor(nightHours * hourlyPay * 0.5)` if `nightHours >= 4`, else 0.

Korea has no DST, so we treat Asia/Seoul as a fixed UTC+9 offset and avoid `Intl.DateTimeFormat` entirely — all arithmetic is pure integer minutes.

Six boundary cases verified: fully-inside (5h), straddle-left (exactly 4h boundary), straddle-right (2h < threshold), cross-midnight full (8h), no-overlap, 3h-threshold-miss.

### Job utils extension (`src/lib/job-utils.ts`)

Added `calculateActualHours(checkInAt, checkOutAt)` with `Math.round(minutes/15) * 15` rounding and extended `calculateEarnings` via a TypeScript function overload:

```ts
export function calculateEarnings(job: JobEarningsInput): number;
export function calculateEarnings(
  actualHours: number,
  rates: ShiftEarningsRates,
  nightPremium: number,
): number;
```

Dispatch is by `typeof` on the first argument. Legacy call site `check-in-flow.tsx:89` (`calculateEarnings(job)`) still works unchanged — the RED `earnings.test.ts` exercises the new form.

### Shift validation (`src/lib/shift-validation.ts`)

```ts
export function isWithinCheckInWindow(now, workDate, startTime): boolean
export function isWithinCheckOutWindow(now, workDate, startTime, checkInAt): boolean
```

`workDate` accepts `string` (`"YYYY-MM-DD"`, Asia/Seoul calendar) OR `Date` (Prisma `@db.Date` returns UTC midnight). For string input, we compose via `Date.UTC(...) - 9h` to map Seoul wallclock into UTC instants.

Check-in window: `[jobStart - 10min, jobStart + 30min]` inclusive both ends — verified against -11/-10/-1/+30/+31/+100 boundaries.

### Geofence (`src/lib/geofence.ts`)

```ts
export async function isWithinGeofence(
  businessId: string,
  coords: { lat: number; lng: number },
  radiusM: number = 200,
): Promise<boolean>
```

Single raw query:
```sql
SELECT
  CASE WHEN location IS NULL THEN true
       ELSE ST_DWithin(location,
                       ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography,
                       $radius)
  END AS within,
  (location IS NOT NULL) AS has_location
FROM public.business_profiles
WHERE id = $businessId::uuid
```

Fail-closed for missing business, fail-open + warn log for NULL location (graceful fallback because geofence is one of three check-in gates). Integration-tested against real Supabase: `178m north → true`, `250m north → false`.

### QR JWT (`src/lib/qr.ts`)

```ts
export async function signCheckoutToken(input: {
  jobId: string;
  businessId: string;
  nonce: string;
  ttlSeconds?: number;  // default 600
}): Promise<string>

export async function verifyCheckoutToken(token: string): Promise<CheckoutPayload>
```

Uses `jose` v6 `SignJWT` + `jwtVerify` with `{ algorithms: ['HS256'] }` hard-pinned to block `alg: none` and RS256 downgrade confusion attacks. Secret decoder auto-handles 64-char hex (production) or arbitrary UTF-8 (test placeholder).

Four attack cases verified: valid-happy-path, expired (`ttlSeconds: -60`), tampered signature (last-char flip), `alg: none` manual craft.

### Server Actions

**`src/app/(worker)/my/applications/[id]/check-in/actions.ts`**

```ts
export async function checkIn(applicationId, { lat, lng }): Promise<CheckInResult>
export async function checkOut(applicationId, qrToken): Promise<CheckOutResult>
```

Both gated by `requireApplicationOwner` (redirect on 404/403). checkIn checks state + time window + geofence, transitions `confirmed → in_progress`, sets `checkInAt`. checkOut checks state + loose time window + JWT validity + `payload.jobId/businessId` match, computes `actualHours + nightPremium + earnings`, transitions `in_progress → completed`.

Note: `actualHours` column is `Decimal(5,2)` — wrapped with `new Prisma.Decimal(actualHours)` on write.

**`src/app/biz/posts/[id]/actions.ts`**

```ts
export async function generateCheckoutQrToken(jobId): Promise<QrTokenResult>
```

Gated by `requireJobOwner`. Mints a random-UUID-nonce JWT with 600s TTL. In-process `Map<userId, lastMs>` rate limit of 30s per user — acceptable because legitimate usage is "one QR per shift end", and Phase 5 will swap for Redis-backed limiter.

## Test results

| File | Tests | Status | Notes |
|---|---|---|---|
| `tests/shift/night-shift.test.ts` | 6 | GREEN | Asia/Seoul 22–06 boundary cases |
| `tests/shift/actual-hours.test.ts` | 7 | GREEN | 0/7/8/15/22/23/37 minute rounding |
| `tests/shift/earnings.test.ts` | 3 | GREEN | composition with/without night premium |
| `tests/shift/check-in-time-window.test.ts` | 6 | GREEN | -11/-10/-1/+30/+31/+100 min boundaries |
| `tests/shift/geofence.test.ts` | 2 | GREEN | 178m north → true, 250m north → false (real Supabase) |
| `tests/shift/checkout-jwt.test.ts` | 4 | GREEN | valid / expired / tampered / alg-none |
| **Total** | **28** | **28/28** | |

Full suite duration: 2.18s (geofence DB roundtrip 398ms, rest ~25ms combined).

## Commits

| # | Hash | Task | Message |
|---|------|------|---------|
| 1 | `840410f` | Task 1 | feat(04-05): add night-shift premium calculation (SHIFT-03) |
| 2 | `ae667c5` | Task 2 | feat(04-05): extend job-utils with calculateActualHours + shift earnings overload (SHIFT-02) |
| 3 | `62b2bb8` | Task 3 | feat(04-05): add shift-validation with check-in/check-out time windows (SHIFT-01) |
| 4 | `630d73b` | Task 4 | feat(04-05): add geofence PostGIS ST_DWithin wrapper (SHIFT-01 D-09/D-10) |
| 5 | `b705f32` | Task 5 | feat(04-05): add JWT QR sign/verify using jose HS256 (SHIFT-02 D-15) |
| 6 | `83bcebf` | Task 6 | feat(04-05): add checkIn/checkOut Server Actions (SHIFT-01/02/03) |
| 7 | `b96acf3` | Task 7 | feat(04-05): add generateCheckoutQrToken Biz Server Action (D-15, D-16) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test-plan signature mismatch on `calculateEarnings`**

- **Found during:** Task 2
- **Issue:** Plan proposed a NEW function `calculateEarningsFromShift(hours, hourlyPay, transportFee, nightPremium)` to avoid breaking Phase 1 callers. However `tests/shift/earnings.test.ts` actually imports the EXISTING name with a NEW signature: `calculateEarnings(hours, { hourlyPay, transportFee }, nightPremium)`. Test is the contract, plan draft was speculative.
- **Fix:** Made `calculateEarnings` a TypeScript function overload that dispatches on `typeof arg0`: number → shift form (Phase 4), object → legacy `(job)` form (Phase 1, still used by `check-in-flow.tsx:89`). Both call sites compile and work without renaming anything.
- **Files modified:** `src/lib/job-utils.ts`
- **Commit:** `ae667c5`

**2. [Rule 1 - Bug] Parameter order mismatch on `isWithinCheckInWindow`**

- **Found during:** Task 3
- **Issue:** Plan draft: `isWithinCheckInWindow(workDate, startTime, now)`. Test: `isWithinCheckInWindow(now, workDate, jobStart)` with `workDate` as `"YYYY-MM-DD"` STRING (not Date).
- **Fix:** Final signature is `(now: Date, workDate: string | Date, startTime: string)` — accepts both string and Date for `workDate` (pragmatic: Prisma columns return Date, form inputs send string).
- **Files modified:** `src/lib/shift-validation.ts`
- **Commit:** `62b2bb8`

**3. [Rule 1 - Bug] Object-coords signature on `isWithinGeofence`**

- **Found during:** Task 4
- **Issue:** Plan draft: `isWithinGeofence(businessId, workerLat, workerLng, radiusM)`. Test: `isWithinGeofence(profile.id, { lat, lng })`.
- **Fix:** Final signature is `(businessId: string, coords: { lat: number; lng: number }, radiusM?: number)`.
- **Files modified:** `src/lib/geofence.ts`
- **Commit:** `630d73b`

**4. [Rule 1 - Bug] `ttlSeconds` parameter missing from `signCheckoutToken`**

- **Found during:** Task 5
- **Issue:** Plan signed with fixed 10-minute expiry. Tests need `ttlSeconds: 300` for happy path and `ttlSeconds: -60` for expired-token test. Also required `nonce` rather than optional.
- **Fix:** Signature became `{ jobId, businessId, nonce: string, ttlSeconds?: number }` with default `DEFAULT_TTL_SECONDS = 600`. Negative TTL is intentionally NOT clamped so tests can mint already-expired tokens.
- **Files modified:** `src/lib/qr.ts`
- **Commit:** `b705f32`

**5. [Rule 2 - Missing critical functionality] `src/lib/errors/application-errors.ts` needed but owned by Plan 04-04**

- **Found during:** Task 6
- **Issue:** Plan 04-05 imports `ApplicationError` and `ApplicationErrorCode` from a path that Plan 04-04 creates in its own parallel worktree. Wave 3 runs both plans simultaneously; 04-05 cannot wait for 04-04 to merge.
- **Fix:** Created `src/lib/errors/application-errors.ts` in THIS worktree with the EXACT content documented in 04-04's plan (Plan 04-04 lines 146–188). Identical byte content on both branches → merge resolves cleanly with no conflict. Added a top-of-file comment explaining the parallel-worktree duplication is intentional.
- **Files modified:** `src/lib/errors/application-errors.ts` (new file, 76 lines)
- **Commit:** `83bcebf`

**6. [Rule 3 - Blocker] Worktree missing env files + node_modules + generated Prisma client**

- **Found during:** Task 1 setup
- **Issue:** Git worktrees don't inherit untracked files (`.env`, `.env.local`), devDependencies, or the gitignored `src/generated/prisma` directory. Nothing would run.
- **Fix:** Per the parallel_execution instructions, copied `.env` and `.env.local` from `C:\Users\TG\Desktop\Njobplatform\`. Created two Windows junctions: `node_modules → ..\..\..\node_modules` and `src/generated/prisma → ..\..\..\..\..\src\generated\prisma`. Zero leak risk: both env files are `.gitignore`'d and junctions are not checked in. Verified `node_modules/next`, `node_modules/jose`, and `src/generated/prisma/client.ts` all resolve through the junctions.
- **Files modified:** none (ignored/junction)

**7. [Rule 1 - Bug] Prisma `actualHours` column is `Decimal(5,2)` — must wrap with `new Prisma.Decimal()`**

- **Found during:** Task 6 (TSC check)
- **Issue:** Passing a JS `number` to `prisma.application.update({ data: { actualHours: 4.25 } })` would type-error on Prisma's Decimal field.
- **Fix:** Wrapped with `new Prisma.Decimal(actualHours)` on write. Pure `calculateActualHours` still returns `number` (used by the test suite and by the Server Action's return value for UI display).
- **Files modified:** `src/app/(worker)/my/applications/[id]/check-in/actions.ts`
- **Commit:** `83bcebf`

### No deviations required

- Task 1 (night-shift) implementation matched plan exactly.
- Task 7 (generateCheckoutQrToken) followed plan structure, just added a `randomUUID()` nonce for every mint per the D-15 spec.

## Known Stubs

None. Every wired function is backed by real logic:
- night-shift / actual-hours / earnings: pure arithmetic
- time-window: pure date math
- geofence: real PostGIS roundtrip
- QR JWT: real jose crypto
- Server Actions: real Prisma writes and revalidatePath calls

## Known Follow-ups (out of this plan's scope)

- **`@ts-expect-error` comments in `tests/shift/*.test.ts`**: Since the modules now exist, these markers emit `TS2578 Unused '@ts-expect-error' directive` under strict tsc. Tests pass under vitest unchanged. Removal belongs to whichever plan owns test-file cleanup (likely Plan 04-10 coverage).
- **JWT nonce replay protection**: Plan 04-05 scope is "QR generator + verifier". Server-side nonce tracking (short-lived set in Redis/Postgres to reject replays within the 10-minute TTL window) is a Phase 5 hardening item, called out in the qr.ts docstring.
- **Rate limiter upgrade**: The in-process `Map<userId, lastMs>` rate limit in `generateCheckoutQrToken` resets per serverless cold instance. Phase 5 should swap for a Redis-backed limiter. Documented in the action's docstring.
- **Check-in UI wiring**: `src/app/(worker)/my/applications/[id]/check-in/check-in-flow.tsx` still uses a `setTimeout(1500)` mock and does not yet call `checkIn` / `checkOut`. That wiring is Plan 04-07 UI work (wave 4). Actions are export-ready.

## Threat Flags

None new. Plan 04-05's threat model entries (T-04-05, T-04-09, T-04-10, T-04-15) are all mitigated inline:

| Threat | Mitigation in this plan |
|---|---|
| T-04-05 (ownership bypass on check-in/out) | `requireApplicationOwner` / `requireJobOwner` redirect on 404/403, state gate, time window, geofence, JWT payload identity match |
| T-04-09 (geofence bypass) | PostGIS ST_DWithin server-side; coords come from Server Action argument not a client claim that the server trusts blindly — upstream UI is expected to use `navigator.geolocation` and pass the reading as an action parameter |
| T-04-10 (time window bypass) | Pure server-side time math using `new Date()` inside the action — client cannot inject a fake "now" |
| T-04-15 (QR forgery / replay) | jose HS256 with hard-pinned algorithms list (blocks alg=none/RS256 confusion), 10-minute exp, random UUID nonce, `payload.jobId === application.jobId` double-check |

No NEW surface introduced outside the register.

## Self-Check: PASSED

- `src/lib/night-shift.ts` exports `computeNightHoursOverlap` + `calculateNightShiftPremium` — FOUND
- `src/lib/job-utils.ts` contains `calculateActualHours` + overloaded `calculateEarnings` — FOUND
- `src/lib/shift-validation.ts` exports `isWithinCheckInWindow` + `isWithinCheckOutWindow` — FOUND
- `src/lib/geofence.ts` exports `isWithinGeofence` with `ST_DWithin` — FOUND
- `src/lib/qr.ts` exports `signCheckoutToken` + `verifyCheckoutToken` with `algorithms: ['HS256']` pin — FOUND
- `src/lib/errors/application-errors.ts` exports `ApplicationError` + `ApplicationErrorCode` — FOUND
- `src/app/(worker)/my/applications/[id]/check-in/actions.ts` exports `checkIn` + `checkOut` — FOUND
- `src/app/biz/posts/[id]/actions.ts` exports `generateCheckoutQrToken` — FOUND
- Commits `840410f ae667c5 62b2bb8 630d73b b705f32 83bcebf b96acf3` — FOUND in `git log`
- `npx vitest run tests/shift`: 6 files, 28 tests, 28/28 GREEN — VERIFIED
- `npx tsc --noEmit` on plan files only: 0 errors (all other errors belong to other plans' scope per Scope Boundary rule) — VERIFIED
- JWT roundtrip: sign → verify returns equal jobId/businessId/nonce — VERIFIED via checkout-jwt.test.ts case 1
- Geofence real Supabase: 178m north → true, 250m north → false — VERIFIED via geofence.test.ts (real ST_DWithin)
- Check-in out-of-window rejection: -11min and +31min both return false — VERIFIED via check-in-time-window.test.ts
- Night premium on earnings: 4h × 12000 + 2000 + 12000 = 62000 — VERIFIED via earnings.test.ts
