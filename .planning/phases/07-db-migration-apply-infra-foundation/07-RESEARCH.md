# Phase 7: DB Migration Apply & Infra Foundation — Research

**Researched:** 2026-04-15
**Domain:** Prisma 7 migration CLI, Supabase Storage RLS, Supabase Auth JWT semantics, MOCK-LOG convention design
**Confidence:** HIGH (core Prisma/Supabase mechanics verified via Context7 + official docs + codebase inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-44:** `20260414000005_phase6_admin_seed.sql` 의 BEGIN/UPDATE/COMMIT 블록 주석 해제 + 이메일 실제 dev 계정으로 교체 후 커밋 → `npx tsx scripts/apply-supabase-migrations.ts`로 적용.
- **D-45:** v1.1 dev 환경 Admin만 승격. Prod Admin 프로비저닝 → v1.2.
- **D-46:** 기존 dev 계정 1개 승격. 신규 `admin@gignow.kr` 계정 생성 금지.
- **D-47:** `docs/external-keys.md` 신규 생성 (docs/ 폴더도 Phase 7에서 신설). `.env.example` 주석에 상대경로 링크 추가.
- **D-48:** 스크린샷 포함 금지. 텍스트 체크리스트 + NCP 공식 문서 링크만.
- **D-49:** MOCK-LOG 템플릿 `.planning/templates/MOCK-LOG.md` 위치. 각 phase는 `.planning/phases/<phase>/MOCK-LOG.md`로 복제.
- **D-50:** 4필드 고정 — `mocked path` / `reason` / `real-key re-verify step` / `target milestone`.
- **D-51:** `.planning/MOCK-INDEX.md` 신규 생성. 모든 phase MOCK-LOG 링크를 1개 파일에 집계.
- **D-52:** `.planning/README.md` (없으면 생성) — MOCK 정책 + 템플릿 사용법 섹션 추가.
- **D-53:** Phase 7 → **prep** (네트워크 불필요) / **apply** (Supabase 네트워크 필수) 두 단계 명시적 분리.
- **D-54:** 로컬 postgres로 migration 적용 MOCK 금지. 실 Supabase 필수.
- **D-55:** VERIFICATION.md에 커맨드 출력 원본 fenced block 첨부. 민감값 `${{SECRET}}` 마스킹.

### Claude's Discretion

- `prisma migrate status` drift 감지 시 복구 세부 절차 — 발견 시점에 판단, `/gsd-debug`로 분기.
- `.planning/README.md` 기존 파일 없으면 전체 구조 결정 (간결 원칙).
- `.planning/MOCK-INDEX.md` 컬럼 포맷 (phase / mocked path / reason / target milestone / file 링크 한 행).
- Signed URL TTL 측정 커맨드 형태 (curl / supabase-js) — executor 판단.

### Deferred Ideas (OUT OF SCOPE)

- Prod Admin 프로비저닝 정책 (dual-approval / key rotation / audit log) → v1.2 ops phase.
- CLOVA 외 외부 키 스크린샷 가이드 → v1.2.
- MOCK-LOG 자동 검증 스크립트 (CI 체크) → v1.2.
- `.planning/README.md` 전면 개편 → 별도 문서 phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MIG-01 | Phase 6 마이그레이션 000001-000005를 Supabase에 적용하고 schema drift 0건 증명 | `apply-supabase-migrations.ts` 작동 방식 + `_supabase_migrations` 추적 테이블 검증 |
| MIG-02 | `business-reg-docs` bucket RLS authenticated write + signed read 경로 실 동작 검증 | Storage RLS 정책 코드 리뷰 + signed URL 왕복 검증 절차 |
| MIG-03 | 시드된 Admin 계정으로 `/admin` 대시보드 로그인 성공 | JWT app_metadata 미러링 패턴 + re-login 요구사항 확인 |
| MIG-04 | `prisma validate` + `prisma migrate status` pending/missing 0건 + `prisma generate` 성공 | Prisma 7 migrate status 두 테이블 구분 + 예상 drift 상황 파악 |
| INFRA-01 | CLOVA_OCR_SECRET 프로비저닝 가이드 5분 완료 가능하도록 문서화 | CLOVA OCR NCP 콘솔 워크플로 + env 변수 2개 계약 확인 |
| INFRA-03 | MOCK-LOG.md 템플릿 4필드 확립 | MOCK 정책 설계 원칙 + 경량 컨벤션 검토 |
</phase_requirements>

---

## Summary

Phase 7은 코드 작성이 아닌 **인프라 enablement** phase다. 세 가지 도메인이 교차한다:

**첫째, DB 마이그레이션 적용.** `apply-supabase-migrations.ts`는 `supabase/migrations/` 내 22개 `.sql` 파일을 `_supabase_migrations` 커스텀 테이블로 추적한다. 반면 `npx prisma migrate status`는 완전히 다른 테이블(`_prisma_migrations`)과 완전히 다른 폴더(`prisma/migrations/`)를 본다. 이 두 체계는 설계상 분리되어 있으며, `prisma migrate status`가 clean 상태를 보고하려면 Prisma 체계 쪽에서 Phase 2 이후 추가된 스키마 변경사항(`public.business_profiles`, `public.applications` 신규 컬럼 등)이 Prisma의 눈에 drift 없이 보여야 한다. 이를 위해 apply 완료 후 `prisma db push --accept-data-loss` 없이 `prisma migrate status`가 어떤 출력을 내는지 파악해야 하며, 이는 **apply 단계에서 처음으로 확인 가능**하다.

**둘째, Storage RLS 왕복 검증.** `business-reg-docs` bucket은 private이며 RLS 4정책이 이미 마이그레이션 파일에 정의되어 있다. 검증은 실제 Supabase 세션으로 업로드 시도 후 admin 세션으로 signed URL을 발급하고 curl로 200 OK를 확인하는 흐름이다. TTL 3600s는 코드베이스에 이미 고정되어 있다.

**셋째, Admin seed의 JWT 갱신 요구사항.** `UPDATE auth.users SET raw_app_meta_data = ...`는 데이터를 DB에만 쓴다. 기존 세션 JWT는 즉시 무효화되지 않는다. JWT는 다음 refresh 사이클(기본 1시간) 또는 로그아웃 후 재로그인 시에만 새 claim을 반영한다. 따라서 Admin seed 적용 후 **반드시 로그아웃 → 재로그인** 절차가 필요하며, seed SQL 파일의 기존 주석이 이를 이미 명시하고 있다.

**Primary recommendation:** prep 단계를 먼저 완료하여 네트워크 없이 커밋 가능한 산출물을 모두 만들고, apply 단계는 Supabase 접속 확보 후 단일 실행 세션에서 순서대로 처리한다. drift 발생 시 즉시 `/gsd-debug`로 분기한다.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| SQL 마이그레이션 적용 | Database / Storage | — | `apply-supabase-migrations.ts`가 `DIRECT_URL`로 Supabase PostgreSQL에 직접 DDL 실행 |
| Prisma schema 검증 및 클라이언트 생성 | API / Backend (build-time) | — | `prisma validate` / `generate`는 코드 생성 레이어. 런타임 쿼리 타입 영향 |
| `business-reg-docs` Storage RLS | Database / Storage | — | Supabase Storage RLS 정책이 bucket-level에서 적용. `auth.uid()` 기반 |
| signed URL 발급 | API / Backend | Database / Storage | Server-side에서 service_role 또는 user 세션으로 Supabase Storage API 호출 |
| Admin JWT claim 갱신 | Frontend Server (SSR) | Database / Storage | JWT는 Supabase Auth 레이어가 발급. DB UPDATE 후 client-side re-login으로 claim 반영 |
| MOCK-LOG 인프라 | — (planning artifact) | — | 코드 레이어 없음. `.planning/` 폴더 내 markdown 파일만 |
| CLOVA_OCR_SECRET 문서화 | — (docs artifact) | — | `docs/external-keys.md` 정적 문서. 런타임 코드 없음 |

---

## Standard Stack

### Core (이미 존재 — 버전 변경 금지)

| Library | Version (actual) | Purpose | Why Standard |
|---------|-----------------|---------|--------------|
| prisma | 7.5.0 | Schema 검증, 클라이언트 생성, migrate status | 이미 설치됨. `npx prisma validate/generate/migrate status` |
| tsx | 4.21.0 | TypeScript 스크립트 실행 | `npx tsx scripts/apply-supabase-migrations.ts` |
| pg | ^8.20.0 | `DIRECT_URL`로 Supabase 직접 연결 | apply-supabase-migrations.ts 내 `Client` |
| @supabase/supabase-js | (existing) | Storage signed URL 발급 + Admin auth API | `createSignedBusinessRegUrl`, `admin.auth.admin.updateUserById` |
| dotenv | 17.3.1 | 환경변수 로딩 | prisma.config.ts + apply 스크립트 |

**Version verification:** [VERIFIED: local `npx prisma --version` output — prisma 7.5.0 installed]
npm registry에는 7.7.0이 최신이나, 프로젝트 package.json pin이 7.5.0이므로 변경 금지.

### Supporting (Phase 7에서 새로 생성하는 파일들)

| Artifact | Location | Purpose | Format |
|----------|----------|---------|--------|
| MOCK-LOG template | `.planning/templates/MOCK-LOG.md` | 4필드 표준 양식 | Markdown 표 |
| MOCK-INDEX | `.planning/MOCK-INDEX.md` | 전체 phase MOCK-LOG 링크 집계 | Markdown 표 |
| planning README | `.planning/README.md` | MOCK 정책 + 템플릿 사용법 | Markdown |
| external-keys guide | `docs/external-keys.md` | CLOVA OCR 5분 발급 가이드 | Markdown 체크리스트 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 기존 `apply-supabase-migrations.ts` | Supabase CLI `db push` | CLI는 Docker + MCP-linked 계정 필요 — Phase 2에서 이미 기각. 재검토 금지 |
| 기존 `apply-supabase-migrations.ts` | Prisma `migrate deploy` | `migrate deploy`는 `prisma/migrations/` 폴더 기준 — `supabase/migrations/` 파일들을 처리 못함 |
| 로그아웃 재로그인 (JWT 갱신) | `admin.auth.admin.updateUserById` + 자동 refresh | `updateUserById`로 `app_metadata` 변경해도 현재 JWT는 즉시 무효화되지 않음 — 반드시 re-login 필요 |

---

## Architecture Patterns

### System Architecture Diagram

```
                          [PREP STAGE — network-free]
                                    │
              ┌─────────────────────┼────────────────────────────┐
              │                     │                            │
   SQL seed uncomment        docs/ create               .planning/ artifacts
   + email replace      external-keys.md              templates/ MOCK-LOG.md
   → git commit                                        MOCK-INDEX.md
                                                       README.md
                                                       phases/06/MOCK-LOG.md
              └─────────────────────┼────────────────────────────┘
                                    │
                         [CHECK: Supabase network?]
                                    │ YES
                          [APPLY STAGE — network required]
                                    │
               ┌────────────────────┼─────────────────────────┐
               │                    │                          │
  npx tsx scripts/          npx prisma validate          npx prisma generate
  apply-supabase-migrations  npx prisma migrate status
  .ts                             │
               │                  │ clean? → PASS
               │                  │ drift?  → /gsd-debug
               │
  _supabase_migrations table      │
  tracks 22 .sql files            │
               │
  [Admin seed verification]       [Storage RLS verification]
  public.users.role = ADMIN       authenticated upload → path
  auth.users.app_metadata.role    service_role createSignedUrl
  → LOGOUT + RE-LOGIN →           → curl signed URL → 200 OK
  JWT carries ADMIN claim         → TTL measured (3600s default)
               │
  VERIFICATION.md ← fenced block outputs (no secrets)
```

### Recommended Project Structure (Phase 7 신규 생성 파일)

```
.planning/
├── README.md                          # 신규: MOCK 정책 + 템플릿 사용법
├── MOCK-INDEX.md                      # 신규: 전체 phase MOCK-LOG 링크
├── templates/
│   └── MOCK-LOG.md                    # 신규: 4필드 표준 템플릿
└── phases/
    ├── 06-admin-backoffice/
    │   └── MOCK-LOG.md                # 신규: Phase 6 deferred 3 시나리오 기록
    └── 07-db-migration-apply-infra-foundation/
        └── VERIFICATION.md            # 신규: 커맨드 출력 원본 첨부

docs/
└── external-keys.md                   # 신규: CLOVA OCR 5분 발급 가이드 (docs/ 폴더도 신설)

supabase/migrations/
└── 20260414000005_phase6_admin_seed.sql  # 수정: UPDATE 블록 주석 해제 + 이메일 교체
```

### Pattern 1: Two-Table Migration Strategy (기존 패턴 유지)

**What:** `supabase/migrations/` 폴더를 `_supabase_migrations` 커스텀 테이블로 추적. Prisma의 `_prisma_migrations` 테이블과 완전히 별개.

**When to use:** `apply-supabase-migrations.ts` 실행 시 항상 이 방식.

**Critical distinction:**
```
_supabase_migrations  ← apply-supabase-migrations.ts가 관리
                        filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ
                        추적 대상: supabase/migrations/*.sql (22개)

_prisma_migrations    ← npx prisma migrate status가 확인
                        추적 대상: prisma/migrations/ (현재 1개: 20260410000000_init_phase2)
```

**Why this matters for Phase 7:**
`prisma migrate status`는 `prisma/migrations/`에 migration 파일이 1개뿐이지만 실제 DB에는 더 많은 컬럼이 있다는 사실을 비교한다. Phase 6 컬럼들은 `supabase/migrations/`로 적용되었으므로 `_prisma_migrations` 기준으로는 Prisma가 schema diff를 감지할 수 있다.

**Expected outcome for `prisma migrate status`:**
Prisma 4.3.0+에서 `migrate status`는 exit code 1을 다음 경우 반환한다:
- `_prisma_migrations` 테이블 없음 (Supabase에 Prisma migrate를 한 번도 실행 안 했다면 이 상태)
- Migration 파일이 DB에 미적용
- Local/DB 이력 diverged
- Failed migration 존재

[VERIFIED: Context7 /websites/prisma_io — migrate status docs]

**Resolution approach if drift detected:**
Drift 발생 시 플래너가 처방할 수 없고 실행 시점에 판단 필요 → D-53에 따라 `/gsd-debug` 분기 (Claude's Discretion). 일반적 해결 방법은 `prisma migrate resolve --applied <migration_name>`으로 이미 적용된 것을 표시하거나, `prisma migrate baseline` 패턴을 쓰는 것이지만, 이 프로젝트의 경우 Phase 2 pivot 이력 때문에 실 출력을 보기 전까지 정확한 처방을 예측할 수 없다.

### Pattern 2: Admin Role Seeding via SQL (기존 패턴 복제)

**What:** `UPDATE public.users SET role = 'ADMIN'` + `UPDATE auth.users SET raw_app_meta_data = ...` 동시 실행. `src/app/(auth)/role-select/actions.ts`가 런타임에 사용하는 패턴과 동일.

**Critical JWT semantics:**
```sql
-- SQL UPDATE로 DB는 즉시 변경됨
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
                     || jsonb_build_object('role', 'ADMIN')
WHERE email = '...';

-- 그러나 기존 세션 JWT는 즉시 무효화되지 않음!
-- Supabase JWT 기본 만료: 1시간 (access token)
-- 새 role claim은 다음에만 반영됨:
--   1. 자연 만료 후 자동 refresh (최대 1시간 지연)
--   2. 로그아웃 → 재로그인 (즉시 반영)
-- → 반드시 re-login 절차가 VERIFICATION.md 에 기록되어야 함
```

[VERIFIED: Supabase auth discussion — "app_metadata will not be reflected using auth.jwt() until the user's JWT is refreshed"]
[VERIFIED: admin_seed.sql 파일 기존 주석 — "the promoted user MUST log out and log back in"]

**Role mirroring확인:**
```typescript
// src/app/(auth)/role-select/actions.ts:37-38 — runtime 패턴 (이미 검증됨)
await admin.auth.admin.updateUserById(session.id, {
  app_metadata: { role: parsed.data },
})
```
SQL seed의 `raw_app_meta_data` jsonb UPDATE는 이 Supabase Admin SDK 방식과 동일한 결과를 DB 레이어에서 직접 낸다. 중간자 없이 SQL만으로 동일 효과 가능.

### Pattern 3: Storage RLS Round-Trip Verification

**What:** Private bucket 업로드 → signed URL 발급 → curl 검증.

**RLS 정책 확인 (20260414000002 마이그레이션에서 검증):**
```sql
-- 소유자 INSERT: auth.uid()::text = (storage.foldername(name))[1]
-- 소유자 SELECT: 동일
-- Admin SELECT: EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
-- 경로 규칙: {userId}/{businessId}.{ext}
```

**Signed URL 발급 패턴:**
```typescript
// Source: src/lib/supabase/storage-biz-reg.ts (이미 존재)
const { data, error } = await supabase.storage
  .from('business-reg-docs')
  .createSignedUrl(path, 3600) // TTL: 3600s = 1시간 (D-38 코드베이스 고정값)

// TTL 실측: VERIFICATION.md에 "TTL: 3600s (confirmed)" 기록
```

[VERIFIED: Context7 /supabase/supabase-js — createSignedUrl expiresIn 파라미터]
[VERIFIED: 코드베이스 src/lib/supabase/storage-biz-reg.ts:ttlSeconds = 3600]

**curl 검증 명령 (비대화형 증거):**
```bash
# 1. supabase-js로 signed URL 발급 (npx tsx 스크립트 또는 Supabase Dashboard SQL Editor)
# 2. curl로 200 OK 확인
curl -I "$SIGNED_URL" 2>&1
# 예상 응답: HTTP/2 200, Content-Type: image/jpeg (or image/png, application/pdf)
# TTL 측정: expiresIn URL 파라미터의 exp claim 파싱, 또는 그냥 3600s로 기록
```

### Pattern 4: MOCK-LOG Convention (신규 설계)

**What:** 외부 키 없이 완료 불가한 시나리오를 MOCK 경로로 검증한 후, 실 키 확보 시 재검증 절차를 4필드로 기록.

**Template structure (D-50 기준):**
```markdown
| Field | Value |
|-------|-------|
| Mocked path | [시나리오 이름 + 무엇을 mock했는지] |
| Reason | [외부 의존성이 없어 mock한 이유] |
| Real-key re-verify step | [실 키 확보 후 실행할 구체적 명령/단계] |
| Target milestone | [v1.2 또는 v2] |
```

**Ecosystem precedent:** Next.js/Prisma 생태계에는 "feature-flag-style deferral tracking" 표준 컨벤션이 없다. 유사한 패턴으로는 `TODO(milestone)` 코드 주석, GitHub Issues 라벨, ADR(Architecture Decision Records)이 있으나 이 프로젝트는 단일 개발자 + `.planning/` 중심 워크플로이므로 D-49/50/51 결정대로 markdown 기반 커스텀 컨벤션이 최적이다. [ASSUMED — ecosystem survey 결과, 동등한 공식 표준 없음 확인]

### Anti-Patterns to Avoid

- **로컬 postgres로 MOCK 적용:** D-54 명시 금지. `prisma migrate status` output이 실 Supabase와 다른 상태를 보고하게 되어 성공 증거가 무효화됨.
- **`getPublicUrl` 사용:** `business-reg-docs` bucket은 private. `createSignedUrl`만 사용. (마이그레이션 파일 주석에도 명시)
- **서비스 롤 키 VERIFICATION.md 포함:** D-55 명시 금지. `${{SECRET}}`으로 마스킹.
- **Admin seed를 NO-OP 상태로 커밋 후 apply:** `_supabase_migrations` 테이블이 이 파일을 "already applied"로 기록하면 나중에 UPDATE 블록을 해제해도 apply 스크립트가 건너뜀. 반드시 **주석 해제 + 이메일 교체 → 커밋 → apply** 순서를 지켜야 함. (seed SQL 파일 기존 주석에도 경고 있음)
- **`prisma db push` 사용:** Supabase 내장 extension drift 감지와 충돌 발생. Phase 2 pivot에서 이미 기각됨.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQL 마이그레이션 추적 | 직접 applied 파일 목록 관리 | `scripts/apply-supabase-migrations.ts` (이미 존재) | `_supabase_migrations` PRIMARY KEY로 재실행 안전 보장됨 |
| Storage signed URL | 직접 JWT 서명 | `supabase.storage.createSignedUrl()` | Supabase Storage API가 경로 검증 + RLS + 서명 처리. 직접 구현은 보안 위험 |
| Admin role 갱신 | 직접 JWT 발급 | `auth.users.raw_app_meta_data` UPDATE (SQL) | Supabase Auth가 다음 refresh 시 자동으로 JWT에 반영 |

---

## Runtime State Inventory

> Phase 7은 마이그레이션 적용 phase이므로 이 섹션을 포함한다.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `_supabase_migrations` 테이블 — 22개 `.sql` 파일 중 이미 적용된 것과 미적용(Phase 6 파일 4개: 000001..000005)이 섞임. 실제 적용 여부는 Supabase 접속 후에만 확인 가능 | apply 스크립트가 자동 처리 (already-applied skip) |
| Stored data | `_prisma_migrations` 테이블 — `prisma/migrations/`에 파일 1개 (`20260410000000_init_phase2`). DB에 이 테이블이 있는지 자체가 불확실 (Supabase는 `prisma migrate dev`를 직접 실행한 적 없음) | apply 후 `prisma migrate status` 출력 보고 판단 |
| Live service config | `auth.users.raw_app_meta_data` — 승격할 dev 계정의 현재 role은 WORKER 또는 BUSINESS로 추정. ADMIN 아님. | SQL UPDATE (admin seed) |
| OS-registered state | 없음 — 해당 사항 없음 | 없음 |
| Secrets/env vars | `CLOVA_OCR_SECRET`, `CLOVA_OCR_API_URL` — `.env.example`에 placeholder 있음. 실제 값 없음. Phase 7에서는 문서화만 (MOCK 경로 유지) | `docs/external-keys.md` 작성으로 대응. 키 발급은 MOCK-LOG에 기록 |
| Build artifacts | `src/generated/prisma/` — gitignored. `prisma generate` 재실행 필요. STATE.md "Known Env Drift"에 기록된 기존 이슈 | `npx prisma generate` 실행으로 해결 |

---

## Common Pitfalls

### Pitfall 1: Admin Seed 이미 NO-OP으로 적용된 경우

**What goes wrong:** `20260414000005_phase6_admin_seed.sql`이 NO-OP 상태로 이미 `_supabase_migrations`에 기록되어 있으면, UPDATE 블록을 주석 해제해도 apply 스크립트가 "Skipping (already applied)"를 출력하고 건너뜀. Admin이 승격되지 않음.

**Why it happens:** `_supabase_migrations`는 filename을 PRIMARY KEY로 쓰므로 한 번이라도 적용된 파일은 재실행되지 않는다.

**How to avoid:** D-44 절차 순서가 핵심: **주석 해제 + 이메일 교체 → git commit → apply 스크립트 실행** 순서로 해야 한다. 파일이 이미 기록되어 있는 경우, **Supabase SQL Editor에서 UPDATE를 직접 실행**하는 대안이 있다. (seed SQL 파일 기존 주석에 이 경우 대안 명시되어 있음)

**Warning signs:** apply 스크립트 출력에 `Skipping (already applied): 20260414000005_phase6_admin_seed.sql` 가 보임.

**Detection:** apply 완료 후 `public.users` 테이블에서 role = 'ADMIN' 행이 0건이면 이 pitfall 발생.

### Pitfall 2: `prisma migrate status` Exit Code 1 (예상 가능한 drift)

**What goes wrong:** `prisma migrate status`가 exit 1을 반환하며 drift 보고. VERIFICATION.md에 성공 증거를 붙일 수 없음.

**Why it happens:** `prisma/migrations/`에는 Phase 2 초기 migration 1개만 있다. 이후 Phase 3-6 컬럼 추가는 `supabase/migrations/`로 적용되었으며 `_prisma_migrations` 테이블에 기록되지 않았다. Prisma는 현재 DB 스키마와 `prisma/migrations/` 히스토리를 비교할 때 컬럼들이 migrate history에 없다는 것을 drift로 감지할 수 있다.

**Why Prisma may or may not flag this:** Prisma의 `migrate status`는 엄격히 `_prisma_migrations` 테이블의 컨텐츠와 `prisma/migrations/` 폴더를 비교한다. `_prisma_migrations` 자체가 DB에 없으면 "no migration table is found" → exit 1. 있더라도 DB가 schema.prisma보다 더 많은 컬럼을 가지고 있는 경우 migrate status 자체는 OK를 반환할 수 있다 — schema drift는 `prisma migrate diff`로만 감지된다.

**How to avoid:** apply 단계에서 `prisma migrate status` 출력을 그대로 VERIFICATION.md에 붙이고, exit code를 기록. Clean이면 성공. Exit 1이면 `/gsd-debug`로 분기.

**Warning signs:** `"no migration table is found"` 또는 `"migration history has diverged"` 메시지.

**Resolution path (Claude's Discretion):**
- `_prisma_migrations` 없음: `prisma migrate resolve --applied 20260410000000_init_phase2` 로 baseline 등록 후 재확인
- Diverged: `prisma migrate diff --from-migrations prisma/migrations --to-schema-datasource` 로 실제 diff 확인 후 대응

### Pitfall 3: JWT Refresh 미확인으로 Admin 로그인 실패

**What goes wrong:** Admin seed 적용 후 `/admin` 접근 시 redirect to `/login` 또는 403. "로그인 성공" 착각 후 VERIFICATION.md에 잘못된 증거 기록.

**Why it happens:** middleware가 JWT의 `app_metadata.role`을 읽는다. SQL UPDATE로 DB는 변경되었지만 기존 세션 토큰은 여전히 이전 role (또는 role 없음)을 포함.

**How to avoid:** seed 적용 후 반드시 현재 브라우저에서 로그아웃 → 재로그인 절차 실행. VERIFICATION.md에 "re-login performed: [datetime]" 기록.

**Warning signs:** Admin seed apply 후 `/admin` 접근 시 `/login`으로 redirect.

### Pitfall 4: Storage 테스트 시 인증 세션 부재

**What goes wrong:** `curl` 또는 Supabase Dashboard로 signed URL 발급 시 에러. 또는 upload 단계 RLS 실패.

**Why it happens:** INSERT RLS 정책 (`biz_reg_owner_insert`)이 `auth.uid()::text = (storage.foldername(name))[1]`을 요구. 실제 인증된 Business 사용자 세션 없이는 upload 불가.

**How to avoid:** 업로드는 Supabase Dashboard의 Storage 탭에서 서비스 롤 키를 사용하거나, 실제 biz 계정으로 `/biz/verify` 플로우를 통해 수행. Signed URL 발급은 Admin 세션 또는 서비스 롤로 수행. 증거 캡처는 curl -I 응답 헤더로 충분.

---

## Code Examples

### 1. apply-supabase-migrations.ts 실행

```bash
# Source: scripts/apply-supabase-migrations.ts (이미 존재)
npx tsx scripts/apply-supabase-migrations.ts
# 또는
npm run db:supabase

# 예상 출력 (success case):
# Found 22 Supabase migration(s) to apply:
#   - 20260410000000_enable_postgis.sql
#   ...
# Skipping (already applied): 20260410000000_enable_postgis.sql
# ...
# Applying: 20260414000001_phase6_business_profile_extension.sql
#   OK
# ...
# Done. 4 applied, 18 skipped (already applied).
```

### 2. Prisma CLI 검증 순서

```bash
# Source: Context7 /websites/prisma_io — prisma validate, migrate status
npx prisma validate
# 성공: "The schema at prisma/schema.prisma is valid"
# 실패: P1012 에러 코드와 상세 메시지

npx prisma migrate status
# 성공 (clean): exit 0 + "Database schema is up to date!"
# 실패: exit 1 + 상세 drift 정보

npx prisma generate
# 성공: "Generated Prisma Client (...) to ./src/generated/prisma"
```

### 3. Signed URL 발급 + curl 검증

```typescript
// Source: src/lib/supabase/storage-biz-reg.ts:createSignedBusinessRegUrl
// TTL: 3600s (D-38 고정값)
const signedUrl = await createSignedBusinessRegUrl('{userId}/{businessId}.jpg', 3600)
console.log('signed URL:', signedUrl)
```

```bash
# curl 검증 (비대화형 증거)
curl -I "https://[project].supabase.co/storage/v1/object/sign/business-reg-docs/..." 2>&1
# 예상 응답: HTTP/2 200, Content-Type: image/jpeg
```

### 4. Admin public.users role 확인 쿼리

```sql
-- VERIFICATION.md 첨부용 스냅샷 쿼리 (Supabase SQL Editor)
SELECT id, email, role FROM public.users WHERE role = 'ADMIN';
```

### 5. auth.users app_metadata 확인

```sql
-- VERIFICATION.md 첨부용 (service_role 권한 필요)
SELECT id, email, raw_app_meta_data
FROM auth.users
WHERE email = '[승격한 dev 이메일]';
-- 예상: raw_app_meta_data = {"role": "ADMIN", ...}
```

### 6. MOCK-LOG 4필드 예시

```markdown
| Field | Value |
|-------|-------|
| Mocked path | Phase 6 Scenario 7: CLOVA OCR happy-path round-trip |
| Reason | CLOVA_OCR_SECRET 미발급 — 실 API 호출 불가 |
| Real-key re-verify step | `CLOVA_OCR_SECRET` / `CLOVA_OCR_API_URL` 설정 후 business-reg-docs 테스트 이미지 업로드 → `/biz/verify` 트리거 → `public.business_profiles.reg_number_ocr_match = true` 확인 |
| Target milestone | v1.2 |
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase CLI `db push` | `tsx scripts/apply-supabase-migrations.ts` + `pg` 직접 연결 | Phase 2 pivot | MCP-linked 계정 외부 Supabase에 적용 가능. Docker 불필요 |
| `prisma migrate dev` | SQL 직접 작성 + apply 스크립트 | Phase 2 (extension drift 감지 문제) | 재실행 안전. DDL autocommit semantics 보장 |
| JWT 즉시 갱신 가정 | re-login 필수 절차 명시 | Phase 6 D-27 Codex review 수정 (커밋 `6a392a8`) | middleware 보안 구멍 차단 |

**Deprecated/outdated:**
- `prisma db push`: Phase 2에서 Supabase extension drift 감지로 충돌 발생 후 기각. 재사용 금지.
- Supabase CLI: MCP-linked 계정 밖의 프로젝트에는 사용 불가. Phase 2 pivot 근거.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `_prisma_migrations` 테이블이 현재 Supabase DB에 없거나 Phase 2 init만 기록되어 있을 것 | Pitfall 2, Pattern 1 | 테이블이 예상과 다른 상태면 `migrate status` 출력이 달라져 복구 절차가 달라짐 — apply 단계에서 실 출력 보고 판단 |
| A2 | Phase 6 마이그레이션 4개 (000001-000005)가 아직 Supabase에 미적용 상태 | Summary, MIG-01 | 이미 일부 적용되어 있다면 apply 스크립트가 skip하고 나머지만 적용함 — apply 스크립트 출력으로 확인 가능 |
| A3 | `prisma migrate status`의 "clean" 정의가 이 프로젝트 구성에서 exit 0 + "Database schema is up to date" 출력 | Pattern 1, MIG-04 | Prisma 7에서 migrate status의 clean 판정 기준이 문서와 다를 경우 — apply 후 실 출력으로 검증 |
| A4 | CLOVA OCR NCP 콘솔 UI가 D-47 가이드 작성 시점(2026-04-15)과 크게 다르지 않을 것 | INFRA-01, external-keys.md | NCP UI 변경 시 가이드 stale. D-48에서 스크린샷 금지한 이유이기도 함. 텍스트 체크리스트라 UI 변경에 어느 정도 내성 있음 |
| A5 | 생태계에 MOCK 추적 표준 컨벤션 없음 | Pattern 4 | 표준이 있다면 D-49/50/51 커스텀 설계가 과잉. 단일 개발자 프로젝트에서 실질적 위험 없음 |

---

## Open Questions

1. **`prisma migrate status` 실 출력 형태**
   - What we know: `prisma/migrations/`에 1개 파일. `supabase/migrations/`에 22개. DB에 Phase 6 컬럼 미적용.
   - What's unclear: Supabase DB에 `_prisma_migrations` 테이블이 현재 존재하는지, 존재한다면 어떤 항목이 기록되어 있는지.
   - Recommendation: apply 단계 실행 전에 `prisma migrate status`를 먼저 실행하여 현재 상태 파악. 출력을 VERIFICATION.md에 before/after로 기록.

2. **Admin seed 이미 적용 여부**
   - What we know: seed 파일이 NO-OP 상태로 커밋되어 있음. Phase 6 완료 이후 apply 스크립트를 실행한 적이 있다면 이미 `_supabase_migrations`에 기록되어 있을 수 있음.
   - What's unclear: apply 스크립트를 Phase 6 완료 후 실제로 실행했는지 여부 (STATE.md에 migration pending으로 기록).
   - Recommendation: apply 스크립트 실행 전에 Supabase SQL Editor에서 `SELECT filename FROM _supabase_migrations WHERE filename LIKE '%admin_seed%'`로 확인. 이미 기록되어 있으면 SQL Editor 직접 실행으로 대안.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase (network) | MIG-01, MIG-02, MIG-03, MIG-04 | Unknown (blocker) | — | None — D-54 로컬 MOCK 금지 |
| Node.js | `npx tsx scripts/apply-supabase-migrations.ts` | ✓ | v25.6.1 | — |
| npx / tsx | apply 스크립트 실행 | ✓ | tsx 4.21.0 | — |
| prisma CLI | validate / migrate status / generate | ✓ | 7.5.0 | — |
| DIRECT_URL | apply 스크립트 (port 5432) | Set in .env.local | — | None — Supabase 접속 확보 필요 |
| SUPABASE_SERVICE_ROLE_KEY | signed URL 발급 (service_role 경로) | Set in .env.local | — | User 세션으로 대체 가능 |
| curl | Signed URL 200 OK 검증 | ✓ (assumed, standard OS tool) | — | Supabase Dashboard Storage preview |
| CLOVA_OCR_SECRET | INFRA-01 | Not set (외부 키 미발급) | — | MOCK-LOG 기록으로 대체 (INFRA-03) |

**Missing dependencies with no fallback:**
- **Supabase network access** — Phase 7 apply 단계 전체를 차단. D-53 prep/apply 분리는 이 blocker를 고려한 설계.

**Missing dependencies with fallback:**
- **CLOVA_OCR_SECRET** — 문서화만 하고 MOCK-LOG에 기록. Phase 7 close 기준에 영향 없음.

---

## Validation Architecture

> `workflow.nyquist_validation: true` 확인됨 (config.json).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts 존재) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter verbose` |
| Full suite command | `npx vitest run` |

**Phase 7 특이사항:** Phase 7의 성공 기준은 코드 단위 테스트로 자동화할 수 없다. 모든 검증이 **실 Supabase 연결이 필요한 통합/수동 검증**이다. Nyquist section은 각 성공 기준에 대한 독립 관측 가능 신호(observable signal)를 정의하고, 이것이 VERIFICATION.md의 뼈대가 된다.

### Phase Requirements → Observable Signal Map

**Success Criterion 1 (MIG-01, MIG-04): `prisma migrate status` + `prisma validate` + `prisma generate` clean**

| Signal | Type | Automated? | Command / Evidence |
|--------|------|-----------|---------------------|
| `prisma validate` exit 0 + "is valid" | automated | 로컬 (네트워크 불필요) | `npx prisma validate` |
| `prisma migrate status` exit 0 | manual evidence | 실 Supabase 필요 | stdout 전체 VERIFICATION.md에 첨부 |
| `apply-supabase-migrations.ts` 출력 | manual evidence | 실 Supabase 필요 | "X applied, Y skipped" 출력 |
| `prisma generate` exit 0 | automated | 로컬 (src/generated/prisma 갱신 확인) | `npx prisma generate` |
| Phase 6 컬럼 존재 확인 | manual evidence | 실 Supabase 필요 | SQL: `SELECT column_name FROM information_schema.columns WHERE table_name = 'business_profiles'` |

**Success Criterion 2 (MIG-02): business-reg-docs RLS authenticated write + signed read**

| Signal | Type | Automated? | Command / Evidence |
|--------|------|-----------|---------------------|
| 업로드 성공 (200 OK) | manual evidence | 실 Supabase + 인증 세션 필요 | Supabase Dashboard Storage 탭 또는 `/biz/verify` 플로우 |
| Signed URL 발급 성공 (null 아님) | manual evidence | 실 Supabase 필요 | `createSignedBusinessRegUrl()` 반환값 비null |
| Signed URL curl 200 OK | manual evidence | curl로 확인 | `curl -I "$SIGNED_URL"` → HTTP/2 200 |
| TTL 기록 | manual evidence | — | "TTL: 3600s" VERIFICATION.md에 기록 |
| 미인증 접근 403 (RLS 동작) | manual evidence | Supabase Dashboard | 다른 userId 경로로 접근 시도 → 403 |

**Success Criterion 3 (MIG-03): Admin 계정 `/admin` 로그인 성공**

| Signal | Type | Automated? | Command / Evidence |
|--------|------|-----------|---------------------|
| `public.users` role = 'ADMIN' | manual evidence | SQL 쿼리 | `SELECT email, role FROM public.users WHERE role = 'ADMIN'` |
| `auth.users.raw_app_meta_data.role` = 'ADMIN' | manual evidence | SQL 쿼리 (service_role) | JSONB 스냅샷 VERIFICATION.md 첨부 |
| 로그아웃 → 재로그인 완료 | manual evidence | 브라우저 | 로그아웃 시간 기록 |
| `/admin` 접근 성공 (200, redirect 없음) | manual evidence | 브라우저 | Network 탭 또는 URL bar 확인 |
| `/admin/businesses` 접근 성공 | manual evidence | 브라우저 | 동일 |
| `/admin/businesses/[id]` 접근 성공 | manual evidence | 브라우저 | 동일 |

**Success Criterion 4 (INFRA-01): CLOVA_OCR_SECRET 5분 발급 가이드**

| Signal | Type | Automated? | Command / Evidence |
|--------|------|-----------|---------------------|
| `docs/external-keys.md` 파일 존재 | automated | `ls docs/external-keys.md` | exit 0 |
| 6단계 체크리스트 포함 | manual review | — | 파일 내용 확인 |
| `.env.example` 주석에 docs/ 링크 포함 | automated | `grep "external-keys" .env.example` | match |
| 변수명 정확도: `CLOVA_OCR_SECRET` + `CLOVA_OCR_API_URL` | manual review | — | `src/lib/ocr/clova.ts` 참조 일치 |

**Success Criterion 5 (INFRA-03): MOCK-LOG 템플릿 4필드 확립**

| Signal | Type | Automated? | Command / Evidence |
|--------|------|-----------|---------------------|
| `.planning/templates/MOCK-LOG.md` 존재 | automated | `ls .planning/templates/MOCK-LOG.md` | exit 0 |
| 4필드 포함 | automated | `grep -c "mocked path\|reason\|real-key\|target milestone" .planning/templates/MOCK-LOG.md` | 4 |
| `.planning/MOCK-INDEX.md` 존재 | automated | `ls .planning/MOCK-INDEX.md` | exit 0 |
| `.planning/README.md` MOCK 정책 섹션 존재 | automated | `grep -l "MOCK" .planning/README.md` | match |
| `.planning/phases/06-admin-backoffice/MOCK-LOG.md` 존재 + 3개 시나리오 항목 | manual review | `ls .planning/phases/06-admin-backoffice/MOCK-LOG.md` | 파일 내용 확인 |

### Wave 0 Gaps

Phase 7은 자동화 테스트 추가가 없는 phase다. 기존 vitest suite는 변경 없이 통과해야 한다.

- [ ] apply 단계 실행 전: `npx vitest run tests/admin/` — 기존 Phase 6 admin 테스트 GREEN 확인
- [ ] apply 단계 실행 전: `npx vitest run tests/ocr/` — CLOVA parser 단위 테스트 GREEN 확인

```
MOCK-LOG.md 체크리스트 (자동화 없음, VERIFICATION.md 수동 기록으로 대체):
- [ ] prep 산출물 5개 파일 git commit 완료
- [ ] apply 스크립트 성공 출력 첨부
- [ ] prisma validate + migrate status + generate 출력 첨부
- [ ] public.users + auth.users JSONB 스냅샷 첨부
- [ ] signed URL 200 OK curl 출력 + TTL 수치 첨부
- [ ] Admin 로그인 성공 확인 (3개 라우트)
```

---

## CLOVA OCR Provisioning — 5분 체크리스트 설계 기반

D-47/D-48에 따라 `docs/external-keys.md`에 작성할 내용의 구조적 설계:

```
1. NCP 콘솔 가입 (account.ncloud.com)
   → CLOVA OCR 서비스 요금제 확인 (General 도메인 필요)
2. CLOVA OCR 서비스 > [General] 도메인 생성
   → 서비스 유형: "일반 문서" 또는 General 선택
3. 생성된 도메인 > [연동 설정] 탭
   → API Gateway 자동 연동 버튼 클릭
4. APIGW Invoke URL 복사
   → 이것이 CLOVA_OCR_API_URL 값
5. Secret Key 생성 (또는 복사)
   → [Secret Key 생성] 버튼 → 이것이 CLOVA_OCR_SECRET 값
6. `.env.local`에 두 변수 설정
   CLOVA_OCR_SECRET=<복사한 값>
   CLOVA_OCR_API_URL=<Invoke URL>
```

**공식 문서 링크:** https://guide.ncloud-docs.com/docs/en/clovaocr-overview
**API 레퍼런스:** https://api.ncloud-docs.com/docs/en/ai-application-service-ocr

[CITED: guide.ncloud-docs.com/docs/en/clovaocr-overview — CLOVA OCR General 도메인 개요]
[CITED: api.ncloud-docs.com/docs/en/ai-application-service-ocr — X-OCR-SECRET + Invoke URL 설명]

**주의:** NCP 콘솔 UI는 변경될 수 있으므로 단계별 텍스트만 기재. 스크린샷 포함 금지 (D-48).

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth — Admin re-login 후 JWT 확인 |
| V3 Session Management | yes | JWT refresh 후 claim 갱신 확인 (re-login 필수) |
| V4 Access Control | yes | Storage RLS 정책 + middleware ADMIN role check |
| V5 Input Validation | no | Phase 7은 코드 변경 최소 — SQL 교체만 |
| V6 Cryptography | partial | Signed URL JWT 서명 (Supabase 자체 처리) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 서비스 롤 키 VERIFICATION.md 노출 | Information Disclosure | `${{SECRET}}`으로 마스킹 (D-55) |
| NO-OP seed 커밋 후 재적용으로 Admin 승격 우회 | Elevation of Privilege | `_supabase_migrations` PRIMARY KEY가 재실행 차단 |
| Admin JWT claim 지연 (re-login 전 접근) | Spoofing | 반드시 re-login 절차 완료 후 검증 |
| Signed URL 로그 노출 | Information Disclosure | TTL 수치만 기록, URL 전체 VERIFICATION.md 포함 금지 |
| 잘못된 Storage 경로 RLS bypass | Elevation of Privilege | `storage.foldername(name)[1] = auth.uid()::text` (1-based index) — 마이그레이션 주석에 경고 있음 |

---

## Sources

### Primary (HIGH confidence)
- Context7 `/websites/prisma_io` — `migrate status` exit codes, drift detection, `_prisma_migrations` table, `prisma validate` 출력 형태, `migrate resolve` 사용법
- Context7 `/supabase/supabase-js` — `createSignedUrl(path, expiresIn)` API, `auth.admin.updateUserById` 패턴
- 코드베이스 직접 검증: `scripts/apply-supabase-migrations.ts` (전체 읽음), `supabase/migrations/20260414000005_phase6_admin_seed.sql` (전체 읽음), `supabase/migrations/20260414000002_phase6_storage_business_reg_docs.sql` (전체 읽음), `src/app/(auth)/role-select/actions.ts` (전체 읽음), `src/lib/ocr/clova.ts` (전체 읽음), `src/lib/supabase/storage-biz-reg.ts` (전체 읽음), `prisma/schema.prisma` (전체 읽음)
- `prisma --version` 로컬 실행: 7.5.0 확인
- `prisma validate` 로컬 실행: exit 0 + "is valid" 확인 (네트워크 불필요)
- `prisma migrate status` 로컬 실행 시도: DATABASE_URL 연결 timeout (Supabase 미접속 환경 확인)

### Secondary (MEDIUM confidence)
- Supabase GitHub discussions — app_metadata JWT refresh 시맨틱 ("will not be reflected until the user's JWT is refreshed")
- NCP CLOVA OCR 공식 문서 — X-OCR-SECRET + Invoke URL 개념 확인 (세부 UI 단계는 confirmed 아님)

### Tertiary (LOW confidence)
- 없음

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 로컬 버전 확인 + 코드베이스 전체 검토
- Migration strategy: HIGH — 두 추적 테이블 구분 Context7 verified + 코드베이스 confirmed
- Storage RLS patterns: HIGH — 마이그레이션 파일 직접 검토 + supabase-js Context7 docs
- JWT refresh semantics: MEDIUM — Supabase 공식 문서에서 직접 확인 어려움, GitHub discussions 보조
- CLOVA OCR provisioning: MEDIUM — 공식 문서 구조 확인, 세부 UI 단계는 ASSUMED
- MOCK-LOG convention: HIGH — 프로젝트 D-49/50/51 결정 준수 + 생태계에 표준 없음 확인

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (Supabase/Prisma APIs 안정적, NCP CLOVA UI는 변경 가능성 있음)
