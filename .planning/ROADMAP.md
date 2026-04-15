# Roadmap: GigNow (NJob)

**Core Value:** 이력서·면접 제로. 탭 하나로 확정, 근무 후 즉시 정산.

## Milestones

- ✅ **v1.0 Timee 모델 한국 MVP** — Phases 1–6 (shipped 2026-04-15)
- 📋 **v1.1+ Next Milestone** — TBD (run `/gsd-new-milestone`)

## Phases

<details>
<summary>✅ v1.0 Timee 모델 한국 MVP (Phases 1–6) — SHIPPED 2026-04-15</summary>

- [x] **Phase 1:** 목업 UI 파운데이션 — retroactive, completed 2026-04-10 (commit `55790d1`)
- [x] **Phase 2:** Supabase·Prisma·Auth 기반 — 9/9 plans, completed 2026-04-10 (commit `fb06dfd`)
- [x] **Phase 3:** 프로필·공고 DB 연결 — 6/6 plans, completed 2026-04-10 (commit `087874e`)
- [x] **Phase 4:** 지원·근무 라이프사이클 DB 연결 + 탐색 고도화 — 10/10 plans, completed 2026-04-11 (commits `be311af → 864e4e5`)
- [x] **Phase 5:** 리뷰·정산·목업 제거 — 7/7 plans, code complete 2026-04-11 (commit `d26e3bc`) — HUMAN-UAT 3 scenarios deferred
- [x] **Phase 6:** Admin Backoffice — 8/8 plans, code complete 2026-04-13 (commits `4cc274c`, `84869ab`) — HUMAN-UAT 5 pending + 3 deferred, DB migration apply pending

Archived:
- [.planning/milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) — full phase details
- [.planning/milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md) — 43 v1 requirements + 17 Phase 6 decisions
- [.planning/milestones/v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md) — `tech_debt` audit report

</details>

### 🚧 v1.1+ (Not yet planned)

Run `/gsd-new-milestone` to scope the next milestone — recommended first items:
- Apply pending Phase 6 DB migrations (`commissionRate`, `businessRegImageUrl`, `netEarnings`, `business-reg-docs` storage bucket).
- Execute 8 HUMAN-UAT scenarios from Phase 5 + Phase 6.
- Promote backlog Phase 999.1 (scout heart/notify) and/or 999.2 (Toss payments + business balance).
- Wire `/my/schedule` off remaining local MOCK constants (Phase 1 legacy).

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. 목업 UI 파운데이션 | v1.0 | N/A | Complete | 2026-04-10 |
| 2. Supabase·Prisma·Auth 기반 | v1.0 | 9/9 | Complete | 2026-04-10 (`fb06dfd`) |
| 3. 프로필·공고 DB 연결 | v1.0 | 6/6 | Complete | 2026-04-10 (`087874e`) |
| 4. 지원·근무 라이프사이클 DB 연결 | v1.0 | 10/10 | Complete | 2026-04-11 (`864e4e5`) |
| 5. 리뷰·정산·목업 제거 | v1.0 | 7/7 | Code Complete (HUMAN-UAT deferred) | 2026-04-11 (`d26e3bc`) |
| 6. Admin Backoffice | v1.0 | 8/8 | Code Complete (UAT pending, migration pending) | 2026-04-13 (`4cc274c`, `84869ab`) |

## Backlog

### Phase 999.1: B4 — 하트(관심)→사업장 알림 + 워커 수신함 (BACKLOG)

**Captured:** 2026-04-13
**Goal:** 사업자가 /biz/workers 인재검색에서 워커에게 하트(관심)를 누르면 (1) 해당 워커에게 푸시/인앱 알림 발송 (2) 워커 /my에 "나에게 관심 보인 사업장" 수신함 페이지. Timee의 '스카우트' 유사 기능.
**Requirements:** TBD (신규 `BusinessInterest` 테이블 신설 검토 — businessId, workerId, createdAt, seenAt)
**Scope hint:** Phase 4 Web Push 인프라 재사용. 워커 /my 하위 새 라우트 + 알림 생성 trigger + admin read-only view 고려.
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.2: B5 — 사업자 포인트(현금) 충전 + Toss 결제 연동 (BACKLOG)

**Captured:** 2026-04-13
**Goal:** 사업자가 선충전(포인트/현금)으로 잔액을 확보하고, 임금 지급·수수료가 해당 잔액에서 자동 차감되는 구조. 현재 Phase 6에서 수수료 rate 모델링은 끝남 — 실 결제/출금이 v2 본체.
**Requirements:** PAY-01..04 (v2)
**Scope hint:** Toss Payments 위젯 + 가상계좌/카드 결제 웹훅(`/api/webhooks/toss`) + `BusinessBalance` 테이블 + 거래 원장(ledger) + 포인트 소진·환불 플로우. 원천징수·전자세금계산서는 3.71% 영세율 적용 정책 확인 필수.
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

---

*Roadmap created: 2026-04-10 by /gsd-new-project (brownfield — Phase 1 retroactive)*
*v1.0 milestone archived: 2026-04-15 by /gsd-complete-milestone v1.0*
