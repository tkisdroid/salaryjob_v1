---
phase: 04-db
plan: 07
type: execute
wave: 4
depends_on: [2, 3]
files_modified:
  - src/lib/time-filters.ts
  - src/lib/db/queries.ts
  - src/types/kakao.d.ts
  - src/components/worker/map-view.tsx
  - src/components/worker/home-filter-bar.tsx
  - src/hooks/use-kakao-maps-sdk.ts
  - src/app/(worker)/home/page.tsx
  - src/app/(worker)/home/home-client.tsx
autonomous: true
requirements:
  - APPL-01

must_haves:
  truths:
    - "src/lib/time-filters.ts exports buildTimeFilterSQL({ preset, buckets }) returning parameterized Prisma.sql fragments for '오늘'/'내일'/'이번주' + 오전/오후/저녁/야간 buckets"
    - "src/lib/db/queries.ts getJobsPaginated/getJobsByDistance accept { timePreset, timeBuckets, radiusKm } and apply WHERE correctly"
    - "src/components/worker/map-view.tsx lazy-loads Kakao Maps SDK via document.head script injection with autoload=false and kakao.maps.load callback"
    - "/home 페이지에 [리스트|지도] 토글 + 거리 스테퍼(1/3/5/10km) + 시간 프리셋 + 시간대 버킷 필터 UI가 있다"
    - "지도 모드에서 현재 필터 적용된 공고 marker가 렌더되고 marker click시 preview card가 표시된다"
    - "NEXT_PUBLIC_KAKAO_MAP_KEY 환경변수가 없으면 '지도' 토글 버튼이 disabled 상태로 표시되고 툴팁으로 안내한다"
    - "tests/search/time-filter.test.ts + tests/search/time-bucket.test.ts 가 GREEN"
  artifacts:
    - path: "src/lib/time-filters.ts"
      provides: "buildTimeFilterSQL + doesTimeBucketMatch + TimePreset/TimeBucket types"
    - path: "src/types/kakao.d.ts"
      provides: "ambient window.kakao type declaration"
    - path: "src/components/worker/map-view.tsx"
      provides: "Kakao Maps container + marker layer + click → preview card"
    - path: "src/components/worker/home-filter-bar.tsx"
      provides: "filter chips/buttons wired to URL query params"
  key_links:
    - from: "home-filter-bar"
      to: "URL query param (?radius=3&preset=today&buckets=morning)"
      via: "useRouter + useSearchParams"
      pattern: "useSearchParams"
    - from: "map-view.tsx"
      to: "getJobsByDistance (SERVER)"
      via: "server-side fetch on toggle"
      pattern: "getJobsByDistance"
---

<objective>
/home 탐색 고도화(SEARCH-02 + SEARCH-03): 리스트/지도 토글, 카카오맵 연동, 시간 프리셋 + 시간대 버킷 + 거리 스테퍼 필터를 구현한다.

Purpose: scope 확장된 D-23~D-28 충족. Phase 3의 `getJobsByDistance` PostGIS query를 재사용하고, 지도 모드용 ambient 타입과 lazy SDK loader를 신설.
Output: 3개 컴포넌트 + 1개 훅 + 1개 타입 정의 + time-filters 라이브러리 + queries.ts 확장 + /home 페이지 리라이트. tests/search GREEN.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/04-db/04-CONTEXT.md
@.planning/phases/04-db/04-RESEARCH.md
@.planning/phases/04-db/04-UI-SPEC.md
@src/lib/db/queries.ts
@src/app/(worker)/home/page.tsx
@src/app/(worker)/home/actions.ts
@.planning/phases/03-db/03-06-SUMMARY.md
@tests/search/time-filter.test.ts
@tests/search/time-bucket.test.ts
@tests/e2e/map-view.spec.ts

<interfaces>
Phase 3 getJobsByDistance signature (from 03-06-SUMMARY + queries.ts — read actual file before extending):
```typescript
export async function getJobsByDistance(params: {
  lat: number; lng: number; radiusM: number; cursor?: string; limit?: number;
}): Promise<JobWithDistance[]>
```

Phase 4 extends it to accept `timePreset`, `timeBuckets` filter params. Additive changes only — no existing callers break.

Kakao Maps SDK (window.kakao.maps): load with autoload=false, then `kakao.maps.load(() => { new kakao.maps.Map(...) })`. API reference at https://apis.map.kakao.com/web/guide/
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: src/lib/time-filters.ts — buildTimeFilterSQL + doesTimeBucketMatch</name>
  <files>src/lib/time-filters.ts</files>
  <read_first>
    - tests/search/time-filter.test.ts
    - tests/search/time-bucket.test.ts
    - .planning/phases/04-db/04-CONTEXT.md D-26 (preset + bucket 정의)
    - src/lib/db/queries.ts (Prisma.sql 사용 패턴)
  </read_first>
  <behavior>
    - `TimePreset = 'today' | 'tomorrow' | 'this-week'` (or Korean labels — tests 결정)
    - `TimeBucket = 'morning' | 'afternoon' | 'evening' | 'night'`
    - `buildTimeFilterSQL({ preset, buckets })` returns `{ whereClauses: string[]; params: any[] }` or Prisma.Sql fragments
    - `doesTimeBucketMatch(startTime: string, bucket: TimeBucket): boolean`:
      - 오전 06:00–12:00
      - 오후 12:00–18:00
      - 저녁 18:00–22:00
      - 야간 22:00–06:00 (day boundary crossing)
  </behavior>
  <action>
  ```typescript
  import { Prisma } from '@/generated/prisma/client'

  export type TimePreset = 'today' | 'tomorrow' | 'this-week'
  export type TimeBucket = 'morning' | 'afternoon' | 'evening' | 'night'

  const BUCKET_RANGES: Record<TimeBucket, [number, number]> = {
    morning:   [ 6 * 60, 12 * 60],
    afternoon: [12 * 60, 18 * 60],
    evening:   [18 * 60, 22 * 60],
    night:     [22 * 60, 30 * 60], // wraps to 06:00 next day
  }

  function hmToMinutes(hm: string): number {
    const [h, m] = hm.split(':').map(Number)
    return h * 60 + m
  }

  /**
   * Phase 4 SEARCH-03: Does a startTime "HH:MM" fall within a named bucket?
   * 야간 (22:00-06:00) wraps the midnight boundary.
   */
  export function doesTimeBucketMatch(startTime: string, bucket: TimeBucket): boolean {
    const mins = hmToMinutes(startTime)
    const [lo, hi] = BUCKET_RANGES[bucket]
    if (bucket === 'night') {
      return mins >= 22 * 60 || mins < 6 * 60
    }
    return mins >= lo && mins < hi
  }

  /**
   * Phase 4 SEARCH-03: Build Prisma.sql WHERE fragments for time preset + buckets.
   * Returns an array of conditions to be AND-ed with other WHERE parts.
   *
   * Preset → workDate range:
   *   today:     workDate = current_date
   *   tomorrow:  workDate = current_date + 1
   *   this-week: workDate BETWEEN date_trunc('week', now())::date AND date_trunc('week', now())::date + 6
   *
   * Buckets → startTime string prefix match (since startTime stored as "HH:MM" text):
   *   morning:   startTime >= '06:00' AND startTime < '12:00'
   *   afternoon: startTime >= '12:00' AND startTime < '18:00'
   *   evening:   startTime >= '18:00' AND startTime < '22:00'
   *   night:     startTime >= '22:00' OR startTime < '06:00'
   */
  export function buildTimeFilterSQL(opts: { preset?: TimePreset; buckets?: TimeBucket[] }): Prisma.Sql[] {
    const clauses: Prisma.Sql[] = []

    if (opts.preset === 'today') {
      clauses.push(Prisma.sql`"workDate" = current_date`)
    } else if (opts.preset === 'tomorrow') {
      clauses.push(Prisma.sql`"workDate" = current_date + 1`)
    } else if (opts.preset === 'this-week') {
      clauses.push(Prisma.sql`"workDate" BETWEEN date_trunc('week', now())::date AND date_trunc('week', now())::date + 6`)
    }

    if (opts.buckets && opts.buckets.length > 0) {
      const bucketClauses: Prisma.Sql[] = opts.buckets.map((b) => {
        switch (b) {
          case 'morning':   return Prisma.sql`("startTime" >= '06:00' AND "startTime" < '12:00')`
          case 'afternoon': return Prisma.sql`("startTime" >= '12:00' AND "startTime" < '18:00')`
          case 'evening':   return Prisma.sql`("startTime" >= '18:00' AND "startTime" < '22:00')`
          case 'night':     return Prisma.sql`("startTime" >= '22:00' OR "startTime" < '06:00')`
        }
      })
      // OR among buckets (multi-select means ANY match)
      const joined = bucketClauses.reduce(
        (acc, cur, i) => i === 0 ? cur : Prisma.sql`${acc} OR ${cur}`,
        Prisma.empty,
      )
      clauses.push(Prisma.sql`(${joined})`)
    }

    return clauses
  }
  ```

  **Test file 네이밍 확인:** tests/search/time-filter.test.ts가 기대하는 export 네임이 다르면 alias export 추가. 예: `export { buildTimeFilterSQL as buildTimeFilterWhere }` 등.
  </action>
  <verify>
    <automated>bash -c 'test -f src/lib/time-filters.ts && grep -q "buildTimeFilterSQL" src/lib/time-filters.ts && grep -q "doesTimeBucketMatch" src/lib/time-filters.ts && npm test -- tests/search --run 2>&1 | tail -20'</automated>
  </verify>
  <done>
    - 파일 존재
    - tests/search/time-filter.test.ts GREEN
    - tests/search/time-bucket.test.ts GREEN
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: queries.ts 확장 — getJobsPaginated + getJobsByDistance에 time/bucket 파라미터</name>
  <files>src/lib/db/queries.ts</files>
  <read_first>
    - src/lib/db/queries.ts (getJobsPaginated + getJobsByDistance 현재 구현 — 특히 $queryRaw Prisma.sql composition)
    - .planning/phases/03-db/03-06-SUMMARY.md (PostGIS cursor pagination 패턴)
    - src/lib/time-filters.ts (Task 1)
  </read_first>
  <behavior>
    - `getJobsPaginated(opts: { ...existing, timePreset?, timeBuckets?, radiusKm? })` — additive params
    - `getJobsByDistance(opts: { lat, lng, radiusM, ..., timePreset?, timeBuckets? })` — additive params
    - 기존 호출자는 변경 없이 계속 작동 (optional params)
    - 새 params가 전달되면 buildTimeFilterSQL 결과를 기존 WHERE에 AND로 결합
  </behavior>
  <action>
  실제 queries.ts 파일을 먼저 읽어 현재 WHERE 절이 어떻게 composition되어 있는지 파악한 후 다음 패턴으로 확장:

  ```typescript
  import { buildTimeFilterSQL, type TimePreset, type TimeBucket } from '@/lib/time-filters'

  export type JobFilterOpts = {
    timePreset?: TimePreset
    timeBuckets?: TimeBucket[]
  }

  // Inside getJobsByDistance:
  // existing:
  //   const rows = await prisma.$queryRaw<...>(Prisma.sql`
  //     SELECT ... FROM public.jobs WHERE ST_DWithin(...) AND status='active' ...
  //   `)
  // extend: append timeFilters to the WHERE array

  export async function getJobsByDistance(opts: {
    lat: number
    lng: number
    radiusM: number
    limit?: number
    cursor?: string | null
    timePreset?: TimePreset
    timeBuckets?: TimeBucket[]
  }) {
    const timeClauses = buildTimeFilterSQL({ preset: opts.timePreset, buckets: opts.timeBuckets })
    const timeFilterSql = timeClauses.length > 0
      ? Prisma.sql` AND ${timeClauses.reduce((acc, cur, i) => i === 0 ? cur : Prisma.sql`${acc} AND ${cur}`, Prisma.empty)}`
      : Prisma.empty

    const limit = Math.min(opts.limit ?? 20, 50)
    return prisma.$queryRaw<JobWithDistance[]>(Prisma.sql`
      SELECT
        j.*,
        ST_Distance(j.location, ST_SetSRID(ST_MakePoint(${opts.lng}, ${opts.lat}), 4326)::geography) AS distance_m
      FROM public.jobs j
      WHERE ST_DWithin(
        j.location,
        ST_SetSRID(ST_MakePoint(${opts.lng}, ${opts.lat}), 4326)::geography,
        ${opts.radiusM}
      )
      AND j.status = 'active'
      AND (
        j."workDate"::timestamp + CAST(j."startTime" AS time)
      )::timestamptz > now() - INTERVAL '5 minutes'
      ${timeFilterSql}
      ORDER BY distance_m ASC
      LIMIT ${limit}
    `)
  }
  ```

  **중요 — 실제 queries.ts 형태와 일치:** 위 예시는 일반화된 패턴. 실제 파일을 읽고 LAZY_FILTER_SQL 등의 기존 변수를 재사용할 것. Prisma.empty placeholder 처리에 주의 (빈 fragment가 들어가도 SQL 에러 없어야 함).

  `getJobsPaginated`도 동일 패턴으로 timeClauses 추가 (cursor 기반 WHERE 끝에 AND 결합).

  기존 호출자 (Phase 3 home page.tsx) 는 옵션 파라미터 미전달이므로 변경 없이 작동해야 한다. Phase 3 test suite를 run해서 regression 없음 확인:
  ```
  npm test -- tests/data --run
  ```
  </action>
  <verify>
    <automated>bash -c 'grep -q "timePreset" src/lib/db/queries.ts && grep -q "buildTimeFilterSQL" src/lib/db/queries.ts && npm test -- tests/data tests/search --run 2>&1 | tail -25'</automated>
  </verify>
  <done>
    - queries.ts 확장
    - Phase 3 tests regression 없음
    - tests/search GREEN
  </done>
</task>

<task type="auto">
  <name>Task 3: src/types/kakao.d.ts — ambient Kakao Maps 타입</name>
  <files>src/types/kakao.d.ts</files>
  <read_first>
    - .planning/phases/04-db/04-RESEARCH.md (Kakao Maps autoload=false 패턴)
    - tsconfig.json (include/typeRoots 확인)
  </read_first>
  <behavior>
    - window.kakao에 대한 최소 ambient declaration
    - kakao.maps.LatLng, Map, Marker, InfoWindow, Circle, load 함수 등 Phase 4에서 사용하는 범위만 선언
    - 완전한 타입이 아닌 "workable 최소 셋"
  </behavior>
  <action>
  ```typescript
  // Phase 4 SEARCH-02 D-23/D-24/D-25 — ambient types for Kakao Maps JavaScript SDK
  // Installed via <script> tag injection in src/hooks/use-kakao-maps-sdk.ts
  // Official reference: https://apis.map.kakao.com/web/guide/
  //
  // This is a minimal declaration — only the symbols Phase 4 uses. Extend as needed.

  declare global {
    interface Window {
      kakao: typeof kakao
    }
  }

  declare namespace kakao.maps {
    function load(callback: () => void): void

    class LatLng {
      constructor(lat: number, lng: number)
      getLat(): number
      getLng(): number
    }

    interface MapOptions {
      center: LatLng
      level?: number // zoom
    }

    class Map {
      constructor(container: HTMLElement, options: MapOptions)
      setCenter(latlng: LatLng): void
      getCenter(): LatLng
      setLevel(level: number): void
      getLevel(): number
      getBounds(): LatLngBounds
      relayout(): void
    }

    class LatLngBounds {
      getSouthWest(): LatLng
      getNorthEast(): LatLng
    }

    interface MarkerOptions {
      position: LatLng
      map?: Map
      title?: string
      image?: MarkerImage
    }

    class Marker {
      constructor(options: MarkerOptions)
      setMap(map: Map | null): void
      getPosition(): LatLng
    }

    class MarkerImage {
      constructor(src: string, size: Size, options?: { offset?: Point })
    }

    class Size { constructor(width: number, height: number) }
    class Point { constructor(x: number, y: number) }

    interface CircleOptions {
      center: LatLng
      radius: number // meters
      strokeWeight?: number
      strokeColor?: string
      strokeOpacity?: number
      fillColor?: string
      fillOpacity?: number
    }
    class Circle {
      constructor(options: CircleOptions)
      setMap(map: Map | null): void
      setRadius(radius: number): void
    }

    namespace event {
      function addListener(target: any, type: string, handler: (...args: any[]) => void): void
      function removeListener(target: any, type: string, handler: (...args: any[]) => void): void
    }
  }

  export {}
  ```

  `tsconfig.json`의 `include`에 `src/**/*.d.ts`가 이미 포함되어 있는지 확인. 아니면 `src/types/**/*` 추가.
  </action>
  <verify>
    <automated>bash -c 'test -f src/types/kakao.d.ts && grep -q "namespace kakao.maps" src/types/kakao.d.ts && npx tsc --noEmit 2>&1 | grep "kakao" | head -5 || echo "no kakao type errors"'</automated>
  </verify>
  <done>
    - src/types/kakao.d.ts exists, window.kakao typed
    - TypeScript 컴파일 OK
  </done>
</task>

<task type="auto">
  <name>Task 4: useKakaoMapsSDK hook — lazy SDK loader</name>
  <files>src/hooks/use-kakao-maps-sdk.ts</files>
  <read_first>
    - .planning/phases/04-db/04-RESEARCH.md (Summary #5: autoload=false + kakao.maps.load 패턴)
    - .planning/phases/04-db/04-CONTEXT.md D-24 (키 없을 때 fallback)
  </read_first>
  <behavior>
    - React hook that injects Kakao SDK script tag on mount (idempotent — reuses existing script)
    - Uses autoload=false + kakao.maps.load callback pattern
    - Returns { ready: boolean; error: string | null; hasKey: boolean }
    - If process.env.NEXT_PUBLIC_KAKAO_MAP_KEY missing, returns { ready: false, hasKey: false, error: null } and does NOT inject script
  </behavior>
  <action>
  ```typescript
  'use client'
  import { useEffect, useState } from 'react'

  type State = {
    ready: boolean
    error: string | null
    hasKey: boolean
  }

  const SCRIPT_ID = 'kakao-maps-sdk'

  /**
   * Phase 4 SEARCH-02 D-24/D-25 — Lazy-load Kakao Maps JS SDK.
   *
   * Strategy: inject <script src="...?autoload=false"> on first call (idempotent), then
   * call `kakao.maps.load(callback)` once the script is downloaded. The callback signals
   * ready state.
   *
   * Graceful degradation: if NEXT_PUBLIC_KAKAO_MAP_KEY is missing, return hasKey=false so
   * the toggle button can show a disabled state with tooltip "관리자에게 문의하세요".
   */
  export function useKakaoMapsSDK(): State {
    const [state, setState] = useState<State>({ ready: false, error: null, hasKey: true })

    useEffect(() => {
      const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
      if (!key) {
        setState({ ready: false, error: null, hasKey: false })
        return
      }

      // Already loaded? (dev HMR or multiple consumers)
      if (typeof window !== 'undefined' && window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => setState({ ready: true, error: null, hasKey: true }))
        return
      }

      // Existing script tag (previous mount)
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
      if (script) {
        script.addEventListener('load', onLoad, { once: true })
        script.addEventListener('error', onError, { once: true })
        return () => {
          script?.removeEventListener('load', onLoad)
          script?.removeEventListener('error', onError)
        }
      }

      script = document.createElement('script')
      script.id = SCRIPT_ID
      script.async = true
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`
      script.addEventListener('load', onLoad, { once: true })
      script.addEventListener('error', onError, { once: true })
      document.head.appendChild(script)

      function onLoad() {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(() => setState({ ready: true, error: null, hasKey: true }))
        } else {
          setState({ ready: false, error: 'SDK object missing', hasKey: true })
        }
      }
      function onError() {
        setState({ ready: false, error: 'Failed to load Kakao Maps SDK', hasKey: true })
      }

      return () => {
        script?.removeEventListener('load', onLoad)
        script?.removeEventListener('error', onError)
      }
    }, [])

    return state
  }
  ```
  </action>
  <verify>
    <automated>bash -c 'test -f src/hooks/use-kakao-maps-sdk.ts && grep -q "autoload=false" src/hooks/use-kakao-maps-sdk.ts && grep -q "kakao.maps.load" src/hooks/use-kakao-maps-sdk.ts && grep -q "NEXT_PUBLIC_KAKAO_MAP_KEY" src/hooks/use-kakao-maps-sdk.ts && echo OK'</automated>
  </verify>
  <done>
    - 훅 존재, autoload=false + load 콜백 + hasKey fallback
  </done>
</task>

<task type="auto">
  <name>Task 5: MapView + HomeFilterBar 컴포넌트</name>
  <files>src/components/worker/map-view.tsx, src/components/worker/home-filter-bar.tsx</files>
  <read_first>
    - .planning/phases/04-db/04-UI-SPEC.md (MapView + FilterBar 비주얼 contract, color, spacing)
    - .planning/phases/04-db/04-CONTEXT.md D-25, D-26, D-27, D-28
    - src/hooks/use-kakao-maps-sdk.ts (Task 4)
    - src/types/kakao.d.ts (Task 3)
    - src/lib/time-filters.ts (Task 1)
  </read_first>
  <action>
  **src/components/worker/map-view.tsx:**
  ```typescript
  'use client'
  import { useEffect, useRef, useState } from 'react'
  import { useKakaoMapsSDK } from '@/hooks/use-kakao-maps-sdk'
  import { Alert, AlertDescription } from '@/components/ui/alert'
  import type { JobWithDistance } from '@/lib/db/queries'

  type Props = {
    center: { lat: number; lng: number }
    jobs: JobWithDistance[]
    radiusM: number
    onMarkerClick: (jobId: string) => void
  }

  export function MapView({ center, jobs, radiusM, onMarkerClick }: Props) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<kakao.maps.Map | null>(null)
    const markersRef = useRef<kakao.maps.Marker[]>([])
    const circleRef = useRef<kakao.maps.Circle | null>(null)
    const { ready, error, hasKey } = useKakaoMapsSDK()

    // Initialize map once SDK ready
    useEffect(() => {
      if (!ready || !containerRef.current) return
      if (mapRef.current) return
      const kakao = window.kakao
      const map = new kakao.maps.Map(containerRef.current, {
        center: new kakao.maps.LatLng(center.lat, center.lng),
        level: 5,
      })
      mapRef.current = map
    }, [ready, center.lat, center.lng])

    // Update center + radius circle
    useEffect(() => {
      const map = mapRef.current
      if (!map) return
      const kakao = window.kakao
      map.setCenter(new kakao.maps.LatLng(center.lat, center.lng))
      if (circleRef.current) circleRef.current.setMap(null)
      circleRef.current = new kakao.maps.Circle({
        center: new kakao.maps.LatLng(center.lat, center.lng),
        radius: radiusM,
        strokeWeight: 2,
        strokeColor: '#EA580C',
        strokeOpacity: 0.6,
        fillColor: '#FED7AA',
        fillOpacity: 0.15,
      })
      circleRef.current.setMap(map)
    }, [center.lat, center.lng, radiusM])

    // Update markers when jobs change
    useEffect(() => {
      const map = mapRef.current
      if (!map) return
      const kakao = window.kakao
      markersRef.current.forEach(m => m.setMap(null))
      markersRef.current = jobs.map((job) => {
        const marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(Number(job.lat), Number(job.lng)),
          map,
          title: job.title,
        })
        kakao.maps.event.addListener(marker, 'click', () => onMarkerClick(job.id))
        return marker
      })
      return () => {
        markersRef.current.forEach(m => m.setMap(null))
      }
    }, [jobs, onMarkerClick])

    if (!hasKey) {
      return (
        <Alert>
          <AlertDescription>
            지도 기능을 사용하려면 관리자에게 문의하세요 (NEXT_PUBLIC_KAKAO_MAP_KEY 필요)
          </AlertDescription>
        </Alert>
      )
    }
    if (error) {
      return <Alert><AlertDescription>지도를 불러올 수 없습니다: {error}</AlertDescription></Alert>
    }

    return (
      <div
        ref={containerRef}
        data-testid="kakao-map-container"
        className="h-[60vh] min-h-[400px] w-full rounded-lg overflow-hidden"
      />
    )
  }
  ```

  **src/components/worker/home-filter-bar.tsx:**

  shadcn ToggleGroup을 사용한 필터 UI. Plan 08에서 shadcn 컴포넌트 설치를 진행하므로 여기서는 기본 button + 조건부 styling으로 작성해도 됨. 그러나 UI-SPEC이 shadcn을 lock했으므로 shadcn 설치 필요. 이 태스크에서 `npx shadcn@latest add toggle-group alert` 실행.

  ```bash
  npx shadcn@latest add toggle-group alert
  ```

  그 다음:
  ```typescript
  'use client'
  import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
  import { useRouter, useSearchParams, usePathname } from 'next/navigation'
  import { useTransition } from 'react'
  import type { TimePreset, TimeBucket } from '@/lib/time-filters'

  type Props = {
    currentRadius: number
    currentPreset?: TimePreset
    currentBuckets: TimeBucket[]
    currentView: 'list' | 'map'
    kakaoAvailable: boolean
  }

  export function HomeFilterBar({ currentRadius, currentPreset, currentBuckets, currentView, kakaoAvailable }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const sp = useSearchParams()
    const [isPending, startTransition] = useTransition()

    function updateQuery(mutator: (params: URLSearchParams) => void) {
      const params = new URLSearchParams(sp.toString())
      mutator(params)
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`)
      })
    }

    return (
      <div className="sticky top-0 z-10 bg-background border-b space-y-3 px-4 py-3">
        {/* View toggle */}
        <ToggleGroup type="single" value={currentView} onValueChange={(v) => v && updateQuery((p) => p.set('view', v))}>
          <ToggleGroupItem value="list">리스트</ToggleGroupItem>
          <ToggleGroupItem
            value="map"
            disabled={!kakaoAvailable}
            title={kakaoAvailable ? '지도' : '지도 기능 사용 불가 (관리자에게 문의)'}
          >
            지도
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Distance stepper 1/3/5/10 km */}
        <ToggleGroup type="single" value={String(currentRadius)} onValueChange={(v) => v && updateQuery((p) => p.set('radius', v))}>
          {[1, 3, 5, 10].map(km => (
            <ToggleGroupItem key={km} value={String(km)}>{km}km</ToggleGroupItem>
          ))}
        </ToggleGroup>

        {/* Time preset */}
        <ToggleGroup
          type="single"
          value={currentPreset ?? ''}
          onValueChange={(v) => updateQuery((p) => v ? p.set('preset', v) : p.delete('preset'))}
        >
          <ToggleGroupItem value="today">오늘</ToggleGroupItem>
          <ToggleGroupItem value="tomorrow">내일</ToggleGroupItem>
          <ToggleGroupItem value="this-week">이번주</ToggleGroupItem>
        </ToggleGroup>

        {/* Time buckets (multi-select) */}
        <ToggleGroup
          type="multiple"
          value={currentBuckets}
          onValueChange={(values) => updateQuery((p) => {
            p.delete('buckets')
            for (const v of values) p.append('buckets', v)
          })}
        >
          <ToggleGroupItem value="morning">오전</ToggleGroupItem>
          <ToggleGroupItem value="afternoon">오후</ToggleGroupItem>
          <ToggleGroupItem value="evening">저녁</ToggleGroupItem>
          <ToggleGroupItem value="night">야간</ToggleGroupItem>
        </ToggleGroup>
      </div>
    )
  }
  ```

  **주의:** UI-SPEC은 컴포넌트를 여러 shadcn primitives로 락했다. 일부 추가 primitive (sheet, progress, tooltip, sonner) 는 Plan 08/09에서 설치한다. 이 플랜에서는 toggle-group + alert 2개만 설치하면 충분.
  </action>
  <verify>
    <automated>bash -c 'test -f src/components/worker/map-view.tsx && test -f src/components/worker/home-filter-bar.tsx && test -f src/components/ui/toggle-group.tsx && test -f src/components/ui/alert.tsx && npx tsc --noEmit 2>&1 | grep -E "(map-view|home-filter|toggle-group|alert)" | head -10 || echo "no component errors"'</automated>
  </verify>
  <done>
    - 2 컴포넌트 + shadcn toggle-group + alert 설치
    - MapView가 useKakaoMapsSDK + markers + Circle 사용
    - HomeFilterBar가 URL query param으로 필터 상태 동기화
  </done>
</task>

<task type="auto">
  <name>Task 6: /home 페이지 리팩토링 — 리스트/지도 토글 통합</name>
  <files>src/app/(worker)/home/page.tsx, src/app/(worker)/home/home-client.tsx</files>
  <read_first>
    - src/app/(worker)/home/page.tsx (Phase 3 서버 컴포넌트 구조)
    - src/app/(worker)/home/actions.ts (Phase 3 server actions — 재사용)
    - .planning/phases/04-db/04-UI-SPEC.md (/home 레이아웃)
  </read_first>
  <action>
  현재 `/home/page.tsx`는 Phase 3에서 server-rendered cursor pagination을 보유. Phase 4는 다음과 같이 재구성:

  - `page.tsx` (server component): searchParams (Next 16 async) 파싱 → `getJobsByDistance` 호출 → `<HomeClient initialJobs={...} filters={...} />`에 props 전달
  - `home-client.tsx` (client component): HomeFilterBar + (리스트 또는 MapView) 조건부 렌더

  **page.tsx 예시 (Next.js 16 async params + searchParams 주의):**

  ```typescript
  // src/app/(worker)/home/page.tsx
  import { verifySession } from '@/lib/dal'
  import { getJobsByDistance } from '@/lib/db/queries'
  import type { TimePreset, TimeBucket } from '@/lib/time-filters'
  import { HomeClient } from './home-client'

  type SearchParams = {
    view?: 'list' | 'map'
    radius?: string
    preset?: TimePreset
    buckets?: string | string[]
  }

  export default async function HomePage({
    searchParams,
  }: {
    searchParams: Promise<SearchParams> // Next 16 async searchParams
  }) {
    const params = await searchParams
    const session = await verifySession()
    // TODO: Worker 위치는 session에서 or geolocation 기반. 임시로 서울 중심.
    const center = { lat: 37.5665, lng: 126.9780 }
    const radiusKm = Number(params.radius ?? 3)
    const buckets = Array.isArray(params.buckets)
      ? params.buckets as TimeBucket[]
      : params.buckets ? [params.buckets as TimeBucket] : []
    const preset = params.preset

    const jobs = await getJobsByDistance({
      lat: center.lat,
      lng: center.lng,
      radiusM: radiusKm * 1000,
      limit: 50,
      timePreset: preset,
      timeBuckets: buckets,
    })

    const kakaoAvailable = Boolean(process.env.NEXT_PUBLIC_KAKAO_MAP_KEY)

    return (
      <HomeClient
        initialJobs={jobs}
        center={center}
        radiusKm={radiusKm}
        currentPreset={preset}
        currentBuckets={buckets}
        currentView={params.view ?? 'list'}
        kakaoAvailable={kakaoAvailable}
      />
    )
  }
  ```

  **home-client.tsx:**

  ```typescript
  'use client'
  import { useRouter } from 'next/navigation'
  import { HomeFilterBar } from '@/components/worker/home-filter-bar'
  import { MapView } from '@/components/worker/map-view'
  import type { TimePreset, TimeBucket } from '@/lib/time-filters'
  import type { JobWithDistance } from '@/lib/db/queries'
  // ... import existing Phase 3 JobCard / JobList components

  type Props = {
    initialJobs: JobWithDistance[]
    center: { lat: number; lng: number }
    radiusKm: number
    currentPreset?: TimePreset
    currentBuckets: TimeBucket[]
    currentView: 'list' | 'map'
    kakaoAvailable: boolean
  }

  export function HomeClient({ initialJobs, center, radiusKm, currentPreset, currentBuckets, currentView, kakaoAvailable }: Props) {
    const router = useRouter()

    return (
      <div className="max-w-lg mx-auto">
        <HomeFilterBar
          currentRadius={radiusKm}
          currentPreset={currentPreset}
          currentBuckets={currentBuckets}
          currentView={currentView}
          kakaoAvailable={kakaoAvailable}
        />
        {currentView === 'map' ? (
          <MapView
            center={center}
            jobs={initialJobs}
            radiusM={radiusKm * 1000}
            onMarkerClick={(jobId) => router.push(`/posts/${jobId}`)}
          />
        ) : (
          <div>
            {/* Phase 3 리스트 렌더링 재사용 — 기존 JobCard 리스트 매핑 */}
            {initialJobs.length === 0 && <p className="text-center py-16 text-muted-foreground">해당 조건의 공고가 없습니다</p>}
            {initialJobs.map(job => (
              <div key={job.id}>{/* existing JobCard component */}</div>
            ))}
          </div>
        )}
      </div>
    )
  }
  ```

  **Next.js 16 제약:** searchParams는 Promise로 전달되므로 `await searchParams` 필수. `node_modules/next/dist/docs/01-app/02-guides/async-apis.md`를 읽고 확인.

  **기존 Phase 3 리스트 로직 재사용:** 현재 Phase 3의 `/home/page.tsx`는 JobCard 배열 렌더링을 직접 한다. 그 JSX를 home-client.tsx의 `currentView === 'list'` 분기로 옮기되, 무한 스크롤 (cursor)은 우선 이 플랜에서 보존/제거 결정은 executor가 판단 (cursor + 지도 toggle 공존이 복잡하므로, Phase 4는 list 모드에서도 limit 50 non-cursor로 단순화하고 "더보기" 버튼으로 cursor 재활성화를 Phase 5로 이월하는 것을 권장).
  </action>
  <verify>
    <automated>bash -c 'test -f "src/app/(worker)/home/page.tsx" && test -f "src/app/(worker)/home/home-client.tsx" && grep -q "HomeFilterBar" "src/app/(worker)/home/home-client.tsx" && grep -q "MapView" "src/app/(worker)/home/home-client.tsx" && grep -q "await searchParams" "src/app/(worker)/home/page.tsx" && npx tsc --noEmit 2>&1 | grep "home" | head -10 || echo "no home errors"'</automated>
  </verify>
  <done>
    - page.tsx + home-client.tsx 작성
    - HomeFilterBar + MapView wiring
    - searchParams async 패턴 적용
    - Phase 3 리스트 fallback 렌더링
  </done>
</task>

<task type="auto">
  <name>Task 7: Playwright E2E — map-view.spec.ts 통과 확인</name>
  <files>tests/e2e/map-view.spec.ts (no changes, verification only)</files>
  <read_first>
    - tests/e2e/map-view.spec.ts
    - playwright.config.ts
  </read_first>
  <action>
  `npx playwright test tests/e2e/map-view.spec.ts` 실행.

  키가 있으면 pass, 키가 없으면 test.skip으로 스킵. 어느 쪽이든 test runner exit 0 이어야 한다.

  환경변수 설정:
  ```
  NEXT_PUBLIC_KAKAO_MAP_KEY=<user-provided> npx playwright test tests/e2e/map-view.spec.ts
  ```

  만약 Playwright가 dev server를 자동으로 시작하지 못하면, 별도 터미널에서 `npm run dev` 실행 후 다시 테스트.
  </action>
  <verify>
    <automated>bash -c 'npx playwright test tests/e2e/map-view.spec.ts --reporter=line 2>&1 | tail -20 || echo "playwright run attempted"'</automated>
  </verify>
  <done>
    - Playwright exits 0 (pass or skip)
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Client browser → Kakao Maps SDK (external origin) | SDK is loaded from dapi.kakao.com; data flows: lat/lng → SDK rendering |
| URL query params → getJobsByDistance | Untrusted; Zod/number coercion + buildTimeFilterSQL uses parameterized Prisma.sql |
| Kakao API key in client bundle | NEXT_PUBLIC_ exposes the key to browser; domain allowlist at Kakao Developer Console is the only real protection |

## STRIDE Threat Register

| ID | Category | Component | Disposition | Mitigation |
|----|----------|-----------|-------------|------------|
| T-04-39 | SQL Injection | URL params → getJobsByDistance | mitigate | buildTimeFilterSQL returns Prisma.Sql fragments (parameterized); radius/lat/lng coerced to Number before Prisma.sql template binding |
| T-04-40 | Info Disclosure | NEXT_PUBLIC_KAKAO_MAP_KEY in bundle | mitigate | Domain allowlist at Kakao Console (localhost + production domain only) — documented in Plan 01 Task 9 checkpoint |
| T-04-41 | Tampering | user forging view=map to render Kakao SDK on pages where they shouldn't | accept | Map view is public (/home is visible to unauthenticated too post Phase 3); no privileged rendering |
| T-04-42 | Supply chain | SDK injection via appendChild | mitigate | Pinned to https://dapi.kakao.com/v2/maps/sdk.js (Kakao official CDN, HTTPS); no eval |
| T-04-43 | DoS | Abuse of Kakao's 300k calls/day free tier | accept | Documented in CONTEXT.md D-24; Phase 5 should monitor |
| T-04-44 | XSS | MapView InfoWindow rendering of job.title | mitigate | Current plan uses Marker.title attribute (DOM tooltip, escaped); preview card rendered via React (escaped) not SDK InfoWindow |
</threat_model>

<verification>
- `tests/search` GREEN
- `tests/data` (Phase 3 regression) still GREEN
- Playwright map-view.spec.ts exits 0
- TypeScript compiles for touched files
</verification>

<success_criteria>
- [x] time-filters.ts library
- [x] queries.ts extended with time/bucket filters
- [x] Kakao ambient types
- [x] useKakaoMapsSDK hook
- [x] MapView + HomeFilterBar components
- [x] /home page refactored with list/map toggle
- [x] tests/search GREEN, Phase 3 tests regression 없음
</success_criteria>

<output>
After completion, create `.planning/phases/04-db/04-07-SUMMARY.md` with:
- 컴포넌트 tree (page → client → filter-bar + map-view)
- URL query param schema
- Kakao SDK loading sequence
- Known follow-ups: worker 실제 위치 획득 (geolocation vs manual), cursor pagination 복원 여부 (Phase 5 후보)
</output>
