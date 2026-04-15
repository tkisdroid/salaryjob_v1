# GigNow (NJob)

## What This Is

GigNow는 일본 Timee를 벤치마킹한 한국형 초단기/스팟 알바 매칭 플랫폼입니다. Worker와 Business를 잇는 양면 마켓플레이스로, "탐색 → 원탭 지원 → 근무 → 즉시 정산" 루프 하나만 집요하게 최적화합니다. 운영자가 사업장 검색·수수료 관리·사업자등록증 열람을 할 수 있는 Admin 콘솔도 내장합니다.

## Core Value

**이력서·면접 제로. 탭 하나로 확정, 근무 후 즉시 정산.** — 다른 모든 기능은 이 단일 경험을 방해하지 않는 한에서만 존재합니다.

## Current State

**Shipped:** v1.0 Timee 모델 한국 MVP — 2026-04-15 (tag `v1.0`)

- 43/43 v1 requirements + 17/17 Phase 6 operational decisions satisfied at code level.
- 6 phases × 38 plans × 55 tasks shipped across 2026-04-10 → 2026-04-13.
- Stack: Next.js 16 App Router, React 19, Prisma 7, Supabase Auth + PostGIS, Tailwind v4 / shadcn.
- Milestone audit: `tech_debt` (no blockers). See `.planning/milestones/v1.0-MILESTONE-AUDIT.md`.

## Requirements

### Validated (v1.0)

- ✓ Mock UI foundation (Worker/Business E2E 루프, 양방향 ReviewForm, Timee 스타일 네비게이션) — Phase 1
- ✓ Supabase·Prisma·Auth 기반 (6모델 + PostGIS + 이메일 4방식 + Kakao OAuth + role-gated layouts) — Phase 2
- ✓ Worker/Business 프로필 CRUD + Supabase Storage 아바타 업로드 (WORK-01..04, BIZ-01..03) — Phase 3
- ✓ Business 공고 CRUD + PostGIS 거리 정렬 + pg_cron 만료 (POST-01..06) — Phase 3
- ✓ 원탭 지원 + accept/reject Realtime + 자동 마감 (APPL-01..05) — Phase 4
- ✓ 체크인/체크아웃 + 야간 할증 50% + geofence ST_DWithin (SHIFT-01..03) — Phase 4
- ✓ Kakao Maps 지도 탐색 + 시간 필터 버킷 (SEARCH-02/03) — Phase 4
- ✓ Web Push (VAPID + Service Worker) accept/reject 알림 (NOTIF-01 partial) — Phase 4
- ✓ 양방향 리뷰 + rating 원자적 집계 (REV-01..04) — Phase 5
- ✓ Settlement (settled 전환 + Asia/Seoul 월 집계) (SETL-01..03) — Phase 5
- ✓ `src/lib/mock-data.ts` 완전 제거 (DATA-05 gate pass) — Phase 5
- ✓ Admin 콘솔 (사업장 검색/필터/정렬/커서 페이지네이션, 수수료 관리, 등록증 열람) (D-27..D-43) — Phase 6
- ✓ 사업자 자동 인증 (regNumber) + 공고 등록 시 이미지 게이트 + CLOVA OCR — Phase 6

### Active (v1.1 candidate scope)

- [ ] Phase 6 DB 마이그레이션 적용 — `commissionRate` / `businessRegImageUrl` / `Application.commissionRate|commissionAmount|netEarnings` / `business-reg-docs` storage bucket. Runtime blocker until applied.
- [ ] HUMAN-UAT 8 시나리오 실행 — Phase 5 (1분 루프, 375px 가독성, 리뷰 UX taste), Phase 6 (admin 검색, biz verify, 이미지 게이트, OCR 라운드트립).
- [ ] `/my/schedule` 페이지의 로컬 MOCK 상수(availability/match history)를 실 DB로 wiring (Phase 1 legacy).
- [ ] Stale Clerk TODO 주석 정리 (`api/push/register/route.ts`).
- [ ] 인프라 보완: `CLOVA_OCR_SECRET` 프로비저닝, signed URL TTL 실측.

### Deferred to v2

- **AI 매칭 고도화** (AIMATCH-01..04) — Claude + Gemini 게이트웨이 본격 매칭 품질 튜닝.
- **Toss Payments 실결제 + 원천징수** (PAY-01..04) — Phase 6에서 수수료 rate 모델링은 끝남. 실 결제·출금·원천징수는 v2. 백로그 999.2에 scope hint 기록됨.
- **SMS / 카카오 알림톡 / 네이티브 FCM/APNs** — Web Push는 Phase 4에서 커버 완료. 네이티브 채널은 PWA 검증 후.
- **고급 키워드 검색** (SEARCH-01) — 현재는 카테고리/거리/시간 필터만.
- **1:1 채팅** (CHAT-01/02) — 자동 확정 플로우로 채팅 필요 최소화.
- **사업자 하트/스카우트 알림** — 백로그 999.1에 scope hint 기록됨.

### Out of Scope

- **면접·판단 심사·고용주 임의 거절** — Timee 차별화 원칙. 자동수락 타이머(30분)로 간소화된 pending→confirmed만 허용. 기존 한국 알바 플랫폼 패턴 금지.
- **Multi-session / MFA / 조직 관리** — Supabase Auth 기본 기능만 사용.
- **풀 광고 플랫폼** — MVP 검증 후 고려.
- **한국어 외 언어 지원** — 국내 시장 집중.
- **모바일 네이티브 앱** — PWA/웹 우선.

## Context

- **벤치마크**: 일본 Timee. 기능·UI·마이크로카피를 한국 시장에 이식.
- **v1.0 코드 상태 (2026-04-15)**:
  - 55 Next.js routes, 238 passing vitest + 10 todo
  - Next.js 16.2.1 + React 19.2.4 + Prisma 7.5 + Tailwind v4 + shadcn/ui + @supabase/ssr
  - `src/lib/mock-data.ts` **삭제됨** (DATA-05 gate). `(worker)/my/schedule/page.tsx`의 로컬 MOCK 상수는 Phase 1 legacy 잔재.
  - Supabase DB에 Phase 2-5 마이그레이션 적용 완료. Phase 6 마이그레이션은 schema.prisma에만 존재, 실 apply 대기 (Supabase 연결 불가로 close 시점에 deferred).
- **개발자 컨텍스트**: 단일 개발자, 빠른 반복 속도 + 단단한 거버넌스. GSD 워크플로(phase → plan → execute → verify → audit) 준수.
- **UAT**: Phase 5 3 시나리오 + Phase 6 5 pending + 3 deferred. 브라우저 세션 + 실 Supabase 연결이 필요한 항목들.

## Constraints

- **Tech stack**: Next.js 16 (App Router) + React 19 + Prisma 7 + Supabase (DB + Auth) — 변경하려면 PROJECT.md 업데이트 필수.
- **Data model**: PostgreSQL + PostGIS (위치 기반 쿼리 필수) — Supabase 기본 제공.
- **Auth provider**: Supabase Auth (Clerk/NextAuth 제외). **예외:** Kakao Maps JavaScript SDK는 /home 지도 탐색 UX를 위한 첫 외부 의존성 (D-23).
- **Mock removal**: `src/lib/mock-data.ts` 의존 경로 0개 유지 (v1.0 gate 통과됨, 회귀 금지).
- **UX 원칙**: Timee "면접 없음 · 당일 근무 · 즉시 정산" 3축을 깨는 기능 설계 금지.
- **Performance**: "탐색 → 지원 → 확정" 플로우 실 DB 왕복 1분 이내 (v1.0에서 코드-레벨 달성, HUMAN-UAT 실측 대기).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Phase 1은 mock-data.ts로 UI 완성 후 Phase 2에서 DB/API 연결 | 디자인/플로우 실수를 저비용으로 조기 발견 | ✓ Good — Phase 1 shipped 2026-04-10 |
| Supabase를 DB + Auth 단일 벤더로 선택 | 한 벤더로 복잡도 최소화, MCP로 직접 적용 | ✓ Good — Phase 2 shipped 2026-04-10 (MCP 대신 direct-prisma fallback 적용, 결과 동일) |
| Phase 2 마이그레이션 전략: direct-prisma (Pivot from MCP/CLI) | 대상 Supabase 프로젝트가 MCP-linked 계정 밖 → `pg` + Prisma migrate + tsx 스크립트 fallback | ✓ Good |
| 양면 마켓플레이스 구조 (Worker + Business 동시 지원) | Timee 모델 복제 | ✓ Good — 라우트 그룹 구조로 Phase 1부터 반영 |
| AUTH-01: 휴대폰/SMS OTP는 v2로 연기, 이메일 4방식으로 v1 대체 | SMS provider 연동 비용 + 한국에서 이메일 충분 | ✓ Good (드리프트 문서화, STATE.md D-01) |
| Phase 4 scope 확장 — Kakao Maps + Web Push + 체크아웃 QR (SEARCH-02/03, NOTIF-01 partial) | Timee 지도·알림·본인확인 UX가 MVP에서 필수로 판명 | ✓ Good — Phase 4 shipped 2026-04-11 |
| DATA-05 gate 강제 — Phase 5 종료 = mock-data.ts 삭제 | "실 DB 위에서 동작" 여부를 기계적으로 측정 | ✓ Good — `grep` exit 1 확인, 회귀 방지 장치 유지 |
| Phase 6 commission 스냅샷 @ checkOut 시점 (rate 변경은 과거 정산에 영향 없음) | 과거 거래의 불변성 + 관리자 rate 수정 자유도 | ✓ Good — D-34..36 |
| Phase 6 CLOVA OCR advisory, 이미지 저장은 authoritative | OCR 실패해도 Human UAT로 복구 가능, 게이트는 이미지 존재로만 판단 | ✓ Good — D-31/D-33 |
| 성공 지표로 "플로우 지표"(탐색→지원→근무 예약 1분 이내) 채택 | 기술 완료가 아닌 사용자 플로우 동작이 진짜 완료 기준 | ⚠️ Revisit — 코드 달성, HUMAN-UAT 실측 v1.1에서 |
| Phase 6 DB 마이그레이션 close 시점에 미적용 (tech debt로 수락) | Supabase 연결 불가. Code wiring 완료이므로 audit는 satisfied | ⚠️ Revisit — v1.1 첫 작업으로 apply |

---
*Last updated: 2026-04-15 after v1.0 milestone shipped (6 phases, 38 plans, 43 v1 reqs + 17 Phase 6 decisions — all code-complete, `tech_debt` audit).*
