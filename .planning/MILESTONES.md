# Milestones

## v1.0 Timee 모델 한국 MVP (Shipped: 2026-04-15)

**Phases completed:** 6 shipped phases (1–6) + 2 backlog items carried forward (999.1, 999.2)
**Plans:** 38 executed plans, 55 tasks
**Milestone audit:** `tech_debt` — 43/43 v1 requirements + 17/17 Phase 6 decisions satisfied at code level, 0 critical blockers

**Key accomplishments:**

1. **Phase 1 — Mock UI foundation** — Worker·Business 양쪽의 Timee 스타일 E2E 루프 (탐색→원탭 지원→체크인→리뷰) 모바일/데스크톱 네비게이션 포함.
2. **Phase 2 — Supabase·Prisma·Auth** — Prisma 7 6모델 + 5enum, PostGIS 3.3.7, Supabase Auth 이메일 4방식(Password/Magic Link/Google/Kakao), `@supabase/ssr` 세션 유지, role-gated layouts, seed 6 dev 계정.
3. **Phase 3 — Profiles + Job CRUD** — Worker/Business 프로필 실 DB CRUD + Storage 아바타 업로드, Job CRUD Server Actions, GIST 인덱스 + `pg_cron` 5분 간격 auto-expire, 페이지네이션/Infinite scroll.
4. **Phase 4 — Application·Shift lifecycle + 탐색 고도화** — One-tap apply (원자적 좌석 예약), accept/reject Realtime, check-in/out + 야간할증 50%, Kakao Maps 지도 탐색 (SEARCH-02/03), Web Push (VAPID + SW), 체크아웃 QR (JWT + geofence ST_DWithin).
5. **Phase 5 — Reviews·Settlements + mock-data 제거** — Worker↔Business 양방향 리뷰 (Application당 1회, rating 원자적 집계), settled 상태 전환 + 정산 집계 (Asia/Seoul 월 경계), **`src/lib/mock-data.ts` 완전 제거** (DATA-05 gate pass, 238 vitest pass, 37-route build).
6. **Phase 6 — Admin Backoffice** — `/admin` ADMIN 게이트 + `requireAdmin`, 사업장 검색/필터/정렬/커서 페이지네이션 (D-40..43), BusinessProfile 수수료 관리 + checkOut 스냅샷 (D-34..36), CLOVA OCR 사업자등록번호 자동 인증 (D-30/32/33), 공고 생성 시 등록증 이미지 게이트 (D-31).

**Known deferred items at close (tracked in v1.0-MILESTONE-AUDIT.md):**

- Phase 6 DB migrations pending apply (Supabase unreachable at close) — `commissionRate`/`businessRegImageUrl`/`netEarnings` columns defined in `schema.prisma`, migration file to be generated and applied.
- 8 HUMAN-UAT scenarios pending (Phase 5: 3, Phase 6: 5), 3 deferred by external dependency (CLOVA key, signed URL TTL).
- AUTH-01 phone/SMS 드리프트 (이메일 4방식으로 대체, SMS는 v2).
- NOTIF-01 partial (Web Push 완성, SMS/FCM은 v2).
- `(worker)/my/schedule/page.tsx` Phase 1-legacy local MOCK 상수 (DATA-05 위반 아님, 실 DB wiring 권장).
- Stale Clerk TODO 주석 1건 (`api/push/register/route.ts`).

**Archived:**

- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`
- `.planning/milestones/v1.0-MILESTONE-AUDIT.md`

**Git tag:** `v1.0`

---
