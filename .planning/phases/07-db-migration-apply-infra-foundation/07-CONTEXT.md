# Phase 7: DB Migration Apply & Infra Foundation - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

v1.0 코드가 실제 Supabase DB/Storage 위에서 동작할 수 있도록 **enablement**만 수행한다:

1. Phase 6까지 작성된 Supabase 마이그레이션을 실 DB에 적용하고 drift 0 확인
2. Admin 계정 부트스트랩(dev 환경 한정) — 후속 admin UAT가 가능한 상태로 만듦
3. `business-reg-docs` 버킷 RLS가 authenticated write + signed read 경로로 실제 동작함을 증명
4. 후속 phase들이 재사용할 **공통 인프라 산출물** 확립: MOCK-LOG.md 표준 템플릿 + `CLOVA_OCR_SECRET` 발급 가이드

**Not in scope:**
- Prod 환경 Admin 프로비저닝 → v1.2 ops 프로세스로 이월
- 실 CLOVA OCR 키를 사용한 실제 OCR 라운드트립 검증 → Phase 8 UAT-04 (MOCK 경로)
- `src/lib/mock-data` import CI 게이트 → Phase 10 LEG-03
- 기능적 UAT 시나리오 실행 → Phase 8

</domain>

<decisions>
## Implementation Decisions

### Admin Seed 실행 방식
- **D-44:** `20260414000005_phase6_admin_seed.sql` 의 `BEGIN/UPDATE/COMMIT` 블록 주석을 해제하고, 이메일을 실제 dev 계정으로 교체한 뒤 git에 커밋하고 `npx tsx scripts/apply-supabase-migrations.ts` 로 적용한다.
  - **Why:** 재현 가능성 + git 이력 보존이 dev 단계에서 운영 간편성보다 우선. `_supabase_migrations` 트래킹 테이블이 재실행을 안전하게 만들어 주므로 commit 후 재실행 중복 위험 없음.
  - **How to apply:** execute 시점에 사용자에게 "어느 dev 계정을 ADMIN으로 승격할지" 1회 확인 후 SQL 파일의 `admin@gignow.kr` placeholder를 그 이메일로 치환하여 커밋. UPDATE 블록은 `public.users` 와 `auth.users.raw_app_meta_data` 둘 다 갱신해야 함(JWT 갱신 위해).
- **D-45:** v1.1에서는 dev 환경 Admin만 승격. Prod Admin 프로비저닝은 v1.2 ops 프로세스로 이월.
  - **Why:** v1.1은 gap-fill 밀스톤이고, prod admin 승격은 보안 고려(rotation, dual-approval 등)가 필요해 별도 정책 phase가 필요하다.
  - **How to apply:** Admin seed 마이그레이션 파일 상단 주석에 "Production ADMIN accounts must be provisioned by an ops engineer, never by this migration"(이미 존재) 유지. `docs/external-keys.md` 또는 Phase 7 SUMMARY에 prod 제외 명시.
- **D-46:** 기존 dev 계정 1개 승격. 신규 `admin@gignow.kr` 계정 생성은 회피.
  - **Why:** 계정 생성 단계를 줄여 seed 적용의 프리컨디션을 단순화.
  - **How to apply:** execute 시점에 사용자가 사용하는 dev 이메일 1건을 입력받아 SQL 에 치환.

### CLOVA_OCR_SECRET 문서화
- **D-47:** `docs/external-keys.md` 를 신규 생성하여 외부 키 발급 가이드를 통합한다. `docs/` 폴더 자체가 아직 없으므로 Phase 7에서 생성.
  - **Why:** `.env.example` 주석은 포인터용으로 남기되, 실제 절차는 장문 문서가 필요. README에 섞으면 README가 비대해지고 향후 Kakao Maps / VAPID / Toss 같은 외부 키 가이드가 추가되면서 정돈된 위치가 필요.
  - **How to apply:** `.env.example` 의 `CLOVA_OCR_SECRET` / `CLOVA_OCR_API_URL` 주석에 `docs/external-keys.md` 상대경로 링크를 추가. `docs/external-keys.md` 의 "CLOVA OCR" 섹션은 5분 내 완료 가능한 단계별 텍스트 체크리스트 형식(1. NCP 콘솔 가입 → 2. CLOVA OCR General 도메인 생성 → 3. APIGW invoke URL 복사 → 4. X-OCR-SECRET 복사 → 5. `.env.local` 2개 변수 설정 → 6. 로컬 검증 1줄).
- **D-48:** 스크린샷은 포함하지 않는다. 텍스트 체크리스트 + NCP 공식 문서 링크로 충분.
  - **Why:** NCP 콘솔 UI 변경 시 스크린샷이 즉시 stale. v1.1은 유지관리 부담 최소화.

### MOCK-LOG 표준
- **D-49:** MOCK-LOG 템플릿은 `.planning/templates/MOCK-LOG.md` 에 둔다. 각 phase는 `.planning/phases/<phase>/MOCK-LOG.md` 로 복제하여 채운다.
  - **Why:** 단일 진실의 소스(템플릿) + phase 맥락별 실제 기록 분리. `.planning/templates/` 는 이 워크플로에서 생성.
- **D-50:** 필수 필드는 4개 고정 — `mocked path` / `reason` / `real-key re-verify step` / `target milestone`. 그 외 컨텍스트는 자유 텍스트로 덧붙인다.
  - **Why:** ROADMAP/REQUIREMENTS 가 이 4필드를 명시하고 있어 정책과 정렬. 단일 개발자 프로젝트에서 date/owner/PR-link 같은 중복 필드는 과잉.
- **D-51:** 밀스톤 루트에 `.planning/MOCK-INDEX.md` 를 두어 모든 phase MOCK-LOG 파일의 링크를 모은다.
  - **Why:** v1.2 재검증 시 "어디에 MOCK 된 것이 몇 건인가" 를 한 화면에서 확인할 수 있어야 하며, `find` 명령 없이 git 이력으로도 추적 가능.
  - **How to apply:** Phase 7에서 빈 인덱스를 생성하고 Phase 6 템플릿 복제 시 첫 항목으로 추가. Phase 8/10은 자기 MOCK-LOG 생성 후 INDEX에 한 줄 추가.
- **D-52:** `.planning/README.md` (없으면 생성)에 "MOCK 정책과 템플릿 사용법" 섹션을 1쪽 분량으로 추가.
  - **Why:** 신규 세션/개발자가 MOCK-LOG 을 처음 작성할 때 템플릿 위치와 4필드 의미를 한 번에 알 수 있게.

### 네트워크 접근 / 실행 전략
- **D-53:** Phase 7 을 **prep** 단계와 **apply** 단계로 명확히 분리한다.
  - **prep (네트워크 불필요):** SQL seed 주석 해제 + `docs/external-keys.md` 작성 + `.planning/templates/MOCK-LOG.md` 생성 + `.planning/MOCK-INDEX.md` 생성 + `.planning/README.md` 정책 섹션 추가 + Phase 6 MOCK-LOG 복제.
  - **apply (네트워크 필수):** `npx tsx scripts/apply-supabase-migrations.ts` 실행 + `npx prisma validate` + `npx prisma migrate status` + `npx prisma generate` + Storage bucket signed URL 왕복 수동 검증 + Admin 로그인 실행.
  - **Why:** STATE.md 가 "Supabase 접근 필요" 를 blocker 로 기록. prep 산출물은 네트워크 무관하게 선행 가능해야 Phase 7 close 가능 시점을 네트워크 확보에만 종속시킬 수 있다.
  - **How to apply:** PLAN.md 에서 두 그룹을 별도 Plan (`07-01-prep`, `07-02-apply`) 으로 분리하거나 동일 plan 내에서 명시적 체크포인트로 구분. Phase 7 close 기준은 **apply 그룹이 성공했을 때**.
- **D-54:** Supabase 접근 불가 상황에서 로컬 postgres 로 migration 적용 MOCK 은 **허용하지 않는다**.
  - **Why:** Success Criteria 1 (`prisma migrate status` on real DB clean) 와 MIG-02 (실제 bucket RLS) 는 실 Supabase 에서만 증명 가능. 로컬 MOCK 은 문제를 숨김.

### 증거 형식
- **D-55:** Phase 7 `VERIFICATION.md` 에 다음 커맨드 출력 원본을 fenced block 으로 첨부:
  - `npx tsx scripts/apply-supabase-migrations.ts`
  - `npx prisma validate`
  - `npx prisma migrate status`
  - `npx prisma generate`
  - `public.users` 행의 role/email + `auth.users.raw_app_meta_data` JSONB 스냅샷 (Admin 1건)
  - `business-reg-docs` signed URL 발급 커맨드 + 200 OK 응답 헤더 + TTL (s) 측정값 — TTL 실측치는 INFRA-02 (Phase 8) 에서도 재참조
  - **Why:** 재검증 가능성 + PR reviewer 심사. 출력에 PII 없음(서비스 롤 키는 절대 포함 금지).
  - **How to apply:** executor 는 커맨드 실행 후 stdout/stderr 전체를 VERIFICATION.md 에 붙여넣기. 서비스 롤 키, JWT, password 등 민감값은 ${{SECRET}} 으로 마스킹.

### Claude's Discretion
- **prisma migrate status** 가 clean 이 아닐 때(drift 감지) 어떻게 복구할지의 세부 절차 — 발견 시점에 판단하되 `/gsd-debug` 로 분기.
- `.planning/README.md` 기존 파일이 있으면 어느 섹션에 추가할지, 없으면 전체 구조 — Claude가 결정(간결 원칙).
- `.planning/MOCK-INDEX.md` 의 정확한 컬럼 포맷(markdown 표 or 리스트) — Claude가 결정하되 "phase / mocked path / reason / target milestone / file 링크" 를 한 행으로 표시.
- Signed URL TTL 측정 커맨드 정확한 형태(curl / supabase-js) — executor 판단.

### Folded Todos
_No pending todos matched this phase — STATE.md 의 Phase 7 kickoff 체크리스트는 이미 본 context 에 흡수됨._

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope & Requirements
- `.planning/ROADMAP.md` §"Phase 7" — goal / success criteria / requirements 매핑
- `.planning/REQUIREMENTS.md` §MIG §INFRA — MIG-01..04 + INFRA-01 + INFRA-03 문구
- `.planning/STATE.md` §"Open TODOs" §"Blockers" — Phase 7 kickoff 항목 + Supabase 접근 blocker
- `.planning/PROJECT.md` — v1.1 Active 스코프와 MOCK 정책

### Existing Migration Assets
- `scripts/apply-supabase-migrations.ts` — direct-prisma 적용 스크립트. `_supabase_migrations` 트래킹 테이블로 재실행 안전.
- `supabase/migrations/20260414000005_phase6_admin_seed.sql` — Admin seed NO-OP 파일. UPDATE 블록 주석 해제가 이 phase의 주요 mutation.
- `supabase/migrations/20260414000001_phase6_business_profile_extension.sql` — Phase 6 schema 확장.
- `supabase/migrations/20260414000002_phase6_storage_business_reg_docs.sql` — Phase 6 storage bucket + RLS.
- `supabase/migrations/20260414000003_phase6_business_profile_indexes.sql` — Phase 6 검색/커서 index.
- `prisma/schema.prisma` — Phase 6 최종 스키마(9 컬럼 추가). migrate status 대상.

### Phase 6 Origin Context (for admin/storage behavior)
- `src/app/(auth)/role-select/actions.ts:30-38` — `auth.users.raw_app_meta_data` 에 role 미러링 패턴(Admin seed 가 복제해야 할 런타임 로직).
- `src/lib/ocr/clova.ts:42-50` — `CLOVA_OCR_SECRET` / `CLOVA_OCR_API_URL` 환경 변수 사용 계약. 문서는 이 두 변수만 다루면 된다.
- `.env.example` §"Phase 6 — Admin backoffice & OCR" — 이미 존재하는 placeholder 2줄. 주석에 docs 링크 추가.

### Milestone-level Records to Update/Create
- `.planning/templates/MOCK-LOG.md` — (생성) 표준 템플릿 4필드.
- `.planning/MOCK-INDEX.md` — (생성) 밀스톤 루트 인덱스.
- `.planning/README.md` — (생성 또는 업데이트) MOCK 정책 및 템플릿 사용법 섹션.
- `docs/external-keys.md` — (생성) CLOVA OCR 5분 발급 가이드.

### v1.0 Audit Reference
- `.planning/milestones/v1.0-MILESTONE-AUDIT.md` §tech_debt.06-admin-backoffice — Phase 7이 해소해야 할 tech debt 항목(D-37/D-38 migration pending).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`scripts/apply-supabase-migrations.ts`** — 이미 `_supabase_migrations` 테이블로 재실행 안전. 새 스크립트 작성 불필요. 실행만 하면 된다.
- **`supabase/migrations/20260414000005_phase6_admin_seed.sql`** — 주석 처리된 BEGIN/UPDATE/COMMIT 블록 + 상세 주석 가이드 이미 포함. 주석 해제 + 이메일 교체만 하면 된다.
- **`.env.example:67-70`** — CLOVA OCR 관련 placeholder 2개 이미 존재. 신규 섹션 추가 불필요.
- **`src/lib/ocr/clova.ts`** — 이미 env 가드(secret/apiUrl 비어있으면 graceful fail) 구현됨. 문서는 변수명만 정확히 지시하면 된다.

### Established Patterns
- **Direct-prisma 전략 (Phase 2 pivot)** — Supabase CLI 미사용. `DIRECT_URL` + `pg` 드라이버 + 자체 트래킹 테이블. Phase 7도 이 패턴 유지.
- **app_metadata role 미러링** — role 변경 시 `public.users.role` 과 `auth.users.raw_app_meta_data.role` 둘 다 갱신해야 JWT 에 반영됨(Phase 6 D-27 + Codex review 수정 `6a392a8`). Admin seed SQL 이 이미 이 패턴을 따름.
- **서비스 롤 키 노출 방지** — 출력/로그/commit 에 `SUPABASE_SERVICE_ROLE_KEY` 포함 금지. VERIFICATION.md 첨부 시 반드시 마스킹.

### Integration Points
- **`.env.example`** — 주석에 `docs/external-keys.md` 링크 한 줄 추가.
- **`.planning/README.md`** — 없으면 생성. MOCK 정책 섹션 추가.
- **`.planning/phases/06-admin-backoffice/MOCK-LOG.md`** — Phase 6 는 현재 MOCK-LOG 파일이 없음. Phase 7에서 템플릿 복제 + Phase 6 deferred 3 시나리오(admin detail signed image / OCR happy / OCR mismatch) 를 초기 항목으로 채워 둔다(Phase 8 UAT-04 가 이 파일을 이어 씀).
- **Phase 7 VERIFICATION.md** — 커맨드 출력 원본 첨부 위치.

</code_context>

<specifics>
## Specific Ideas

- Admin seed 이메일은 execute 단계에서 사용자에게 **1회 질문** 후 SQL 파일에 치환. `admin@gignow.kr` placeholder 를 그대로 commit 하지 않는다.
- Phase 7 `prep` 단계는 네트워크 없이도 끝까지 실행 가능해야 한다. `apply` 단계는 명시적인 "Supabase 네트워크 접근 확보" 체크포인트 뒤에만 실행.
- MOCK-LOG 4필드 표기 예시(Phase 6 deferred 시나리오 1건 초안):
  ```
  | Field | Value |
  |-------|-------|
  | Mocked path | Phase 6 Scenario 7: CLOVA OCR happy-path round-trip |
  | Reason | CLOVA_OCR_SECRET 미발급 — 실 API 호출 불가 |
  | Real-key re-verify step | `CLOVA_OCR_SECRET` / `CLOVA_OCR_API_URL` 설정 후 business-reg-docs 테스트 이미지 업로드 → `/biz/verify` 트리거 → `public.business_profiles.reg_number_ocr_match = true` 확인 |
  | Target milestone | v1.2 |
  ```
- VERIFICATION.md 에 첨부할 TTL 측정은 Phase 8 INFRA-02 에서 재사용되므로 **수치만** 기록(예: `TTL: 3600s`).

</specifics>

<deferred>
## Deferred Ideas

- **Prod Admin 프로비저닝 정책** — dual-approval / key rotation / audit log 설계. → v1.2 ops phase.
- **CLOVA 외 외부 키 스크린샷 가이드** — NCP UI 안정화 후 재검토. → v1.2 또는 후속 신규 개발자 온보딩 시점.
- **MOCK-LOG 자동 검증 스크립트** — 4필드 존재 여부 CI 체크. → v1.2 (필요 시).
- **`.planning/README.md` 전면 개편** — 프로젝트 전반 가이드로 확장. → 별도 문서 phase.

</deferred>

---

*Phase: 07-db-migration-apply-infra-foundation*
*Context gathered: 2026-04-15*
</content>
</invoke>