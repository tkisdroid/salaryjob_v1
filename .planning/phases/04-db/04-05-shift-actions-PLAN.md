---
phase: 04-db
plan: 05
type: execute
wave: 3
depends_on: [2, 3]
files_modified:
  - src/lib/night-shift.ts
  - src/lib/job-utils.ts
  - src/lib/geofence.ts
  - src/lib/qr.ts
  - src/lib/shift-validation.ts
  - src/app/(worker)/my/applications/[id]/check-in/actions.ts
  - src/app/biz/posts/[id]/actions.ts
autonomous: true
requirements:
  - SHIFT-01
  - SHIFT-02
  - SHIFT-03

must_haves:
  truths:
    - "calculateNightShiftPremium(checkIn, checkOut, hourlyPay) returns 0 when night overlap < 4h and (overlap * hourlyPay * 0.5) when ≥ 4h, with Asia/Seoul timezone accuracy"
    - "calculateActualHours rounds to 0.25h granularity per Math.round(minutes/15)*15"
    - "checkIn Server Action verifies window [startTime-10min, startTime+30min] AND PostGIS ST_DWithin 200m before transitioning confirmed → in_progress with checkInAt=now()"
    - "checkOut Server Action verifies jose JWT (HS256, exp, iat freshness, jobId+businessId match), transitions in_progress → completed, computes actualHours + earnings + night premium + transportFee, writes all to Application"
    - "generateCheckoutQrToken Server Action returns JWT signed with APPLICATION_JWT_SECRET, exp=+10min, callable only by job owner"
    - "tests/shift/*.test.ts 6 파일이 GREEN"
  artifacts:
    - path: "src/lib/night-shift.ts"
      provides: "calculateNightShiftPremium + computeNightHoursOverlap (Asia/Seoul)"
    - path: "src/lib/qr.ts"
      provides: "signCheckoutToken + verifyCheckoutToken (jose HS256)"
    - path: "src/lib/geofence.ts"
      provides: "isWithinGeofence (PostGIS ST_DWithin wrapper)"
    - path: "src/lib/shift-validation.ts"
      provides: "isWithinCheckInWindow (pure time function)"
    - path: "src/app/(worker)/my/applications/[id]/check-in/actions.ts"
      provides: "checkIn + checkOut Server Actions"
      exports: ["checkIn", "checkOut"]
    - path: "src/app/biz/posts/[id]/actions.ts"
      provides: "generateCheckoutQrToken Server Action"
      exports: ["generateCheckoutQrToken"]
  key_links:
    - from: "checkOut"
      to: "night-shift.calculateNightShiftPremium + job-utils.calculateActualHours"
      via: "transaction commit"
      pattern: "calculateNightShiftPremium"
    - from: "checkIn"
      to: "geofence.isWithinGeofence"
      via: "$queryRaw ST_DWithin"
      pattern: "ST_DWithin"
    - from: "generateCheckoutQrToken"
      to: "jose.SignJWT"
      via: "APPLICATION_JWT_SECRET"
      pattern: "jose"
---

<objective>
체크인/체크아웃 Server Action과 관련 순수 함수 라이브러리를 구현한다: 시간창 검증, PostGIS geofence, JWT QR sign/verify, 15분 반올림, 야간할증. Wave 0의 tests/shift/*.test.ts 6 파일을 GREEN으로 전환한다.

Purpose: SHIFT-01~03 충족. 순수 함수(night-shift, shift-validation, job-utils 확장, qr, geofence)를 먼저 구현하고 Server Action에서 composition. 이렇게 하면 unit test가 고속으로 실행되고 integration test (geofence)만 DB 왕복이 필요.
Output: 5개 lib 파일 + 2개 Server Action 파일, SHIFT 테스트 GREEN.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/04-db/04-CONTEXT.md
@.planning/phases/04-db/04-RESEARCH.md
@prisma/schema.prisma
@src/lib/dal.ts
@src/lib/db/queries.ts
@src/lib/job-utils.ts
@src/lib/errors/application-errors.ts
@tests/shift/night-shift.test.ts
@tests/shift/actual-hours.test.ts
@tests/shift/earnings.test.ts
@tests/shift/checkout-jwt.test.ts
@tests/shift/check-in-time-window.test.ts
@tests/shift/geofence.test.ts

<interfaces>
Existing src/lib/job-utils.ts exports (from Phase 1):
- `calculateEarnings(job: Job): number` — simple `hourlyPay * workHours + transportFee`
- `formatWorkDate(date: Date): string`

Phase 4 extends with:
- `calculateActualHours(checkInAt: Date, checkOutAt: Date): number` — 0.25h granularity
- New signature: `calculateEarnings(actualHours: number, hourlyPay: number, transportFee: number, nightPremium: number): number` — overloaded OR new function name to avoid breaking Phase 1 callers

Prisma schema relevant:
- Application: status, checkInAt, checkOutAt, actualHours, earnings
- Job: startTime (HH:MM), workDate (Date), hourlyPay, transportFee
- BusinessProfile: location (geography Point 4326)

Environment: APPLICATION_JWT_SECRET (32 byte hex from Plan 01 Task 9 checkpoint)
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: night-shift.ts — computeNightHoursOverlap + calculateNightShiftPremium</name>
  <files>src/lib/night-shift.ts</files>
  <read_first>
    - .planning/phases/04-db/04-CONTEXT.md D-12 (야간할증 정책)
    - .planning/phases/04-db/04-RESEARCH.md (Asia/Seoul + Intl.DateTimeFormat 패턴)
    - tests/shift/night-shift.test.ts (6 boundary cases)
  </read_first>
  <behavior>
    - `computeNightHoursOverlap(checkIn: Date, checkOut: Date): number` returns the number of hours (float) that the [checkIn, checkOut] interval overlaps with the Asia/Seoul 22:00-06:00 night window
    - Handles cross-midnight shifts (e.g., 20:00 → 02:00 next day)
    - Accepts inputs at any UTC offset; converts to Asia/Seoul internally via Intl.DateTimeFormat
    - `calculateNightShiftPremium(checkIn, checkOut, hourlyPay)` returns `Math.floor(nightHours * hourlyPay * 0.5)` if nightHours >= 4, else 0
    - 6 tests pass per VALIDATION.md SHIFT-03 row:
      1. fully-inside 23:00-04:00 (5h overlap) → premium = 5 * hp * 0.5
      2. straddle-left 20:00-02:00 (4h overlap, inclusive boundary) → premium = 4 * hp * 0.5
      3. straddle-right 04:00-10:00 (2h overlap < 4h) → 0
      4. cross-midnight full 22:00-06:00 next day (8h) → 8 * hp * 0.5
      5. no-overlap 08:00-16:00 → 0
      6. 3h overlap 23:00-02:00 → 0 (strict <4 threshold)
  </behavior>
  <action>
  ```typescript
  /**
   * Phase 4 SHIFT-03 — Night shift premium calculation.
   *
   * Rule (D-12):
   *   - Night window: 22:00–06:00 Asia/Seoul (wraps midnight)
   *   - Trigger: if the [checkIn, checkOut] interval overlaps the night window for ≥ 4 hours total
   *   - Premium: nightHoursOverlap × hourlyPay × 0.5 (NOT on the whole shift, only on the overlap)
   *   - No premium if overlap < 4 hours
   *
   * Implementation note: We convert each Date to its Asia/Seoul "minute of day" (0..1440) via
   * Intl.DateTimeFormat rather than adding/subtracting offsets manually (DST-safe, though KR has
   * no DST). For cross-midnight shifts we split the interval at local midnight and sum overlaps.
   */

  const SEOUL_TZ = 'Asia/Seoul'

  function toSeoulParts(d: Date): { date: string; minutesOfDay: number } {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: SEOUL_TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
    // en-CA produces YYYY-MM-DD, HH:mm
    const parts = fmt.formatToParts(d)
    const get = (t: string) => parts.find(p => p.type === t)!.value
    const date = `${get('year')}-${get('month')}-${get('day')}`
    let hour = parseInt(get('hour'), 10)
    if (hour === 24) hour = 0 // en-CA edge case at midnight
    const minute = parseInt(get('minute'), 10)
    return { date, minutesOfDay: hour * 60 + minute }
  }

  /**
   * Convert a Date to "minutes since an epoch fixed at Asia/Seoul local time", treating
   * Seoul as a stable offset (+09:00, no DST). Used for duration math.
   */
  function toSeoulLinearMinutes(d: Date): number {
    // Seoul is UTC+9 fixed
    return Math.floor(d.getTime() / 60000) + 9 * 60
  }

  /**
   * Night window is [22:00, 30:00) in "minutes of day" terms (30:00 = 06:00 next day).
   * For a given Seoul-local day D, the night window spans:
   *   [D 22:00, D+1 06:00)  → in linear Seoul minutes [D*1440+1320, D*1440+1800)
   */
  export function computeNightHoursOverlap(checkIn: Date, checkOut: Date): number {
    if (checkOut <= checkIn) return 0
    const startMin = toSeoulLinearMinutes(checkIn)
    const endMin = toSeoulLinearMinutes(checkOut)

    // Enumerate each Seoul-local day that the interval touches, accumulating overlap
    // with that day's night window [day*1440 + 1320, (day+1)*1440 + 360).
    const firstDay = Math.floor(startMin / 1440)
    const lastDay = Math.floor((endMin - 1) / 1440)

    let overlap = 0
    for (let day = firstDay - 1; day <= lastDay + 1; day++) {
      // Include day-1 because a shift starting just after midnight still overlaps with
      // previous day's [22:00 → 06:00 today] window.
      const nightStart = day * 1440 + 1320 // 22:00 of 'day'
      const nightEnd = nightStart + 480    // +8h → 06:00 of 'day+1'
      const lo = Math.max(startMin, nightStart)
      const hi = Math.min(endMin, nightEnd)
      if (hi > lo) overlap += hi - lo
    }
    return overlap / 60 // hours
  }

  export function calculateNightShiftPremium(
    checkIn: Date,
    checkOut: Date,
    hourlyPay: number,
  ): number {
    const nightHours = computeNightHoursOverlap(checkIn, checkOut)
    if (nightHours < 4) return 0
    return Math.floor(nightHours * hourlyPay * 0.5)
  }
  ```

  **Test alignment:** The 6 boundary cases from tests/shift/night-shift.test.ts MUST use local Asia/Seoul times. When constructing test Dates, use UTC-shifted values: e.g., "2026-04-11 23:00 KST" = new Date('2026-04-11T14:00:00.000Z').

  Run tests: `npm test -- tests/shift/night-shift --run`
  </action>
  <verify>
    <automated>bash -c 'test -f src/lib/night-shift.ts && grep -q "computeNightHoursOverlap" src/lib/night-shift.ts && grep -q "calculateNightShiftPremium" src/lib/night-shift.ts && npm test -- tests/shift/night-shift --run 2>&1 | tail -20'</automated>
  </verify>
  <done>
    - src/lib/night-shift.ts exports 2 functions
    - tests/shift/night-shift.test.ts GREEN for 6 cases
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: job-utils.ts 확장 — calculateActualHours + calculateEarnings (overload)</name>
  <files>src/lib/job-utils.ts</files>
  <read_first>
    - src/lib/job-utils.ts (기존 calculateEarnings, formatWorkDate)
    - tests/shift/actual-hours.test.ts
    - tests/shift/earnings.test.ts
    - .planning/phases/04-db/04-CONTEXT.md D-11 (15분 반올림)
  </read_first>
  <behavior>
    - `calculateActualHours(checkInAt: Date, checkOutAt: Date): number` returns hours rounded to 0.25 increments (via `Math.round(minutes/15) * 15 / 60`)
    - `calculateEarningsFromShift(actualHours: number, hourlyPay: number, transportFee: number, nightPremium: number): number` returns `Math.floor(actualHours * hourlyPay) + nightPremium + transportFee`
    - 기존 `calculateEarnings(job)` 함수는 기존 콜사이트 호환을 위해 그대로 유지 OR deprecate 주석 추가
    - 테스트 케이스: 0min→0, 7min→0.0, 8min→0.25, 15min→0.25, 22min→0.25, 23min→0.5, 37min→0.5
  </behavior>
  <action>
  `src/lib/job-utils.ts` 파일 끝에 추가 (기존 함수는 그대로 유지):

  ```typescript
  /**
   * Phase 4 SHIFT-02 D-11 — Actual hours worked, rounded to 0.25 (15-minute) granularity.
   * Rounding rule: Math.round(minutes / 15) * 15
   *   7 min → 0 (rounds down)
   *   8 min → 15 min = 0.25h
   *   22 min → 15 min = 0.25h
   *   23 min → 30 min = 0.5h
   */
  export function calculateActualHours(checkInAt: Date, checkOutAt: Date): number {
    if (checkOutAt <= checkInAt) return 0
    const rawMinutes = (checkOutAt.getTime() - checkInAt.getTime()) / 60000
    const roundedMinutes = Math.round(rawMinutes / 15) * 15
    return roundedMinutes / 60
  }

  /**
   * Phase 4 SHIFT-02 — Final earnings at check-out.
   *   base = floor(actualHours * hourlyPay)
   *   total = base + nightPremium + transportFee (flat)
   * Night premium comes from calculateNightShiftPremium (src/lib/night-shift.ts).
   */
  export function calculateEarningsFromShift(
    actualHours: number,
    hourlyPay: number,
    transportFee: number,
    nightPremium: number,
  ): number {
    const base = Math.floor(actualHours * hourlyPay)
    return base + nightPremium + transportFee
  }
  ```

  기존 `calculateEarnings(job)` 함수 바로 위에 JSDoc 추가:
  ```typescript
  /**
   * @deprecated Phase 4: Use calculateEarningsFromShift for actual earnings at check-out time.
   * This function computes the *scheduled* earnings (planned shift) and is still used in
   * /posts/[id] detail page for "예상 수입" display.
   */
  export function calculateEarnings(job: ...) { ... }
  ```
  </action>
  <verify>
    <automated>bash -c 'grep -q "calculateActualHours" src/lib/job-utils.ts && grep -q "calculateEarningsFromShift" src/lib/job-utils.ts && npm test -- tests/shift/actual-hours tests/shift/earnings --run 2>&1 | tail -15'</automated>
  </verify>
  <done>
    - 2 new functions exported
    - tests/shift/actual-hours.test.ts GREEN
    - tests/shift/earnings.test.ts GREEN
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: shift-validation.ts — isWithinCheckInWindow</name>
  <files>src/lib/shift-validation.ts</files>
  <read_first>
    - .planning/phases/04-db/04-CONTEXT.md D-09 (시간창: -10min ~ +30min)
    - tests/shift/check-in-time-window.test.ts
  </read_first>
  <behavior>
    - `isWithinCheckInWindow(workDate: Date, startTime: string, now: Date): boolean` returns true iff `now` is in `[startTime - 10min, startTime + 30min]` interpreted in Asia/Seoul local time but the comparison is pure timestamp math (since the function gets real Date instances)
    - workDate is a Date (midnight UTC), startTime is "HH:MM"
    - Boundaries inclusive: -10 (true), -11 (false), +30 (true), +31 (false)
  </behavior>
  <action>
  ```typescript
  /**
   * Phase 4 SHIFT-01 D-09 — Check-in time window validator.
   *
   * Window: [startTime - 10 minutes, startTime + 30 minutes]
   * Both bounds inclusive.
   *
   * Input:
   *   workDate: Date → "2026-04-11T00:00:00.000Z" (midnight UTC from Prisma Date column)
   *   startTime: "HH:MM" → local time the Business authored in (Asia/Seoul per Phase 3 seed)
   *   now: Date → current real time
   *
   * Phase 3 seed semantics: workDate + startTime were both inserted as UTC-consistent values
   * (see supabase/migrations/20260411000003_pg_cron_expire_jobs.sql). We combine them with
   * setUTCHours and compare against `now` directly.
   */
  export function isWithinCheckInWindow(workDate: Date, startTime: string, now: Date = new Date()): boolean {
    const [h, m] = startTime.split(':').map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) return false
    const workStart = new Date(workDate)
    workStart.setUTCHours(h, m, 0, 0)
    const openAt  = workStart.getTime() - 10 * 60 * 1000
    const closeAt = workStart.getTime() + 30 * 60 * 1000
    const t = now.getTime()
    return t >= openAt && t <= closeAt
  }

  /**
   * Phase 4 SHIFT-02 — Check-out time window: any time after check-in until 12 hours post-startTime.
   * Loose upper bound; real enforcement comes from JWT expiry + Business QR generation window.
   */
  export function isWithinCheckOutWindow(workDate: Date, startTime: string, checkInAt: Date, now: Date = new Date()): boolean {
    if (now < checkInAt) return false
    const [h, m] = startTime.split(':').map(Number)
    const workStart = new Date(workDate)
    workStart.setUTCHours(h, m, 0, 0)
    const latest = workStart.getTime() + 12 * 60 * 60 * 1000
    return now.getTime() <= latest
  }
  ```
  </action>
  <verify>
    <automated>bash -c 'test -f src/lib/shift-validation.ts && grep -q "isWithinCheckInWindow" src/lib/shift-validation.ts && npm test -- tests/shift/check-in-time-window --run 2>&1 | tail -15'</automated>
  </verify>
  <done>
    - file exports isWithinCheckInWindow + isWithinCheckOutWindow
    - tests/shift/check-in-time-window.test.ts GREEN (6 boundary cases)
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: geofence.ts — PostGIS ST_DWithin wrapper</name>
  <files>src/lib/geofence.ts</files>
  <read_first>
    - src/lib/db/queries.ts (PostGIS $queryRaw 기존 패턴)
    - .planning/phases/04-db/04-CONTEXT.md D-09, D-10 (200m radius)
    - tests/shift/geofence.test.ts
  </read_first>
  <behavior>
    - `isWithinGeofence(businessId: string, workerLat: number, workerLng: number, radiusM: number = 200): Promise<boolean>`
    - Uses `$queryRaw` + `ST_DWithin(business.location::geography, ST_MakePoint($lng, $lat)::geography, $radiusM)`
    - Returns true if within radius OR if business.location is NULL (graceful fallback for businesses without precise geocoding — log warning)
  </behavior>
  <action>
  ```typescript
  import { prisma } from '@/lib/db'
  import { Prisma } from '@/generated/prisma/client'

  /**
   * Phase 4 SHIFT-01 D-09, D-10 — Geofence check using PostGIS ST_DWithin.
   *
   * Computes distance between worker's current GPS reading and business's stored geography Point.
   * Default radius 200m (D-10) accounts for GPS error (20–50m) + building scale.
   *
   * Returns true if within radius. If the business has no location Point (older records), returns
   * true as a graceful fallback and logs a warning — this is acceptable because check-in also
   * requires confirmed application + time window, so geofence is just one of three gates.
   */
  export async function isWithinGeofence(
    businessId: string,
    workerLat: number,
    workerLng: number,
    radiusM: number = 200,
  ): Promise<boolean> {
    const rows = await prisma.$queryRaw<{ within: boolean; has_location: boolean }[]>(Prisma.sql`
      SELECT
        CASE
          WHEN location IS NULL THEN true
          ELSE ST_DWithin(
            location,
            ST_SetSRID(ST_MakePoint(${workerLng}, ${workerLat}), 4326)::geography,
            ${radiusM}
          )
        END AS within,
        (location IS NOT NULL) AS has_location
      FROM public.business_profiles
      WHERE id = ${businessId}::uuid
    `)

    if (rows.length === 0) return false // business not found
    const row = rows[0]
    if (!row.has_location) {
      console.warn(`[geofence] business ${businessId} has no location Point — falling back to true`)
    }
    return row.within
  }
  ```
  </action>
  <verify>
    <automated>bash -c 'test -f src/lib/geofence.ts && grep -q "isWithinGeofence" src/lib/geofence.ts && grep -q "ST_DWithin" src/lib/geofence.ts && npm test -- tests/shift/geofence --run 2>&1 | tail -15'</automated>
  </verify>
  <done>
    - file exports isWithinGeofence
    - tests/shift/geofence.test.ts GREEN (inside 199m → true, outside 201m → false)
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 5: qr.ts — jose SignJWT + jwtVerify wrappers</name>
  <files>src/lib/qr.ts</files>
  <read_first>
    - .planning/phases/04-db/04-CONTEXT.md D-15 (JWT payload shape, HS256, 10min exp)
    - tests/shift/checkout-jwt.test.ts (4 attack cases)
    - node_modules/jose/README.md (API 최신 확인)
  </read_first>
  <behavior>
    - `signCheckoutToken(payload: { jobId: string; businessId: string; nonce?: string }): Promise<string>` → JWT HS256, exp=+10min, iat=now, secret from process.env.APPLICATION_JWT_SECRET
    - `verifyCheckoutToken(token: string): Promise<CheckoutPayload>` → throws on invalid/expired/tampered/alg-confused; returns parsed payload with jobId, businessId, nonce, exp, iat
    - Alg-confused case (alg=none) rejected by specifying `algorithms: ['HS256']` in verify options
  </behavior>
  <action>
  ```typescript
  import { SignJWT, jwtVerify, errors as joseErrors } from 'jose'

  type CheckoutPayload = {
    jobId: string
    businessId: string
    nonce: string
    iat: number
    exp: number
  }

  function getSecret(): Uint8Array {
    const secret = process.env.APPLICATION_JWT_SECRET
    if (!secret) {
      throw new Error('APPLICATION_JWT_SECRET environment variable is required (Phase 4 D-15)')
    }
    // Allow both hex and base64 formats; hex is the D-15 recommended 32-byte random
    if (/^[0-9a-f]+$/i.test(secret) && secret.length === 64) {
      const buf = new Uint8Array(32)
      for (let i = 0; i < 32; i++) buf[i] = parseInt(secret.slice(i * 2, i * 2 + 2), 16)
      return buf
    }
    return new TextEncoder().encode(secret)
  }

  /**
   * Phase 4 D-15 — Sign a checkout QR payload.
   * Issued by Business via generateCheckoutQrToken Server Action, rendered as SVG QR.
   */
  export async function signCheckoutToken(input: {
    jobId: string
    businessId: string
    nonce?: string
  }): Promise<string> {
    const nonce = input.nonce ?? crypto.randomUUID()
    const now = Math.floor(Date.now() / 1000)
    const token = await new SignJWT({
      jobId: input.jobId,
      businessId: input.businessId,
      nonce,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(now + 10 * 60) // 10 minutes (D-15)
      .sign(getSecret())
    return token
  }

  /**
   * Phase 4 D-15 — Verify a checkout token scanned by Worker's camera.
   * Throws on:
   *   - Invalid signature (tampered)
   *   - Expired (exp < now)
   *   - Wrong algorithm (anything other than HS256 — blocks alg=none attack)
   *   - Missing required fields
   */
  export async function verifyCheckoutToken(token: string): Promise<CheckoutPayload> {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ['HS256'],
    })
    if (
      typeof payload.jobId !== 'string' ||
      typeof payload.businessId !== 'string' ||
      typeof payload.nonce !== 'string' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      throw new Error('Invalid QR payload shape')
    }
    return payload as unknown as CheckoutPayload
  }

  export type { CheckoutPayload }
  export { joseErrors }
  ```

  **Alg confusion test coverage:** jwtVerify with `algorithms: ['HS256']` rejects `{alg:'none'}` and `{alg:'RS256'}` tokens. The test file should verify via constructing a hand-crafted unsigned JWT and asserting verify throws.
  </action>
  <verify>
    <automated>bash -c 'test -f src/lib/qr.ts && grep -q "signCheckoutToken" src/lib/qr.ts && grep -q "verifyCheckoutToken" src/lib/qr.ts && grep -q "algorithms: \\[\x27HS256\x27\\]" src/lib/qr.ts && APPLICATION_JWT_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef npm test -- tests/shift/checkout-jwt --run 2>&1 | tail -15'</automated>
  </verify>
  <done>
    - sign/verify functions exported
    - tests/shift/checkout-jwt.test.ts GREEN for 4 attack cases
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 6: checkIn + checkOut Server Actions</name>
  <files>src/app/(worker)/my/applications/[id]/check-in/actions.ts</files>
  <read_first>
    - src/app/(worker)/my/applications/[id]/check-in/check-in-flow.tsx (기존 UI structure)
    - src/lib/dal.ts (requireApplicationOwner)
    - src/lib/night-shift.ts (Task 1)
    - src/lib/shift-validation.ts (Task 3)
    - src/lib/geofence.ts (Task 4)
    - src/lib/qr.ts (Task 5)
    - src/lib/job-utils.ts (Task 2 확장)
    - .planning/phases/04-db/04-CONTEXT.md D-09, D-11, D-12, D-13, D-15
  </read_first>
  <behavior>
    - `checkIn(applicationId: string, coords: { lat: number; lng: number }): Promise<{success, error?}>`:
      - requireApplicationOwner (throws 404/403)
      - application.status === 'confirmed' (else 'invalid_state')
      - isWithinCheckInWindow (else 'check_in_time_window')
      - isWithinGeofence(job.businessId, coords) (else 'check_in_geofence')
      - UPDATE status='in_progress', checkInAt=now()
      - revalidatePath
    - `checkOut(applicationId: string, qrToken: string): Promise<{success, earnings?, actualHours?, error?}>`:
      - requireApplicationOwner
      - application.status === 'in_progress' (else 'invalid_state')
      - verifyCheckoutToken → payload.jobId === application.jobId, payload.businessId === job.businessId
      - calculateActualHours(checkInAt, now)
      - calculateNightShiftPremium(checkInAt, now, job.hourlyPay)
      - calculateEarningsFromShift(actualHours, hourlyPay, transportFee, premium)
      - UPDATE status='completed', checkOutAt=now, actualHours, earnings
      - revalidatePath
  </behavior>
  <action>
  파일 생성:

  ```typescript
  'use server'

  import { prisma } from '@/lib/db'
  import { revalidatePath } from 'next/cache'
  import { requireWorker } from '@/lib/dal'
  import { ApplicationError, type ApplicationErrorCode } from '@/lib/errors/application-errors'
  import { isWithinCheckInWindow, isWithinCheckOutWindow } from '@/lib/shift-validation'
  import { isWithinGeofence } from '@/lib/geofence'
  import { verifyCheckoutToken } from '@/lib/qr'
  import { calculateActualHours, calculateEarningsFromShift } from '@/lib/job-utils'
  import { calculateNightShiftPremium } from '@/lib/night-shift'

  export type CheckInResult =
    | { success: true }
    | { success: false; error: ApplicationErrorCode }

  export type CheckOutResult =
    | { success: true; actualHours: number; earnings: number; nightPremium: number }
    | { success: false; error: ApplicationErrorCode }

  /**
   * SHIFT-01: Worker check-in with time window + geofence.
   */
  export async function checkIn(
    applicationId: string,
    coords: { lat: number; lng: number },
  ): Promise<CheckInResult> {
    const session = await requireWorker()
    try {
      const app = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { job: { select: { id: true, businessId: true, workDate: true, startTime: true } } },
      })
      if (!app) throw new ApplicationError('application_not_found')
      if (app.workerId !== session.id) throw new ApplicationError('application_not_owned')
      if (app.status !== 'confirmed') throw new ApplicationError('invalid_state')

      if (!isWithinCheckInWindow(app.job.workDate, app.job.startTime)) {
        throw new ApplicationError('check_in_time_window')
      }
      if (!(await isWithinGeofence(app.job.businessId, coords.lat, coords.lng))) {
        throw new ApplicationError('check_in_geofence')
      }

      await prisma.application.update({
        where: { id: applicationId },
        data: { status: 'in_progress', checkInAt: new Date() },
      })
      revalidatePath(`/my/applications/${applicationId}`)
      revalidatePath('/my/applications')
      return { success: true }
    } catch (e) {
      if (e instanceof ApplicationError) return { success: false, error: e.code }
      console.error('[checkIn]', e)
      return { success: false, error: 'unknown' }
    }
  }

  /**
   * SHIFT-02, SHIFT-03: Worker check-out with QR verification + earnings calculation.
   */
  export async function checkOut(applicationId: string, qrToken: string): Promise<CheckOutResult> {
    const session = await requireWorker()
    try {
      const app = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          job: {
            select: {
              id: true, businessId: true, workDate: true, startTime: true,
              hourlyPay: true, transportFee: true,
            },
          },
        },
      })
      if (!app) throw new ApplicationError('application_not_found')
      if (app.workerId !== session.id) throw new ApplicationError('application_not_owned')
      if (app.status !== 'in_progress') throw new ApplicationError('invalid_state')
      if (!app.checkInAt) throw new ApplicationError('invalid_state')

      // Loose check-out window (12h after start) — strict upper enforcement is JWT exp
      if (!isWithinCheckOutWindow(app.job.workDate, app.job.startTime, app.checkInAt)) {
        throw new ApplicationError('check_out_time_window')
      }

      // Verify JWT QR payload
      let payload
      try {
        payload = await verifyCheckoutToken(qrToken)
      } catch (err: any) {
        if (err?.code === 'ERR_JWT_EXPIRED' || /expired/i.test(String(err?.message))) {
          throw new ApplicationError('check_out_qr_expired')
        }
        throw new ApplicationError('check_out_qr_invalid')
      }
      if (payload.jobId !== app.job.id || payload.businessId !== app.job.businessId) {
        throw new ApplicationError('check_out_qr_invalid')
      }

      const checkOutAt = new Date()
      const actualHours = calculateActualHours(app.checkInAt, checkOutAt)
      const nightPremium = calculateNightShiftPremium(app.checkInAt, checkOutAt, app.job.hourlyPay)
      const earnings = calculateEarningsFromShift(
        actualHours,
        app.job.hourlyPay,
        app.job.transportFee,
        nightPremium,
      )

      await prisma.application.update({
        where: { id: applicationId },
        data: {
          status: 'completed',
          checkOutAt,
          actualHours,
          earnings,
        },
      })
      revalidatePath(`/my/applications/${applicationId}`)
      revalidatePath('/my/applications')
      return { success: true, actualHours, earnings, nightPremium }
    } catch (e) {
      if (e instanceof ApplicationError) return { success: false, error: e.code }
      console.error('[checkOut]', e)
      return { success: false, error: 'unknown' }
    }
  }
  ```
  </action>
  <verify>
    <automated>bash -c 'test -f "src/app/(worker)/my/applications/[id]/check-in/actions.ts" && grep -q "checkIn" "src/app/(worker)/my/applications/[id]/check-in/actions.ts" && grep -q "checkOut" "src/app/(worker)/my/applications/[id]/check-in/actions.ts" && grep -q "verifyCheckoutToken" "src/app/(worker)/my/applications/[id]/check-in/actions.ts" && npx tsc --noEmit 2>&1 | grep "check-in/actions.ts" | head -5 || echo "no errors"'</automated>
  </verify>
  <done>
    - checkIn + checkOut Server Actions exported
    - TypeScript compiles
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 7: generateCheckoutQrToken Server Action (Biz)</name>
  <files>src/app/biz/posts/[id]/actions.ts</files>
  <read_first>
    - src/app/biz/posts/actions.ts (Phase 3 Biz 콜로케이션 패턴)
    - src/lib/dal.ts (requireJobOwner)
    - src/lib/qr.ts
    - .planning/phases/04-db/04-CONTEXT.md D-16 (QR 모달 UX 힌트 — rate limit 고려)
  </read_first>
  <behavior>
    - `generateCheckoutQrToken(jobId: string): Promise<{ success: true; token: string; expiresAt: Date } | { success: false; error: ApplicationErrorCode }>`
    - requireJobOwner (else 'job_not_owned')
    - signCheckoutToken({ jobId, businessId: job.businessId })
    - Returns token string + expiresAt (now + 10min)
    - Naive rate limit: in-memory Map<userId, lastGenerated> — reject if called within 30s (Phase 4 simple defense, Phase 5 proper rate limit)
  </behavior>
  <action>
  **참고:** `src/app/biz/posts/[id]/actions.ts` 는 새 파일이다. 기존 `src/app/biz/posts/actions.ts` (디렉토리 레벨)는 CRUD 액션을 담고 있으므로 분리된 경로에 생성.

  ```typescript
  'use server'

  import { requireBusiness } from '@/lib/dal'
  import { prisma } from '@/lib/db'
  import { signCheckoutToken } from '@/lib/qr'
  import { ApplicationError, type ApplicationErrorCode } from '@/lib/errors/application-errors'

  export type QrTokenResult =
    | { success: true; token: string; expiresAt: Date }
    | { success: false; error: ApplicationErrorCode | 'rate_limited' }

  // Naive in-process rate limit: one QR per 30 seconds per Biz user
  // Phase 5 should replace with Redis or DB-backed rate limit
  const lastGeneratedByUser = new Map<string, number>()
  const RATE_LIMIT_MS = 30 * 1000

  /**
   * Phase 4 D-15, D-16: Business generates a JWT-signed QR token for check-out.
   * Callable only by job author (requireBusiness + ownership check).
   * Token expires in 10 minutes.
   */
  export async function generateCheckoutQrToken(jobId: string): Promise<QrTokenResult> {
    const session = await requireBusiness()

    const now = Date.now()
    const last = lastGeneratedByUser.get(session.id) ?? 0
    if (now - last < RATE_LIMIT_MS) {
      return { success: false, error: 'rate_limited' }
    }

    try {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { id: true, authorId: true, businessId: true },
      })
      if (!job) throw new ApplicationError('job_not_owned') // conflate for less info leak
      if (job.authorId !== session.id) throw new ApplicationError('job_not_owned')

      const token = await signCheckoutToken({
        jobId: job.id,
        businessId: job.businessId,
      })
      lastGeneratedByUser.set(session.id, now)

      return {
        success: true,
        token,
        expiresAt: new Date(now + 10 * 60 * 1000),
      }
    } catch (e) {
      if (e instanceof ApplicationError) return { success: false, error: e.code }
      console.error('[generateCheckoutQrToken]', e)
      return { success: false, error: 'unknown' }
    }
  }
  ```
  </action>
  <verify>
    <automated>bash -c 'test -f "src/app/biz/posts/[id]/actions.ts" && grep -q "generateCheckoutQrToken" "src/app/biz/posts/[id]/actions.ts" && grep -q "signCheckoutToken" "src/app/biz/posts/[id]/actions.ts" && npx tsc --noEmit 2>&1 | grep "biz/posts/\\[id\\]/actions" | head -5 || echo "no errors"'</automated>
  </verify>
  <done>
    - generateCheckoutQrToken exported
    - rate limit 30s 적용
  </done>
</task>

<task type="auto">
  <name>Task 8: Full SHIFT test suite GREEN 확인</name>
  <files>(verification only)</files>
  <read_first>
    - tests/shift/ directory
  </read_first>
  <action>
  `npm test -- tests/shift --run` 실행. 6 파일 전부 PASS 확인:
  - night-shift.test.ts (6 cases)
  - check-in-time-window.test.ts (6 cases)
  - geofence.test.ts (2 cases: 199m/201m)
  - checkout-jwt.test.ts (4 cases)
  - actual-hours.test.ts (7 cases)
  - earnings.test.ts (composition)

  만약 실패가 있으면 해당 task로 돌아가 수정 (예: night-shift.test.ts가 boundary case에서 fail하면 Task 1 `toSeoulLinearMinutes` 로직 검토).
  </action>
  <verify>
    <automated>npm test -- tests/shift --run 2>&1 | tail -30</automated>
  </verify>
  <done>
    - tests/shift/*.test.ts 6 files all PASS, 0 failing
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Worker client → checkIn (geolocation) | lat/lng can be spoofed (dev tools); geofence + time window are complementary, not sufficient alone |
| Scanner → checkOut (QR token) | JWT prevents replay across jobs but NOT screen-reshow within 10min (accept) |
| Biz → generateCheckoutQrToken | Rate limit in-process only (single-instance Vercel Node) |

## STRIDE Threat Register

| ID | Category | Component | Disposition | Mitigation |
|----|----------|-----------|-------------|------------|
| T-04-24 | Spoofing | GPS spoofing for geofence bypass | accept | Mobile dev tools can spoof coords; mitigated by combining with (a) time window (Worker must be at site during startTime window) and (b) QR check-out requiring physical presence to scan. Residual: Worker + collaborating Biz could fake entire flow — no defense without hardware attestation (out of scope) |
| T-04-25 | Tampering | JWT signature forgery | mitigate | jose HS256 with 32-byte secret; `algorithms: ['HS256']` blocks alg=none; tested in checkout-jwt.test.ts |
| T-04-26 | Replay | QR code screenshot reuse within 10 min | accept | D-15 10-minute expiry is the main defense; nonce provides future revocation point if needed (Phase 5 could store nonce on first-use) |
| T-04-27 | DoS | generateCheckoutQrToken spam | mitigate | 30s in-process rate limit; Vercel edge rate limit upstream |
| T-04-28 | Elevation | Worker triggering checkOut on another's application | mitigate | requireWorker + app.workerId === session.id explicit check in checkOut |
| T-04-29 | Integrity | checkOutAt after work end is legitimate (late departure) | accept | D-11 "정직한 시간 지급" — no penalty for late checkout; actualHours formula handles it |
| T-04-30 | Secret exposure | APPLICATION_JWT_SECRET in env | mitigate | Vercel env vars, not in repo; `.env.local` gitignored; Plan 01 .env.example has empty placeholder |
| T-04-31 | Timezone confusion | Night premium computed in wrong TZ | mitigate | computeNightHoursOverlap uses fixed Seoul +9 offset; Asia/Seoul has no DST; tested with 6 explicit boundary cases |
</threat_model>

<verification>
- `npm test -- tests/shift --run` 6/6 files GREEN
- TypeScript compiles (focus on touched files)
- Manual: simulate checkIn/checkOut via `node` REPL with seeded application (optional smoke)
</verification>

<success_criteria>
- [x] 5 library files created (night-shift, shift-validation, geofence, qr, job-utils extended)
- [x] 2 action files (check-in/checkIn-checkOut, biz/posts/[id]/generateCheckoutQrToken)
- [x] All tests/shift/ 6 files GREEN
- [x] TypeScript compiles for touched files
</success_criteria>

<output>
After completion, create `.planning/phases/04-db/04-05-SUMMARY.md` with:
- Library surface (signatures)
- Server Action signatures + error codes
- Night-shift algorithm sketch + test case count
- Known follow-ups: html5-qrcode UI (Plan 08), qrcode SVG generation in Biz modal (Plan 09)
</output>
