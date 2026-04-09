# GigNow (NJob)

## What This Is

GigNow는 일본 Timee를 벤치마킹한 한국형 초단기/스팟 알바 매칭 플랫폼입니다. Worker와 Business를 잇는 양면 마켓플레이스로, "탐색 → 원탭 지원 → 근무 → 즉시 정산" 루프 하나만 집요하게 최적화합니다.

## Core Value

**이력서·면접 제로. 탭 하나로 확정, 근무 후 즉시 정산.** — 다른 모든 기능은 이 단일 경험을 방해하지 않는 한에서만 존재합니다.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Worker 탐색·지원·체크인·리뷰 목업 루프 — Phase 1
- ✓ Business 공고 생성·지원자 관리·지원자 리뷰 목업 루프 — Phase 1
- ✓ 양방향 ReviewForm 공용 컴포넌트 (worker↔biz) — Phase 1
- ✓ Timee 스타일 UI 언어 (모바일 퍼스트 Worker, 데스크톱 Biz) — Phase 1

### Active

<!-- Current scope. Building toward these. -->

- [ ] Prisma 스키마 정의 (Worker/Business/Job/Application/Review) — Phase 2
- [ ] Supabase 프로젝트 연결 + 마이그레이션 — Phase 2
- [ ] Supabase Auth 기반 로그인/세션 (Worker + Business 이중 역할) — Phase 2
- [ ] Worker/Business 프로필 등록 및 영속화 — Phase 2
- [ ] 기본 CRUD: 공고 생성·목록·상세·지원 — Phase 2
- [ ] mock-data.ts 완전 제거 — Phase 2 종료 조건

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- **지원→대기→면접→채용 패턴** — Timee 벤치마크의 핵심 차별화 원칙. 기존 한국 알바 플랫폼(알바천국/알바몬)의 워크플로를 재생산하면 프로덕트의 존재 이유가 사라짐.
- **AI 매칭 알고리즘 고도화** — `src/lib/services/ai-matching.ts`에 Claude+Codex 스캐폴드만 존재. Phase 2는 데이터 레이어만 책임지고, 실제 매칭 품질은 Phase 3+에서 측정 후 튜닝.
- **Toss Payments 실제 연동, 원천징수, 사업자번호 검증** — 정산 UI는 Phase 1에서 mock. 법·결제 통합은 제품-시장 맞물림 확인 후 별도 Phase.
- **Push 알림, SMS, 카카오 알림톡** — "당일 알림"은 Timee의 핵심이지만 Phase 2는 데이터 기반 구축. Push 파이프라인은 Phase 4+.
- **Multi-session/MFA/조직 관리** — Supabase Auth 기본 기능만 사용. Clerk급 엔터프라이즈 기능 불필요.
- **풀 광고 플랫폼** (위치 기반 프로모션, 규모 인센티브) — MVP 이후.
- **한국어 외 언어 지원** — 국내 시장 집중.

## Context

- **벤치마크**: 일본 Timee (timee.co.jp, ads.apple.com/kr/app-store/success-stories/timee, japan-dev.com/companies/timee). 기능·UI·마이크로카피를 모두 학습하여 한국 시장에 이식.
- **현재 코드 상태 (2026-04-10)**:
  - Phase 1 커밋 완료 (`55790d1 feat: Phase 1 mock-data UI`)
  - Next.js 16.2.1 App Router, React 19.2.4, Prisma 7.5, Tailwind v4, shadcn/ui, AI SDK v6
  - `src/lib/mock-data.ts` 전 기능 구동, Worker/Biz 양쪽 루프 전부 모킹으로 E2E 가능
  - `src/lib/services/ai-matching.ts` Claude+Codex 스캐폴드 — 워킹 트리에 TS 에러 남아있음 (Phase 3 대상)
  - `.planning/codebase/ARCHITECTURE.md` 일부는 aspirational 상태 (Clerk/Toss/push 언급이 있으나 실제 미설치)
- **개발자 컨텍스트**: 단일 개발자, 빠른 반복 속도를 선호. 커밋 단위 단단함·거버넌스·사용자 플로우 무결성을 중시.
- **로컬라이제이션 타겟**: 카카오맵, 국세청 사업자 인증, Toss Payments, 원천징수 — 모두 Phase 3+.

## Constraints

- **Tech stack**: Next.js 16 (App Router) + React 19 + Prisma 7 + Supabase (DB + Auth) — 변경하려면 PROJECT.md 업데이트 필수.
- **Data model**: PostgreSQL + PostGIS (위치 기반 쿼리 필수) — Supabase 기본 제공.
- **Auth provider**: Supabase Auth (Clerk/NextAuth 제외) — 데이터와 인증을 단일 벤더로 통합하여 복잡도 최소화.
- **Mock removal**: Phase 2 종료 시점에 `src/lib/mock-data.ts` 의존 경로 0개여야 함. 이 파일이 남아있으면 Phase 2는 미완료.
- **UX 원칙**: Timee의 "면접 없음 · 당일 근무 · 즉시 정산" 3축을 깨는 기능 설계 금지.
- **Performance**: "탐색 → 지원 → 확정" 플로우가 실제 DB 왕복으로도 1분 이내 완료되어야 Phase 2 성공.

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Phase 1은 mock-data.ts로 UI 완성 후 Phase 2에서 DB/API 연결 | 디자인/플로우 실수를 저비용으로 조기 발견. Prisma 스키마도 실제 UI 요구를 본 뒤에 정의 | ✓ Good — Phase 1 shipped 2026-04-10 |
| Supabase를 DB + Auth 단일 벤더로 선택 | 한 벤더로 복잡도 최소화, MCP 서버로 Claude가 직접 마이그레이션 적용 가능 | — Pending (Phase 2 검증) |
| 양면 마켓플레이스 구조 (Worker + Business 동시 지원) | Timee 모델 복제. 한쪽만으로는 공급/수요 균형 불가 | ✓ Good — 라우트 그룹 구조로 Phase 1에 반영 |
| AI 매칭은 Phase 3+로 연기 | Phase 2는 데이터 레이어만 책임. 매칭 품질은 실 데이터 축적 후 튜닝 | — Pending |
| 성공 지표로 "플로우 지표"(탐색→지원→근무 예약 1분 이내) 채택 | 기술 완료가 아닌 사용자 플로우 동작이 진짜 완료 기준 | — Pending |

---
*Last updated: 2026-04-10 after /gsd-new-project initialization (brownfield)*
