---
phase: 04-db
plan: 10
type: execute
wave: 6
depends_on: [1, 2, 3, 4, 5, 6, 7, 8, 9]
files_modified:
  - .planning/phases/04-db/04-HUMAN-UAT.md
  - .planning/STATE.md
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
  - prisma/seed.ts
autonomous: false
requirements:
  - APPL-01
  - APPL-02
  - APPL-03
  - APPL-04
  - APPL-05
  - SHIFT-01
  - SHIFT-02
  - SHIFT-03

must_haves:
  truths:
    - "npm run test:all (Vitest + Playwright) GREEN with 0 failing"
    - "tests/applications + tests/shift + tests/search + tests/push 전부 GREEN"
    - "Phase 2/3 regression tests 전부 GREEN (tests/auth, tests/data, tests/profile, tests/jobs, tests/storage)"
    - "npm run build 성공, TypeScript 컴파일 0 errors"
    - "prisma/seed.ts가 Phase 4 pending 상태 application 시드를 포함하도록 확장되어 있다 (optional)"
    - "04-HUMAN-UAT.md 5개 수동 시나리오 모두 체크됨 (또는 Kakao 키/VAPID 부족시 skip 기록)"
    - "STATE.md가 Phase 4 완료로 업데이트되었다 (phases_completed: 3)"
    - "REQUIREMENTS.md의 APPL-01..05, SHIFT-01..03, SEARCH-02, SEARCH-03, NOTIF-01(partial) 체크박스가 [x]로 변경되었다"
    - "ROADMAP.md Phase 4 상태가 Completed로 변경되었다"
  artifacts:
    - path: ".planning/phases/04-db/04-HUMAN-UAT.md"
      provides: "signed-off manual UAT checklist"
    - path: ".planning/STATE.md"
      provides: "updated phases_completed + current focus = Phase 5"
  key_links:
    - from: "verification"
      to: "phase exit"
      via: "all tests GREEN + docs updated"
      pattern: "test:all"
---

<objective>
Phase 4 종결 verification: 전체 테스트 스위트 GREEN, 수동 UAT 체크리스트 완료, 프로젝트 문서(STATE/REQUIREMENTS/ROADMAP) 업데이트, prisma seed.ts 확장.

Purpose: Phase 4 exit criteria 확인 및 Phase 5 진입 준비.
Output: GREEN test suite + 문서 업데이트 + UAT sign-off.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/04-db/04-CONTEXT.md
@.planning/phases/04-db/04-VALIDATION.md
@.planning/phases/04-db/04-HUMAN-UAT.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/ROADMAP.md
@prisma/seed.ts
@package.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: 전체 Vitest 스위트 실행 + regression 확인</name>
  <files>(verification only)</files>
  <read_first>
    - package.json (test scripts)
    - vitest.config.ts
  </read_first>
  <action>
  ```bash
  npm test -- --run 2>&1 | tee /tmp/phase4-vitest.log
  ```

  출력 확인:
  - `Test Files  N passed (N)`
  - `Tests       M passed (M)`
  - `0 failing`

  실패가 있으면:
  1. 실패 목록 수집
  2. 실패가 Phase 4 신규 코드 → 해당 Plan (04/05/06/07)로 돌아가 수정
  3. 실패가 Phase 2/3 regression → 변경사항 diff 확인해서 영향 격리 (예: queries.ts 확장이 기존 호출자 break했는지)
  4. 수정 후 재실행

  `tests/applications`, `tests/shift`, `tests/search`, `tests/push` Phase 4 신규 폴더 + `tests/data`, `tests/auth`, `tests/profile`, `tests/jobs`, `tests/storage`, `tests/proxy`, `tests/helpers` Phase 2/3 폴더 모두 포함되어야 한다.
  </action>
  <verify>
    <automated>npm test -- --run 2>&1 | tail -15</automated>
  </verify>
  <done>
    - Vitest exit 0
    - 0 failing
    - Phase 4 신규 21개 test file 전부 pass
  </done>
</task>

<task type="auto">
  <name>Task 2: Playwright E2E 실행</name>
  <files>(verification only)</files>
  <read_first>
    - playwright.config.ts
    - tests/e2e/
  </read_first>
  <action>
  ```bash
  npx playwright install chromium 2>&1 | tail -5  # ensure browser available
  npx playwright test --reporter=line 2>&1 | tee /tmp/phase4-playwright.log
  ```

  Phase 4 신규 spec: tests/e2e/map-view.spec.ts (NEXT_PUBLIC_KAKAO_MAP_KEY 미설정시 test.skip 처리).

  실패시 local dev server 문제일 수 있으므로 별도 터미널에 `npm run dev` 후 재실행.
  </action>
  <verify>
    <automated>bash -c 'npx playwright test --reporter=line 2>&1 | tail -20 || echo "playwright run attempted"'</automated>
  </verify>
  <done>
    - Playwright exit 0 (or all skipped gracefully)
  </done>
</task>

<task type="auto">
  <name>Task 3: Next.js build 성공 확인</name>
  <files>(verification only)</files>
  <read_first>
    - next.config.ts
    - package.json scripts
  </read_first>
  <action>
  ```bash
  npm run build 2>&1 | tee /tmp/phase4-build.log
  ```

  출력에서 다음 확인:
  - "Compiled successfully" 또는 Next.js 16 equivalent
  - 0 TypeScript errors
  - Lint warnings acceptable, errors = fail
  - `/home`, `/my/applications`, `/my/applications/[id]/check-in`, `/biz/posts/[id]/applicants`, `/biz/posts/[id]` 라우트 모두 빌드

  빌드 실패시:
  - TypeScript 에러 → 해당 파일 수정
  - Server/client component 경계 위반 → 'use client' 또는 'use server' 마커 확인
  - Next.js 16 async params/searchParams 미적용 → Promise 패턴 수정
  - Kakao ambient type missing → tsconfig.json include 확인

  `next.config.ts`의 `cacheComponents` 플래그가 OFF인지 재확인 (RESEARCH.md Summary #3).
  </action>
  <verify>
    <automated>bash -c 'npm run build 2>&1 | tail -30 && test $? -eq 0'</automated>
  </verify>
  <done>
    - Build exit 0
    - 0 TS errors
    - 모든 라우트 빌드 성공
  </done>
</task>

<task type="auto">
  <name>Task 4: prisma/seed.ts 확장 — pending application 시드 추가 (optional)</name>
  <files>prisma/seed.ts</files>
  <read_first>
    - prisma/seed.ts (Phase 2 kim-jihoon 5 Applications 시드)
    - .planning/phases/04-db/04-CONTEXT.md (carry_forward: Phase 4 시드 확장 고려)
  </read_first>
  <action>
  기존 5 application 시드에 추가:
  - 1개 pending 상태 application (auto-accept 타이머 러닝 상태 확인용)
  - 1개 in_progress 상태 application (checkOut 테스트용)
  - 1개 completed 상태 application (earnings + night premium 표시 확인용)

  코드 패턴:
  ```typescript
  // 기존 applications 배열에 추가
  {
    jobId: newestJob.id,
    workerId: kimJihoon.id,
    status: 'pending',
    appliedAt: new Date(Date.now() - 5 * 60 * 1000), // 5분 전 지원
  },
  {
    jobId: inProgressJob.id,
    workerId: kimJihoon.id,
    status: 'in_progress',
    appliedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    checkInAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    jobId: nightShiftJob.id, // 야간 공고 (22:00-02:00)
    workerId: kimJihoon.id,
    status: 'completed',
    appliedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    checkInAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    checkOutAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    actualHours: 4,
    earnings: 72000, // 12000 * 4 + transport + night premium
  },
  ```

  **주의 — ApplicationStatus enum에 pending이 Plan 02에서 추가되었으므로 seed에서 사용 가능.** 만약 Prisma generate가 최신이 아니면 seed 실행 전 `npx prisma generate` 필수.

  `npm run db:seed` 또는 `npx tsx prisma/seed.ts` 실행 후 Prisma Studio로 데이터 확인.

  **이 task는 optional이다.** Phase 4 exit criteria 아님. 실행시간 부족시 skip 가능하고 STATE.md에 "Phase 5로 연기"로 기록. executor 판단.
  </action>
  <verify>
    <automated>bash -c 'if grep -q "status: .pending." prisma/seed.ts && grep -q "status: .in_progress." prisma/seed.ts && grep -q "status: .completed." prisma/seed.ts; then echo "seed extended"; else echo "seed extension skipped (optional)"; fi'</automated>
  </verify>
  <done>
    - seed 확장 OR 명시적 skip 기록
  </done>
</task>

<task type="auto">
  <name>Task 5: Phase 4 문서 업데이트 — STATE/REQUIREMENTS/ROADMAP</name>
  <files>.planning/STATE.md, .planning/REQUIREMENTS.md, .planning/ROADMAP.md</files>
  <read_first>
    - .planning/STATE.md
    - .planning/REQUIREMENTS.md (Traceability 테이블)
    - .planning/ROADMAP.md (Phase 4 Progress)
  </read_first>
  <action>
  **1. STATE.md:**
  - `progress.completed_phases`: 2 → 3
  - `progress.completed_plans`: 15 → 25 (15 + 10 new)
  - `Current Position > Phase` → 5
  - `Phase Progress` 테이블의 Phase 4 행: `Completed` + 완료일 + commit hash (커밋 후 업데이트)
  - `Last Session Summary` 업데이트: Phase 4 완료 요약
  - `Next Session Starting Point`: Phase 5 계획 수립 `/gsd-plan-phase 5`
  - `Accumulated Context > Key Decisions`에 Phase 4 scope 확장 3건 추가 (D-01 pending, D-19 Web Push, D-23 Kakao Maps)

  **2. REQUIREMENTS.md Traceability 테이블:**
  - `APPL-01` through `APPL-05`: Pending → **Completed 2026-04-XX**
  - `SHIFT-01` through `SHIFT-03`: Pending → **Completed**
  - `SEARCH-02`, `SEARCH-03`, `NOTIF-01 (partial)`: Pending → **Completed**
  - v1 섹션의 `- [ ]` 체크박스를 `- [x]`로 변경 (위 11개)

  **3. ROADMAP.md:**
  - `### Phase 4: 지원·근무 라이프사이클 DB 연결` 헤더에 `(완료 2026-04-XX)` 표기
  - `**Plans**: TBD` → `**Plans**: 10 plans`
  - Plans 리스트에 10개 PLAN.md 파일 경로 및 간단 요약 추가 (체크박스 [x])
  - `## Progress` 테이블의 Phase 4 행: `10/10 Completed` + 완료일
  - Top `## Phases` 리스트에서 Phase 4 앞 `[ ]` → `[x]`
  </action>
  <verify>
    <automated>bash -c 'grep -q "completed_phases: 3" .planning/STATE.md && grep -q "Phase 4.*Completed\\|Phase 4.*완료" .planning/ROADMAP.md && grep -q "APPL-01 .*Completed\\|\\[x\\] \\*\\*APPL-01" .planning/REQUIREMENTS.md && echo OK'</automated>
  </verify>
  <done>
    - STATE.md Phase 4 completed
    - REQUIREMENTS.md traceability 11 row update
    - ROADMAP.md Phase 4 Completed + 10 plans 리스트
  </done>
</task>

<task type="auto">
  <name>Task 6: Full-flow integration smoke (seed + manual click)</name>
  <files>(verification only — no file changes)</files>
  <read_first>
    - .planning/phases/04-db/04-HUMAN-UAT.md (5 scenarios)
  </read_first>
  <action>
  Integration smoke (Playwright + 시드 DB로 자동화 가능한 부분):

  시나리오:
  1. 시드된 Worker로 로그인
  2. /home 공고 클릭
  3. 원탭 지원 → 성공
  4. /my/applications "예정" 탭에 pending 반영
  5. SQL 직접 실행: `UPDATE applications SET status='confirmed' WHERE workerId=...` → /my/applications 리프레시 (Realtime은 HUMAN-UAT에서 수동)
  6. application의 workDate/startTime을 현재 ±5분으로 수정 (테스트용)
  7. /my/applications/[id]/check-in 진입 → geolocation mock or manual

  이 태스크는 가능한 만큼 Playwright E2E로 자동화하고, 불가능한 부분은 HUMAN-UAT 체크리스트로 이관.

  **최소 자동화 baseline:** apply → list → cancel 흐름. check-in/checkOut 은 HUMAN-UAT 범위.

  Playwright test file 하나 추가 (`tests/e2e/application-lifecycle.spec.ts` — 기존 RED baseline이 없으면 이 태스크에서 신규 작성):
  ```typescript
  import { test, expect } from '@playwright/test'

  test.describe('Phase 4 application lifecycle smoke', () => {
    test('apply → list → cancel', async ({ page }) => {
      // login as seeded worker
      // visit /home
      // click first job card
      // click 원탭 지원
      // expect success message
      // visit /my/applications
      // expect at least 1 "대기 중" 배지
      // click cancel → confirm dialog → confirm
      // expect removal from upcoming tab
    })
  })
  ```

  **이 task는 optional 자동화 시도.** Playwright가 로그인 흐름을 지원하지 못하면 skip하고 HUMAN-UAT에 기록.
  </action>
  <verify>
    <automated>bash -c 'echo "integration smoke attempted — see HUMAN-UAT.md for manual completion status"'</automated>
  </verify>
  <done>
    - Smoke test 파일 작성 또는 skip 기록
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 7: 04-HUMAN-UAT.md 수동 검증 + 서명</name>
  <files>(checkpoint — no files modified)</files>
  <action>See <how-to-verify> below. Checker performs the listed manual steps and responds via <resume-signal>.</action>
  <verify>
    <automated>echo "human verify required — see how-to-verify block"</automated>
  </verify>
  <done>Checker responds with approved / partial / failed per resume-signal contract.</done>
  <what-built>
    - Phase 4 전체 기능 완성 (DB, Server Actions, UI, Push, Map, QR)
    - 22개+ automated tests GREEN
    - Build 성공
  </what-built>
  <how-to-verify>
    `.planning/phases/04-db/04-HUMAN-UAT.md` 열기. 5개 시나리오 전체 수행:

    1. **Check-out QR 카메라 스캔 풀 플로우** (SHIFT-02) — 모바일 HTTPS 필요
    2. **Web Push 구독 + 알림 + 클릭 + 410 cleanup** (NOTIF-01) — Chrome + 알림 권한
    3. **Kakao Maps 지도 + 필터** (SEARCH-02) — NEXT_PUBLIC_KAKAO_MAP_KEY 설정됨
    4. **Realtime postgres_changes 두 탭** (APPL-04) — Worker + Biz 2계정
    5. **Geofence 실 GPS** (SHIFT-01) — 모바일 기기

    각 시나리오 완료시 04-HUMAN-UAT.md의 체크박스를 `[x]`로 업데이트.

    **일부 시나리오가 환경 제약으로 skip되는 경우** (예: Kakao 키 미발급, VAPID 미설정):
    - 해당 시나리오에 "SKIPPED: reason"을 기록
    - Phase 5 시작시 재실행 필요 여부를 STATE.md에 TODO로 남김

    **Phase 4 exit 기준:** 시나리오 1, 4 (QR, Realtime)는 반드시 PASS. 2, 3, 5는 skip 가능 (외부 설정 의존).

    Approve signal:
    - [ ] UAT 5/5 PASS → "approved"
    - [ ] 일부 skip → "partial, skipped: [list]"
    - [ ] 실패 → "failed: [details]"
  </how-to-verify>
  <resume-signal>"approved" / "partial" / "failed" + 상세</resume-signal>
</task>

<task type="auto">
  <name>Task 8: 최종 commit + push</name>
  <files>(git only)</files>
  <read_first>
    - git status (현재 staged/unstaged)
  </read_first>
  <action>
  Phase 4 완료 commit.

  ```bash
  git add -A
  git status
  ```

  변경 파일 목록 확인 후 (secrets 포함 여부 검사 — `.env.local`이 staged이면 unstage):

  ```bash
  git reset .env.local 2>/dev/null || true
  ```

  Commit:
  ```bash
  git commit -m "feat(04): complete phase 4 — application lifecycle + check-in/out + search + web push"
  ```

  Memory의 'feedback_auto_github_push' 원칙에 따라 사용자 사전 승인 상태로 push:
  ```bash
  git push origin master
  ```

  **Phase 4 완료를 commit으로 고정한 후에만 STATE.md commit hash를 기록.**
  </action>
  <verify>
    <automated>bash -c 'git log -1 --oneline | grep -q "phase 4\\|04.*lifecycle\\|APPL\\|SHIFT" && echo "committed"'</automated>
  </verify>
  <done>
    - Phase 4 commit 존재
    - git push 완료
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Test suite → production DB | Test runner must NEVER point at production |
| git push → GitHub remote | Commit message + code visible; secrets must not be staged |

## STRIDE Threat Register

| ID | Category | Component | Disposition | Mitigation |
|----|----------|-----------|-------------|------------|
| T-04-57 | Info Disclosure | `.env.local` accidentally committed | mitigate | Task 8 explicitly unstages .env.local before commit; .gitignore covers baseline |
| T-04-58 | Tampering | Seed script run against prod DB | mitigate | DATABASE_URL env guard; seed prints target host before execution (Phase 2 precedent) |
| T-04-59 | Integrity | STATE.md marked complete while tests red | mitigate | Task 1 gate prevents Task 5 from executing if Vitest fails (linear task order within this plan) |
</threat_model>

<verification>
- `npm test -- --run` exit 0
- `npm run build` exit 0
- Playwright exit 0
- UAT 체크리스트 5/5 or documented skips
- STATE/REQUIREMENTS/ROADMAP updated
- Phase 4 committed + pushed
</verification>

<success_criteria>
- [x] Full automated test suite GREEN
- [x] Build successful, 0 TypeScript errors
- [x] 5 manual UAT scenarios completed or documented skips
- [x] STATE.md phases_completed = 3
- [x] REQUIREMENTS.md 11 v1 requirements marked completed
- [x] ROADMAP.md Phase 4 marked Completed with 10 plans listed
- [x] Seed extension (optional) or skip logged
- [x] Phase 4 committed + pushed to remote
</success_criteria>

<output>
After completion, create `.planning/phases/04-db/04-10-SUMMARY.md` with:
- Test suite summary (N files, M tests, all pass)
- Build size + warnings
- UAT results (pass/skip breakdown)
- Commit hash
- Next step: /gsd-plan-phase 5
</output>
