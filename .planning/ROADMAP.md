# Roadmap: GigNow (NJob)

**Core Value:** 이력서·면접 제로. 탭 하나로 확정, 근무 후 즉시 정산.
**Created:** 2026-04-10
**Granularity:** standard (5 phases)
**Coverage:** 40/40 v1 requirements mapped

---

## Phases

- [x] **Phase 1: 목업 UI 파운데이션** — Mock-data로 Worker·Business 양쪽 루프 E2E 완성 (완료 2026-04-10, commit `55790d1`)
- [ ] **Phase 2: Supabase·Prisma·Auth 기반** — 실 DB 연결과 이중 역할 인증 기반 완성
- [ ] **Phase 3: 프로필·공고 DB 연결** — Worker/Business 프로필과 공고 CRUD를 실 DB로 이관
- [ ] **Phase 4: 지원·근무 라이프사이클 DB 연결** — 원탭 지원부터 체크인·체크아웃까지 실 DB 위에서 완주
- [ ] **Phase 5: 리뷰·정산·목업 제거** — 양방향 리뷰와 정산을 실 데이터로 구동하고 mock-data.ts 완전 제거

---

## Phase Details

### Phase 1: 목업 UI 파운데이션
**Goal**: Mock-data 기반으로 Worker·Business 양쪽의 Timee 스타일 핵심 루프를 E2E로 체험할 수 있다
**Status**: Completed 2026-04-10 (commit `55790d1`)
**Depends on**: Nothing (first phase)
**Requirements**: *(Validated — PROJECT.md 기준)*
  - Worker 탐색·지원·체크인·리뷰 목업 루프
  - Business 공고 생성·지원자 관리·지원자 리뷰 목업 루프
  - 양방향 ReviewForm 공용 컴포넌트 (worker↔biz)
  - Timee 스타일 UI 언어 (모바일 퍼스트 Worker, 데스크톱 Biz)
**Success Criteria** (what is TRUE — already validated):
  1. Worker가 홈에서 공고 목록을 보고 상세로 진입해 "원탭 지원"까지 클릭 하나로 도달할 수 있다
  2. Business가 공고를 새로 작성하고 지원자 목록을 확인해 accept/reject 액션을 누를 수 있다
  3. Worker와 Business 양쪽이 동일한 ReviewForm 컴포넌트로 별점·태그·코멘트를 제출할 수 있다
  4. Worker는 모바일 탭바, Business는 데스크톱 사이드바로 각자 맞는 네비게이션을 경험한다
**Plans**: N/A — retroactively documented, no replanning
**UI hint**: yes

---

### Phase 2: Supabase·Prisma·Auth 기반
**Goal**: Worker/Business가 실제 계정으로 가입·로그인해 세션이 유지되고, 앱이 Supabase DB 위에서 동작할 준비가 된다
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07
**Success Criteria** (what must be TRUE):
  1. 새 사용자가 이메일 또는 휴대폰으로 회원가입해 Worker·Business 역할을 선택하고 Supabase에 계정이 생성된다
  2. 로그인한 사용자는 브라우저 새로고침 이후에도 세션이 유지되고, 로그아웃하면 모든 세션 쿠키가 사라진다
  3. 비로그인 사용자가 보호 경로에 접근하면 로그인 페이지로, Worker 경로에 Business-only 사용자가 접근하면 차단된다
  4. 로컬 Prisma migrate와 Supabase 프로젝트 양쪽에 User/WorkerProfile/BusinessProfile/Job/Application/Review 스키마가 적용되어 있고 PostGIS 확장이 활성화되어 있다
  5. `prisma/seed.ts` 또는 Supabase SQL 시드로 빈 DB를 현실적인 테스트 데이터로 채울 수 있다
**Plans**: TBD

---

### Phase 3: 프로필·공고 DB 연결
**Goal**: Worker/Business가 자기 프로필을 실제로 저장·수정하고, Business가 작성한 공고가 실 DB에서 CRUD로 동작한다
**Depends on**: Phase 2
**Requirements**: WORK-01, WORK-02, WORK-03, WORK-04, BIZ-01, BIZ-02, BIZ-03, POST-01, POST-02, POST-03, POST-04, POST-05, POST-06
**Success Criteria** (what must be TRUE):
  1. Worker가 자기 프로필(이름, 닉네임, 사진, 소개글, 선호 카테고리)을 저장하고 다시 열어도 동일 값이 DB에서 복구된다
  2. Worker는 자기 프로필의 뱃지 레벨·평점·근무 횟수·완료율을 실데이터 기반으로 확인하고, 다른 사용자 프로필은 수정할 수 없다 (RLS)
  3. Business가 상호명·주소·카테고리·로고·설명을 저장하고 평점·리뷰 수·완료율을 실데이터로 확인할 수 있다
  4. Business가 새 공고(시급·교통비·인원·주소·드레스코드·준비물 포함)를 작성·수정·삭제하고 자기 공고 목록을 본다
  5. Worker가 공고 목록을 페이지네이션으로 보고 상세에서 예상 수입까지 확인하며, workDate가 지난 공고는 자동으로 "만료"로 표시된다
**Plans**: TBD
**UI hint**: yes

---

### Phase 4: 지원·근무 라이프사이클 DB 연결
**Goal**: Worker가 실 DB로 원탭 지원·수락·체크인·체크아웃까지 완주하고, Business는 지원자 상태를 실시간으로 관리한다
**Depends on**: Phase 3
**Requirements**: APPL-01, APPL-02, APPL-03, APPL-04, APPL-05, SHIFT-01, SHIFT-02, SHIFT-03
**Success Criteria** (what must be TRUE):
  1. 인증된 Worker가 공고 상세에서 "원탭 지원" 버튼 한 번으로 지원을 생성하고, 자기 지원 목록(예정/진행중/완료)에 즉시 반영된다
  2. Business가 공고별 지원자 목록을 보고 accept/reject하면 Worker 화면에 상태가 (실시간 또는 폴링으로) 반영된다
  3. Accept된 지원 수가 공고의 headcount에 도달하면 공고가 자동으로 "마감" 상태로 전환된다
  4. Accept된 Worker가 근무 시작 시간에 체크인하고 체크아웃하면 실근무 시간과 수입이 계산되어 Application에 저장된다
  5. 22:00–06:00 야간 시간대에 4시간 이상 근무한 경우 야간 할증 50%가 DB 또는 서버 함수에서 자동 가산되어 수입에 반영된다
**Plans**: TBD

---

### Phase 5: 리뷰·정산·목업 제거
**Goal**: 완료된 근무에 대한 양방향 리뷰와 정산이 실 데이터로 구동되고, `src/lib/mock-data.ts` 의존이 코드베이스에서 완전히 사라진다
**Depends on**: Phase 4
**Requirements**: REV-01, REV-02, REV-03, REV-04, SETL-01, SETL-02, SETL-03, DATA-05
**Success Criteria** (what must be TRUE):
  1. 완료된 Application에 대해 Worker↔Business 양방향 리뷰(별점·태그·코멘트)가 각각 Application당 정확히 1회만 작성되고, 제출 즉시 대상의 rating/reviewCount가 자동 업데이트된다
  2. 근무 완료 시 Application이 pending → settled로 전환되어 Worker 정산 목록에 표시되고, 총수입·이번 달 수입이 실 데이터로 집계된다
  3. Business가 자기 정산 히스토리(지급 완료/예정)를 실 데이터로 확인할 수 있다
  4. `src/lib/mock-data.ts` 파일이 삭제되고 코드베이스 전체에서 해당 경로를 import하는 파일이 0개다 (grep으로 검증)
  5. "탐색 → 지원 → 근무 → 리뷰 → 정산 확인" 풀 루프가 실 Supabase DB 왕복으로도 1분 이내에 완주된다
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. 목업 UI 파운데이션 | N/A | Completed | 2026-04-10 |
| 2. Supabase·Prisma·Auth 기반 | 0/? | Not started | - |
| 3. 프로필·공고 DB 연결 | 0/? | Not started | - |
| 4. 지원·근무 라이프사이클 DB 연결 | 0/? | Not started | - |
| 5. 리뷰·정산·목업 제거 | 0/? | Not started | - |

## Coverage Summary

- **Total v1 requirements:** 40 (AUTH 7 + DATA 5 + WORK 4 + BIZ 3 + POST 6 + APPL 5 + SHIFT 3 + REV 4 + SETL 3)
- **Mapped to phases:** 40/40 (100%)
- **Orphaned:** 0
- **Validated (Phase 1, retroactive):** 4 capability statements from PROJECT.md

> Note: REQUIREMENTS.md header previously recorded "39 total"; actual count is 40. Traceability table below is authoritative.

## Out of Scope (do not plan)

- AI 매칭 고도화 (AIMATCH-01..04) — v2
- Toss Payments 실결제·원천징수 (PAY-01..04) — v2
- Push/SMS/카카오 알림톡 (NOTIF-01..03) — v2
- 고급 검색·카카오맵 (SEARCH-01..02) — v2
- 1:1 채팅 (CHAT-01..02) — v2

---
*Roadmap created: 2026-04-10 by /gsd-new-project (brownfield — Phase 1 retroactive)*
