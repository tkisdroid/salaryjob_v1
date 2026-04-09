# Phase 2: Supabase·Prisma·Auth 기반 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 02-supabase-prisma-auth
**Mode:** Delegated (user authorized Claude to decide all gray areas)
**Areas discussed:** Auth 방식 조합, 기존 schema.prisma 처리, Prisma ↔ Supabase 마이그레이션 전략, Seed 데이터 전략

---

## Pre-Discussion Context

사용자가 `/gsd-discuss-phase 2` 호출 후 gray area 4개를 모두 선택. AskUserQuestion 프리셋에서 cancel 후 freeform으로 다음 지시:

> "모든 gray area 알아서 정해주세요. supabase와 gcp, vercel 등을 사용하고 있으니 최대한 호환가능했으면 좋겠고, 국내 사이트나 이용편의/관리편의 측면에서 판단해서 승인없이 진행해주세요"

**해석된 판단 기준 (memory/feedback_autonomous_decisions.md에 영구 저장):**
1. Supabase + GCP + Vercel 3 벤더 호환성
2. 한국 시장 이용 편의(카카오 등)
3. 관리 편의(유지보수 비용)
4. 승인 절차 없이 즉시 실행

---

## Area 1: Auth 방식 조합

| Option | Description | Pros | Cons | Decided |
|--------|-------------|------|------|---------|
| Email + Password | Supabase 내장 기본 | 설정 즉시, 국내외 공통 | 사용자에게 최소 매력 | ✓ (포함) |
| Magic Link | 비밀번호 없이 이메일 링크 | UX 단순, 비밀번호 관리 부담 제거 | 이메일 도달율 의존 | ✓ (포함) |
| Google OAuth | Supabase 내장 | 설정 0에 가까움, Gmail 사용자 많음 | 구글 계정 없는 사용자 exclude | ✓ (포함) |
| Kakao OAuth | Custom OIDC provider로 Supabase에 연결 | 한국 사용자 핵심 기대치 | Supabase 내장 아님, 구현 작업 있음 | ✓ (Phase 2 말미) |
| Naver OAuth | Custom provider | 국내 보조 | 사용자 기반 카카오보다 작음, 구현 부담 | ✗ (v2) |
| SMS OTP | Twilio/Vonage 외부 통신사 | 휴대폰 인증 | 건당 비용, 한국 통신사 직접 지원 없음 | ✗ (v2) |
| Apple Sign-in | Supabase 내장 | iOS 필수 (앱스토어 배포 시) | 웹 PWA 단계에서는 불필요 | ✗ (iOS 배포 시점) |

**User's choice:** 위임 → Claude 결정: Email/Password + Magic Link + Google OAuth 기본, Kakao Phase 2 말미.

**Rationale:** Supabase 내장 3종으로 Phase 2 핵심(AUTH-01..07)을 하루 내 완주 가능. 카카오는 한국 시장 필수라 Phase 2 내에 반드시 포함하되 기본 3종이 먼저 작동한 뒤 추가. 네이버·SMS·Apple은 비용 대비 가치 낮음.

---

## Area 2: 기존 schema.prisma 처리

| Option | Description | Pros | Cons | Decided |
|--------|-------------|------|------|---------|
| (a) 그대로 활용 | 기존 18KB schema를 Phase 2에서 바로 사용 | 작업 최소 | 필드 과다, Phase 2 검증 초점 흐림, legacy에 BOTH 역할이 EMPLOYER로 잘못 명명 | ✗ |
| (b) Phase 2 범위로 축소 | 6개 핵심 모델 + 필수 enum만 남기고 legacy는 보존 | 검증 초점 명확, 점진 확장 가능 | 스키마 리팩터 작업 필요 | ✓ |
| (c) 백지 재설계 | 기존 schema 삭제 후 처음부터 | 가장 깔끔 | legacy에 담긴 의사결정 컨텍스트 소실, 작업 중복 | ✗ |

**User's choice:** 위임 → Claude 결정: (b) 축소. legacy는 `prisma/schema.legacy.prisma.txt`로 보존.

**Rationale:** legacy를 버리면 Phase 3+에서 재발견해야 할 결정(enum 선택 이유 등)을 잃음. 그대로 쓰면 Phase 2가 인프라 검증이 아니라 스키마 관리 작업으로 변질. 축소 + 보존이 두 리스크 모두 회피.

**재정의 필수 이름 변경:** `UserRole.EMPLOYER` → `UserRole.BUSINESS` (Phase 1 UI 일관성).

---

## Area 3: Prisma ↔ Supabase 마이그레이션 전략

| Option | Description | Pros | Cons | Decided |
|--------|-------------|------|------|---------|
| Prisma Migrate 단독 | schema.prisma가 모든 것 | 익숙한 UX, 자동 migration 생성 | RLS·auth trigger 지원 약함, Supabase 고유 기능 누락 | ✗ |
| Supabase Migrations 단독 | `supabase migration new` + SQL 직접 | Supabase 고유 기능 모두 활용, Preview Branching | Prisma client 타입 생성 이점 포기, relation query builder 없음 | ✗ |
| 하이브리드 | Prisma = 테이블·enum source of truth, Supabase = RLS/PostGIS/trigger 전용 | 각자 잘하는 영역, MCP 자동화 | 두 도구 동시 관리 overhead | ✓ |

**User's choice:** 위임 → Claude 결정: 하이브리드.

**Rationale:** Prisma 단독은 RLS 관리가 불편, Supabase 단독은 개발자 UX 희생. 하이브리드가 Vercel/Supabase/GCP 3 벤더 호환성을 모두 유지하면서도 Claude가 Supabase MCP로 마이그레이션을 직접 적용 가능 → 관리 편의 최대.

**실행 순서:** Supabase MCP `create_project` → `prisma migrate dev` → Supabase MCP `apply_migration`(PostGIS) → `apply_migration`(auth trigger) → `apply_migration`(RLS) → `prisma db seed` → 검증.

---

## Area 4: Seed 데이터 전략

| Option | Description | Pros | Cons | Decided |
|--------|-------------|------|------|---------|
| mock-data.ts 재사용 | 기존 한국 시장 데이터 그대로 seed로 이식 | Phase 1 UI 검증이 Phase 2 이후에도 재현 가능, 현실적 | 일부 필드 추가 필요 (auth 계정 연결) | ✓ |
| 새 seed 작성 | 간결한 fake 데이터 | 스키마 변화에 유연 | Phase 1과 데이터 불일치로 회귀 테스트 약화 | ✗ |
| Faker 라이브러리 | `@faker-js/faker`로 대량 랜덤 생성 | 스케일 테스트 좋음 | 현실감 떨어짐, 매 실행마다 달라져 디버깅 힘듦 | ✗ (Phase 4+ 스케일 테스트 시 재평가) |

**User's choice:** 위임 → Claude 결정: mock-data.ts 재사용.

**Rationale:** mock-data.ts에 이미 "스타벅스 역삼점", "쿠팡 송파 물류센터" 같은 한국 시장 현실 데이터가 있어 재활용 가치가 높음. 동일 데이터로 Phase 1 UI와 Phase 2 DB 렌더링을 비교하면 디자인 회귀를 원인별로 분리 가능.

**추가:** Dev 계정 6개(`worker/worker2/business/business2/both/admin + @gignow.dev`)를 시드에 포함해 BOTH 역할까지 E2E 검증.

---

## Additional Decisions (user did not ask but Claude locked to avoid downstream ambiguity)

### D-05 | RLS Phase 2 범위
User/WorkerProfile/BusinessProfile만 RLS 활성화. Job/Application/Review는 Phase 3/4/5에서 각 기능과 함께.

### D-06 | Next.js 16 Proxy 파일
`src/proxy.ts`로 (구 middleware.ts 아님). `@supabase/ssr` 공식 3-file 패턴(`client.ts`, `server.ts`, `middleware.ts`).

### D-07 | 환경 변수
`NEXT_PUBLIC_SUPABASE_*` + `SUPABASE_SERVICE_ROLE_KEY` + `DATABASE_URL` (pooled) + `DIRECT_URL` (direct) + OAuth secrets. Vercel Dashboard + `.env.local` 양쪽 동기.

---

## Canonical References Added During Discussion

- `@supabase/ssr` 공식 패턴 (vercel-storage skill에서 확인)
- Next.js 16 proxy.ts 이름 변경 (next-cache-components skill에서 확인)
- Supabase MCP `create_project` / `apply_migration` (available tools)
- Vercel Marketplace Supabase integration (vercel-storage skill에서 확인)

---

*Log recorded: 2026-04-10*
*Canonical decisions in: `.planning/phases/02-supabase-prisma-auth/02-CONTEXT.md`*
