# Requirements: GigNow (NJob)

**Defined:** 2026-04-10
**Core Value:** 이력서·면접 제로. 탭 하나로 확정, 근무 후 즉시 정산.

## v1 Requirements

v1 = "Timee 모델의 한국 MVP" — Worker가 실제 DB로 탐색·지원·근무·리뷰·정산 확인을 완주하고, Business가 실제 DB로 공고 생성·지원자 관리·리뷰 작성을 완주할 수 있는 상태.

### Authentication (AUTH)

- [x] **AUTH-01**: 사용자는 휴대폰 번호 또는 이메일로 회원가입할 수 있다 (Supabase Auth)
- [x] **AUTH-02**: 사용자는 Worker 역할과 Business 역할 중 하나 또는 둘 다를 선택해 가입할 수 있다
- [x] **AUTH-03**: 사용자는 로그인 후 브라우저 새로고침 시에도 세션이 유지된다
- [x] **AUTH-04**: 사용자는 로그아웃 시 모든 세션 쿠키가 제거된다
- [x] **AUTH-05**: 인증되지 않은 사용자가 보호된 경로에 접근하면 로그인 페이지로 리다이렉트된다 (middleware)
- [x] **AUTH-06**: Worker 전용 경로는 Worker 역할이 없는 사용자를 차단한다
- [x] **AUTH-07**: Business 전용 경로는 Business 역할이 없는 사용자를 차단한다

### Data Layer (DATA)

- [x] **DATA-01**: Prisma 스키마에 User, WorkerProfile, BusinessProfile, Job, Application, Review 모델이 정의되어 있다
- [x] **DATA-02**: PostGIS 확장이 활성화되어 Job의 위치(lat/lng)로 거리 기반 쿼리가 가능하다
- [x] **DATA-03**: Supabase 프로젝트에 초기 마이그레이션이 적용되어 있다
- [x] **DATA-04**: 시드 데이터가 `prisma/seed.ts` 또는 Supabase SQL로 제공되어 로컬/프리뷰에서 빈 DB를 채울 수 있다
- [x] **DATA-05**: `src/lib/mock-data.ts` 의존 경로가 코드베이스에서 0개다 (Phase 5 종료 조건)

### Worker Profile (WORK)

- [x] **WORK-01**: Worker는 이름, 닉네임, 프로필 사진, 소개글을 등록할 수 있다
- [x] **WORK-02**: Worker는 자신의 선호 카테고리(food, retail, logistics 등)를 저장할 수 있다
- [x] **WORK-03**: Worker는 자신의 뱃지 레벨, 평점, 근무 횟수, 완료율을 프로필에서 볼 수 있다
- [x] **WORK-04**: Worker는 본인 계정의 프로필만 수정할 수 있다 (RLS)

### Business Profile (BIZ)

- [x] **BIZ-01**: Business는 상호명, 주소, 카테고리, 로고/이모지, 설명을 등록할 수 있다
- [x] **BIZ-02**: Business는 자신의 평점, 리뷰 수, 완료율을 프로필에서 볼 수 있다
- [x] **BIZ-03**: Business는 본인 계정의 프로필만 수정할 수 있다 (RLS)

### Job Posting (POST)

- [x] **POST-01**: Business는 새 공고(제목, 카테고리, 설명, 시급, 교통비, 근무일, 시간, 인원, 주소, 드레스코드, 준비물)를 작성해 저장할 수 있다
- [x] **POST-02**: Business는 자신이 작성한 공고 목록을 볼 수 있다
- [x] **POST-03**: Business는 공고를 수정하거나 삭제할 수 있다
- [x] **POST-04**: Worker는 로그인 없이(또는 가입 후) 공고 목록을 페이지네이션으로 볼 수 있다
- [x] **POST-05**: Worker는 공고 상세 페이지에서 모든 정보(예상 수입 포함)를 확인할 수 있다
- [x] **POST-06**: 공고는 workDate/startTime이 지나면 자동으로 "만료" 상태로 전환된다

### Application (APPL)

- [x] **APPL-01**: 인증된 Worker는 공고 상세에서 "원탭 지원" 버튼으로 지원을 생성할 수 있다
- [x] **APPL-02**: Worker는 자신의 지원 목록(예정/진행중/완료)을 본다
- [x] **APPL-03**: Business는 자신의 공고 각각에 대한 지원자 목록을 본다
- [x] **APPL-04**: Business는 지원자를 accept/reject할 수 있으며, 해당 상태가 Worker 쪽에 실시간 반영된다 (또는 폴링)
- [x] **APPL-05**: Accept된 지원의 headcount가 공고의 headcount에 도달하면 공고가 자동으로 "마감" 상태로 전환된다

### Check-in / Work (WORK-SHIFT)

- [x] **SHIFT-01**: Accept된 Worker는 근무 시작 시간에 체크인할 수 있다 (현재 mock UI 존재)
- [x] **SHIFT-02**: 체크아웃 시 실근무 시간과 수입이 계산되어 Application에 저장된다
- [x] **SHIFT-03**: 야간 할증(22:00-06:00, 4시간 이상)은 DB 레벨 또는 서버 함수에서 50% 가산된다

### Review (REV)

- [x] **REV-01**: 완료된 Application에 대해 Worker는 Business에 대한 리뷰(별점, 태그, 코멘트)를 작성할 수 있다
- [x] **REV-02**: 완료된 Application에 대해 Business는 Worker에 대한 평가(별점, 태그, 코멘트)를 작성할 수 있다
- [x] **REV-03**: 각 리뷰는 Application당 정확히 1회만 작성 가능하다 (uniqueness)
- [x] **REV-04**: 리뷰 제출 시 대상의 rating/reviewCount가 자동 업데이트된다

### Settlement (SETL)

- [x] **SETL-01**: 완료된 Application은 pending → settled 상태로 전환되어 Worker의 정산 목록에 표시된다 (mock 즉시 정산 시뮬레이션)
- [x] **SETL-02**: Business는 자신의 정산 히스토리(지급 완료/예정)를 볼 수 있다
- [x] **SETL-03**: 총수입, 이번 달 수입 집계가 실제 데이터로 계산되어 표시된다

### Advanced Search (SEARCH)

<!-- Phase 4 scope expansion (discuss-phase 2026-04-10): SEARCH-02 승격 + SEARCH-03 신설 -->

- [x] **SEARCH-02**: Worker는 /home에서 리스트/지도 토글로 공고를 탐색할 수 있고, 카카오맵에 viewport 내 공고 marker가 표시된다 (Phase 4, v2→v1 승격)
- [x] **SEARCH-03**: Worker는 날짜 프리셋(오늘/내일/이번주) + 시간대 버킷(오전/오후/저녁/야간) + 거리 스테퍼(1/3/5/10km)로 공고를 필터할 수 있다 (Phase 4, 신설)

### Notifications (NOTIF) — partial v1

<!-- Phase 4 scope expansion: NOTIF-01 (Web Push only) 부분 승격. 네이티브 FCM/SMS/알림톡은 여전히 v2. -->

- [x] **NOTIF-01**: Web Push 알림 (VAPID + Service Worker)이 Worker에게 수락/거절 이벤트를 전달한다. 네이티브 FCM/SMS/알림톡은 v2 (Phase 4, 부분)

## v2 Requirements

v2 = MVP 검증 후 추가. 로드맵에 포함되지 않음.

### AI Matching (AIMATCH)

- **AIMATCH-01**: Worker의 선호/근무기록 기반 추천 공고 리스트가 home에 표시된다
- **AIMATCH-02**: Business의 공고에 적합한 Worker 추천 리스트가 표시된다
- **AIMATCH-03**: Claude + Gemini 게이트웨이가 비용 효율 모드로 운영에 배포된다
- **AIMATCH-04**: 매칭 근거(reasons)가 사용자에게 한국어로 노출된다

### Payments (PAY)

- **PAY-01**: Toss Payments 웹훅으로 실제 결제 확인을 받는다
- **PAY-02**: 원천징수(3.3%)가 자동 계산되어 Settlement에 반영된다
- **PAY-03**: 국세청 사업자번호 검증 API가 Business 가입 시 호출된다
- **PAY-04**: 정산 실패 시 Business/Worker에게 알림이 전송된다

### Notifications (NOTIF)

<!-- NOTIF-01 (Web Push only)은 Phase 4 scope 확장으로 v1 partial 승격됨 — v1 Notifications 섹션 참조 -->
<!-- 여기 남은 항목은 v2 범위만 포함 -->

- **NOTIF-01 (remaining v2 parts)**: SMS/카카오 알림톡/네이티브 FCM 채널 (Phase 4는 Web Push만 담당)
- **NOTIF-02**: 근무 1시간 전 리마인더가 자동 발송된다
- **NOTIF-03**: 긴급 공고는 위치 기반 near-workers 쿼리로 즉시 매칭 알림 발송

### Advanced Search (SEARCH)

<!-- SEARCH-02는 Phase 4로 승격됨 — v1 Advanced Search 섹션 참조 -->

- **SEARCH-01**: Worker는 카테고리, 거리, 시급, 근무일 기준 고급 필터 검색이 가능하다 (여전히 v2 — Phase 4는 SEARCH-02/03만 담당)

### Chat (CHAT)

- **CHAT-01**: Accept된 Application에 대해 Worker/Business 간 1:1 채팅방이 생성된다
- **CHAT-02**: 채팅은 텍스트/이미지/위치를 지원한다

## Out of Scope

| Feature | Reason |
|---------|--------|
| 지원→대기→면접→채용 플로우 | Timee 모델의 핵심 차별화 원칙 위배. 기존 한국 알바 플랫폼 패턴 금지 (memory 원칙) |
| Multi-session / MFA / 조직 관리 | Supabase Auth 기본 기능만 사용. Clerk급 엔터프라이즈 기능 불필요 |
| 한국어 외 다국어 지원 | 국내 시장 집중, 지역화 우선 |
| 위치 기반 광고 플랫폼 (규모 인센티브, 위치 프로모션) | Timee의 광고 엔진은 제품-시장 맞물림 검증 후 고려 |
| 동영상 공고 업로드 | 스토리지/대역폭 비용, 정적 사진만으로 충분 |
| 자체 동기식 채팅 (WebSocket) | Supabase Realtime으로 충분, 전용 채팅 인프라 불필요 |
| 모바일 네이티브 앱 | PWA/웹 우선, 네이티브는 v1 이후 |

## Phase 6 Operational Decisions (D-27..D-43)

Phase 6 = Admin Backoffice 운영 결정사항 (17개). 이 결정들은 v1 요구사항(위)과는 별도로, Phase 6 구현 범위를 정의하는 설계 결정이다. 자동화 검증 증거는 `06-VERIFICATION.md`를 참조.

| Decision | Description | Automated Evidence | Status |
|----------|-------------|-------------------|--------|
| D-27 | /admin blocks non-ADMIN; redirect to `/login?error=admin_required` | `tests/auth/admin-routing.test.ts` ✓ GREEN | Code Complete |
| D-28 | `getDefaultPathForRole('ADMIN')==='/admin'`; ADMIN login → /admin | `tests/auth/admin-routing.test.ts` ✓ GREEN | Code Complete |
| D-29 | AdminSidebar separate component (not BizSidebar reuse) | grep `import.*BizSidebar` src/app/admin → exit 1 ✓ | Code Complete |
| D-30 | Valid regNumber format → `verified=true` auto; stored digit-only | `tests/business/verify-regnumber.test.ts` (SKIP — DB) | Code Complete (Human UAT Sc.5) |
| D-31 | createJob with `businessRegImageUrl IS NULL` → redirect sentinel `/biz/verify` | `tests/jobs/create-job-image-gate.test.ts` (SKIP — DB) | Code Complete (Human UAT Sc.6) |
| D-32 | `runBizLicenseOcr` parses CLOVA response; extracts digit-only 10-char candidates | `tests/ocr/clova-parser.test.ts` ✓ GREEN (7 tests) | Code Complete |
| D-33 | OCR timeout/error/mismatch → image saved, no user-facing failure, `regNumberOcrMismatched=true` | OCR unit GREEN; integration SKIP — DB | Partial (Human UAT Sc.7/8) |
| D-34 | checkOut writes commissionRate + commissionAmount + netEarnings snapshot | `tests/settlements/commission-snapshot.test.ts` (SKIP — DB) | Code Complete |
| D-35 | Null commissionRate falls back to `PLATFORM_DEFAULT_COMMISSION_RATE` env | Same test file | Code Complete |
| D-36 | `commissionRate` Decimal(5,2), nullable; override supersedes env; Zod rejects >100 | Same test file + Zod schema | Code Complete |
| D-37 | BusinessProfile 6 new columns + Application 3 new columns (all nullable) | `prisma/schema.prisma` verified; migration on disk | Migration Pending |
| D-38 | `business-reg-docs` bucket private + 4 RLS policies | Migration on disk (20260414000002) | Migration Pending |
| D-39 | `verified` flag = regNumber format OK only (not image-uploaded) | Code reading: gate checks `businessRegImageUrl`, not `verified` | Code Complete |
| D-40 | Admin list searches name/reg/owner/phone via ILIKE; dash-normalized reg | `tests/admin/business-list.test.ts` (SKIP — DB) | Code Complete (Human UAT Sc.2) |
| D-41 | verified filter: all/yes/no | Same test | Code Complete (Human UAT Sc.2) |
| D-42 | sort by createdAt asc/desc and commissionRate asc/desc | Same test | Code Complete (Human UAT Sc.2) |
| D-43 | Cursor pagination 20/page, stable order | Same test | Code Complete (Human UAT Sc.2) |

**DB-gated tests skip because:** `db.lkntomgdhfvxzvnzmlct.supabase.co` unreachable from dev machine. Apply `npx tsx scripts/apply-supabase-migrations.ts` to enable live DB tests.

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 2 | Completed 2026-04-10 (`fb06dfd`) |
| AUTH-02 | Phase 2 | Completed 2026-04-10 (`fb06dfd`) |
| AUTH-03 | Phase 2 | Completed 2026-04-10 (`fb06dfd`) |
| AUTH-04 | Phase 2 | Completed 2026-04-10 (`fb06dfd`) |
| AUTH-05 | Phase 2 | Completed 2026-04-10 (`fb06dfd`) |
| AUTH-06 | Phase 2 | Completed 2026-04-10 (`fb06dfd`) |
| AUTH-07 | Phase 2 | Completed 2026-04-10 (`fb06dfd`) |
| DATA-01 | Phase 2 | Completed 2026-04-10 (`fb06dfd`) |
| DATA-02 | Phase 2 | Completed 2026-04-10 (`fb06dfd`) |
| DATA-03 | Phase 2 | Completed 2026-04-10 (`fb06dfd`) |
| DATA-04 | Phase 2 | Completed 2026-04-10 (`fb06dfd`) |
| DATA-05 | Phase 5 | Completed 2026-04-11 (`6e94385`) |
| WORK-01 | Phase 3 | Completed 2026-04-10 (`087874e`) |
| WORK-02 | Phase 3 | Completed 2026-04-10 (`087874e`) |
| WORK-03 | Phase 3 | Completed 2026-04-10 (`087874e`) |
| WORK-04 | Phase 3 | Completed 2026-04-10 (`087874e`) |
| BIZ-01 | Phase 3 | Completed 2026-04-10 (`087874e`) |
| BIZ-02 | Phase 3 | Completed 2026-04-10 (`087874e`) |
| BIZ-03 | Phase 3 | Completed 2026-04-10 (`087874e`) |
| POST-01 | Phase 3 | Completed 2026-04-10 (`087874e`) |
| POST-02 | Phase 3 | Completed 2026-04-10 (`087874e`) |
| POST-03 | Phase 3 | Completed 2026-04-10 (`087874e`) |
| POST-04 | Phase 3 | Completed 2026-04-10 (`087874e`) |
| POST-05 | Phase 3 | Completed 2026-04-10 (`087874e`) |
| POST-06 | Phase 3 | Completed 2026-04-10 (`087874e`) |
| APPL-01 | Phase 4 | Completed 2026-04-11 (`864e4e5` + Plan 04-10) |
| APPL-02 | Phase 4 | Completed 2026-04-11 (`864e4e5` + Plan 04-10) |
| APPL-03 | Phase 4 | Completed 2026-04-11 (`864e4e5` + Plan 04-10) |
| APPL-04 | Phase 4 | Completed 2026-04-11 (`864e4e5` + Plan 04-10) |
| APPL-05 | Phase 4 | Completed 2026-04-11 (`864e4e5` + Plan 04-10) |
| SHIFT-01 | Phase 4 | Completed 2026-04-11 (`864e4e5` + Plan 04-10) |
| SHIFT-02 | Phase 4 | Completed 2026-04-11 (`864e4e5` + Plan 04-10) |
| SHIFT-03 | Phase 4 | Completed 2026-04-11 (`864e4e5` + Plan 04-10) |
| SEARCH-02 | Phase 4 | Completed 2026-04-11 (`864e4e5` + Plan 04-10, scope expansion v2→v1) |
| SEARCH-03 | Phase 4 | Completed 2026-04-11 (`864e4e5` + Plan 04-10, scope expansion new) |
| NOTIF-01 (partial) | Phase 4 | Completed 2026-04-11 (`864e4e5` + Plan 04-10, Web Push only; SMS/알림톡/FCM still v2) |
| REV-01 | Phase 5 | Completed 2026-04-11 (`bd822a1`) |
| REV-02 | Phase 5 | Completed 2026-04-11 (`5f52e40`) |
| REV-03 | Phase 5 | Completed 2026-04-11 (`bd822a1` + `5f52e40`) |
| REV-04 | Phase 5 | Completed 2026-04-11 (`bd822a1` + `5f52e40`) |
| SETL-01 | Phase 5 | Completed 2026-04-11 (`c23abf3`) |
| SETL-02 | Phase 5 | Completed 2026-04-11 (`b4165ae` + `fa8a3fb`) |
| SETL-03 | Phase 5 | Completed 2026-04-11 (`b4165ae` + `fa8a3fb`) |

**Validated (Phase 1, retroactive — PROJECT.md):**

| Capability | Phase | Status |
|------------|-------|--------|
| Worker 탐색·지원·체크인·리뷰 목업 루프 | Phase 1 | Completed 2026-04-10 (`55790d1`) |
| Business 공고 생성·지원자 관리·지원자 리뷰 목업 루프 | Phase 1 | Completed 2026-04-10 (`55790d1`) |
| 양방향 ReviewForm 공용 컴포넌트 (worker↔biz) | Phase 1 | Completed 2026-04-10 (`55790d1`) |
| Timee 스타일 UI 언어 (모바일 퍼스트 Worker, 데스크톱 Biz) | Phase 1 | Completed 2026-04-10 (`55790d1`) |

| D-27 | Phase 6 | Code Complete 2026-04-13 (`4cc274c`) |
| D-28 | Phase 6 | Code Complete 2026-04-13 (`4cc274c`) |
| D-29 | Phase 6 | Code Complete 2026-04-13 (`4cc274c`) |
| D-30 | Phase 6 | Code Complete 2026-04-13 — Human UAT Sc.5 pending |
| D-31 | Phase 6 | Code Complete 2026-04-13 — Human UAT Sc.6 pending |
| D-32 | Phase 6 | Code Complete 2026-04-13 (`4cc274c`) |
| D-33 | Phase 6 | Code Complete 2026-04-13 — Human UAT Sc.7/8 deferred |
| D-34 | Phase 6 | Code Complete 2026-04-13 (`c5ca5cf`) |
| D-35 | Phase 6 | Code Complete 2026-04-13 (`c5ca5cf`) |
| D-36 | Phase 6 | Code Complete 2026-04-13 (`c5ca5cf`) |
| D-37 | Phase 6 | Migration on disk — apply pending |
| D-38 | Phase 6 | Migration on disk — apply pending |
| D-39 | Phase 6 | Code Complete 2026-04-13 (`55b3fc3`) |
| D-40 | Phase 6 | Code Complete 2026-04-13 — Human UAT Sc.2 pending |
| D-41 | Phase 6 | Code Complete 2026-04-13 — Human UAT Sc.2 pending |
| D-42 | Phase 6 | Code Complete 2026-04-13 — Human UAT Sc.2 pending |
| D-43 | Phase 6 | Code Complete 2026-04-13 — Human UAT Sc.2 pending |

**Coverage:**
- v1 requirements: **43** total (AUTH 7 + DATA 5 + WORK 4 + BIZ 3 + POST 6 + APPL 5 + SHIFT 3 + REV 4 + SETL 3 + SEARCH 2 + NOTIF 1 partial)
- Phase 6 operational decisions: **17** (D-27..D-43)
- Mapped to phases: 43/43 v1 (100%) ✓ + 17/17 Phase 6 decisions
- Completed: **43/43 v1 ✓ (Phase 5 code complete 2026-04-11)** + **17/17 Phase 6 decisions code complete 2026-04-13**
- Unmapped: 0

> Note: Phase 4 discuss-phase (2026-04-10) scope expansion added SEARCH-02 (v2→v1 승격), SEARCH-03 (신설), NOTIF-01 (Web Push partial v1). Previous count was 40 → now 43. Traceability table is authoritative.
> Phase 5 (2026-04-11) completed REV-01..04, SETL-01..03, DATA-05 — all remaining Phase 5 requirements satisfied. Human-UAT (3 scenarios) deferred by user request.
> Phase 6 (2026-04-13) completed D-27..D-43 at code level. DB migrations pending (Supabase unreachable). Human-UAT 5 scenarios pending, 3 deferred.

---
*Requirements defined: 2026-04-10*
*Last updated: 2026-04-13 — Phase 6 operational decisions D-27..D-43 added (17 decisions, code complete)*
