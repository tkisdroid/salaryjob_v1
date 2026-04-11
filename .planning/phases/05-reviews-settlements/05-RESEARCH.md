# Phase 5: 리뷰·정산·목업 제거 — Research

**Researched:** 2026-04-11
**Domain:** Bilateral reviews + settlement aggregation + final mock removal (v1 exit gate)
**Confidence:** HIGH (primary sources: repo code-reading, Phase 4 VERIFICATION.md, bundled Next.js 16 docs, verified Prisma/Next versions)

---

## User Constraints (from CONTEXT.md)

### Locked Decisions (복사 — verbatim)

1. **Review timing**: Worker→Biz 리뷰는 체크아웃 성공 직후 작성 가능. Biz→Worker 리뷰는 Application이 `settled`로 전환된 직후(= 같은 시점)부터 작성 가능. 지연 윈도우·모더레이션 큐·"정산 대기" UX 없음.
2. **Settlement transition timing**: Phase 4의 `checkOut` Server Action 성공 = `Application.status` `confirmed → settled` 전환 + `earnings` 계산/락 **같은 트랜잭션**. 중간 `completed` 상태 없음. cron 정산 배치 없음. Phase 5는 Phase 4의 `checkOut`을 직접 수정/확장해야 함.
3. **Mock removal strategy**: **단일 최종 플랜** (Phase 5 마지막 플랜 = exit gate). 순서: REV + SETL을 먼저 실 DB로 구현 (mock-data.ts 잔존 상태) → 마지막 exit 플랜에서 grep → 대체 → 삭제 → 0-match 검증.
4. **Review tag schema**: 단일 하드코딩 태그 세트 per direction, 별도 테이블 아님. 저장: `String[]` 컬럼 on Review 모델 (Postgres `text[]`). 각 방향 ~8개 태그.
5. **Review↔Settlement coupling**: **Decoupled**. 리뷰는 정산의 전제조건이 절대 아님. 비리뷰어도 즉시 settled 상태/earnings 수령. "리뷰 작성하기" 배너는 UX nudge만.
6. **Review write-once**: Unique constraint `(applicationId, direction)` — 이미 schema에 정의되어 있음 (Phase 2 라인 209). Phase 5는 추가 스키마 변경 없이 이 제약을 활용.
7. **Rating aggregation**: 리뷰 insert 트랜잭션 내부에서 `(prev_rating * prev_count + new_stars) / (prev_count + 1)` 계산 후 `WorkerProfile.rating/reviewCount` 또는 `BusinessProfile.rating/reviewCount` 업데이트. Prisma interactive transaction 사용. pg trigger 대안 out-of-scope.
8. **Settlement aggregation scope**: Worker 총수입·이번 달 수입(KST), Biz 이번 달 지급·누적·정산 히스토리. 날짜 경계는 Asia/Seoul.
9. **UI-SPEC**: 별도 `/gsd-ui-phase 5` 없음. Phase 4 토큰 재사용. 신규 컴포넌트 4개: `star-rating-input`, `tag-chip-picker`, `review-form`, `settlement-card`.

### Claude's Discretion (연구/권장 가능 영역)

- Exact Prisma model shape for Review(s) — single vs split tables
- Whether to extend Phase 4's `checkOut` action in place or introduce a post-checkout hook
- Settlement pagination strategy (offset vs cursor)
- Whether to use a new DAL helper or extend existing `dal.ts`
- Minor UI polish (icons, micro-animations)
- Seed data for review/settlement fixtures in `prisma/seed.ts`

### Deferred Ideas (OUT OF SCOPE — ignore completely)

- Review editing / deletion after submission (v1: write-once)
- Review moderation, reporting, or admin view
- Review reply / thread
- Photo attachments to reviews
- Weekly/monthly settlement summary emails
- Toss Payments 실결제 (Phase 5도 mock — status flip만)
- 원천징수 3.3% 실계산
- Review 기반 매칭 정렬
- CSV export

---

## Phase Requirements

| ID | Description | Research Support |
|---|---|---|
| REV-01 | Worker가 Business 리뷰 (별점·태그·코멘트) 작성 | Prisma Review 모델 + ReviewDirection.worker_to_business 이미 존재. 신규 Server Action + `/my/applications/[id]/review` page. |
| REV-02 | Business가 Worker 리뷰 작성 | 동일 Review 모델 + ReviewDirection.business_to_worker. Biz UI: `/biz/posts/[id]/applicants/[applicantId]/review` page. |
| REV-03 | Application당 정확히 1회 (uniqueness) | `@@unique([applicationId, direction])` 이미 schema.prisma:209에 선언되어 있음. Server Action은 P2002 catch로 `already_reviewed` 매핑. |
| REV-04 | 리뷰 제출 시 대상 rating/reviewCount 자동 업데이트 | Prisma `$transaction` 인터랙티브 모드: Review insert + WorkerProfile/BusinessProfile update 원자 수행. |
| SETL-01 | pending → settled 전환 (mock 즉시 정산) | **Phase 4 checkOut 확장** — 새 enum value `settled` 추가 + checkOut 트랜잭션에서 `completed` 대신 `settled`로 바로 전환. |
| SETL-02 | Business가 정산 히스토리 (지급 완료/예정) 확인 | 신규 `getBizSettlements(userId, opts)` query + `/biz/settlements` 페이지 리라이트 (현재 Phase 1 mock HTML). |
| SETL-03 | 총수입·이번 달 수입 실데이터 집계 | 신규 `getWorkerSettlements(workerId, opts)` + `getWorkerSettlementTotals(workerId)` queries. KST 월 경계. |
| DATA-05 | `src/lib/mock-data.ts` 의존 경로 0개 | **이미 실질적으로 달성** (Phase 4 VERIFICATION.md 확인): `src/` 전체에서 실제 import 0건. 남은 작업: `prisma/seed.ts` 리팩터 + 파일 삭제 + comment reference 정리. |

---

## Executive Summary

1. **DATA-05은 거의 pre-satisfied 상태다.** Phase 4 VERIFICATION 및 직접 grep 결과, `src/` 내 `mock-data` 실제 import는 **0건**. 유일한 코드 consumer는 `prisma/seed.ts`이고, `src/lib/job-utils.ts`와 `src/lib/types/job.ts`는 **주석 내 언급만** 남았다. 삭제 exit 플랜은 대부분 수동 리팩터가 아닌 **(1) seed.ts 정리 + (2) 파일 삭제 + (3) 주석 정리 + (4) 자동 테스트로 grep 증명**의 4단계 체크리스트로 끝난다. **이 사실을 planner가 꼭 알고 exit 플랜 규모를 작게 잡아야 한다.**

2. **Review 모델은 이미 스키마에 존재한다.** `prisma/schema.prisma:195-211`에 `Review` 모델이 `@@unique([applicationId, direction])` 제약과 `tags String[]` 컬럼까지 이미 포함된 채 정의되어 있다 (Phase 2 시점에 선언). REV-03/REV-04는 스키마 변경 **없이** Server Action + rating aggregation 트랜잭션만 작성하면 된다. **단, rating 업데이트 시 `@db.Decimal(3,2)` 타입 주의.**

3. **SETL-01은 스키마 변경이 필요하다.** `ApplicationStatus` enum은 현재 `pending / confirmed / in_progress / checked_in / completed / cancelled` 6값. `settled`가 없다. Phase 5 스키마 확장: enum에 `settled` 추가 + Phase 4의 `checkOut` action이 현재 쓰는 `status='completed'`를 `status='settled'`로 변경 (= Phase 4 코드 수정). Prisma 7은 Postgres enum에 새 값을 뒤쪽에 append하므로 기존 데이터와 호환.

4. **Review tags는 `String[]`(= `text[]`) 컬럼이 이미 선언되어 있다.** Phase 5는 하드코딩 상수 리스트만 `src/lib/constants/review-tags.ts`에 추가하면 된다. DB 마이그레이션 불필요.

5. **Atomic rating aggregation은 Prisma `$transaction` 인터랙티브 모드 + `$executeRaw`로 해결.** Phase 4의 reject/cancel action에 검증된 패턴 (`await prisma.$transaction(async (tx) => { await tx.$executeRaw(...) })`) 그대로 재사용. **대안인 pg trigger는 CONTEXT에서 out-of-scope 명시됨.**

6. **checkOut 확장은 in-place 수정이 최선이다.** Phase 4의 `src/app/(worker)/my/applications/[id]/check-in/actions.ts`의 `checkOut` action은 이미 (1) JWT 검증, (2) 시간 윈도우, (3) actualHours/nightPremium/earnings 계산, (4) `prisma.application.update` — 이미 모든 경로가 한 함수 안에 있다. `status='completed'` 리터럴 한 줄을 `status='settled'`로 바꾸면 SETL-01 전환은 완료. **post-checkout 훅을 따로 만드는 건 불필요한 복잡도 + 원자성 위험.** Planner가 이 선택을 locked decision으로 잡아야 한다.

7. **Settlement queries는 Phase 4 checkOut의 이미-계산된 earnings를 재집계하기만 하면 된다.** `Application.earnings Int?`, `Application.checkOutAt DateTime?`, 새 `status='settled'` 조건으로 `SUM(earnings) WHERE workerId=? AND status='settled'` 단순 쿼리. KST 월 경계는 Asia/Seoul 고정 UTC+9 오프셋을 사용해 `date_trunc('month', checkOutAt AT TIME ZONE 'Asia/Seoul')` SQL로 처리.

8. **테스트 인프라는 Phase 4에서 완전히 구축됨.** `tests/applications/*`, `tests/shift/*`가 이미 실 Supabase 통합 테스트로 동작 (34 files / 109 tests PASS). Phase 5는 `tests/reviews/*`, `tests/settlements/*`, `tests/mock-removal/*` 디렉토리만 추가하면 된다 — vitest 설정 변경 불필요.

**Primary recommendation:**

Phase 5는 **스키마 미니멀 확장 (1 enum value) + 3개 Server Action 파일 + 2개 query 파일 + 4개 UI 컴포넌트 + checkOut 한 줄 수정 + seed.ts 리팩터 + mock-data.ts 삭제**로 끝난다. 전체 규모는 Phase 4의 30-40% 수준. **가장 큰 위험은 분산된 낙관적 추정이 아니라 "왜 생각보다 쉬운지"를 몰라 과하게 플랜 쪼개는 것.**

---

## Project Constraints (from CLAUDE.md / AGENTS.md)

**CLAUDE.md 명시 directives (모두 유지해야 함):**

- Next.js 16 + React 19 + Prisma 7 + Supabase (DB+Auth) 스택 고정 — 변경 금지 [CITED: CLAUDE.md Constraints]
- **AGENTS.md의 경고: "This is NOT the Next.js you know"** — `node_modules/next/dist/docs/`를 코드 작성 전 읽어야 함. 학습 데이터의 Next API는 최신과 다를 수 있음 [CITED: AGENTS.md]
- Phase 5 종료 시 `src/lib/mock-data.ts` 의존 경로 0개 필수 (exit gate) [CITED: CLAUDE.md]
- UX 원칙: "면접 없음·당일 근무·즉시 정산" 3축 위배 금지 — **Phase 5는 특히 "즉시 정산" 축을 코드로 고정하는 단계. 리뷰 의존 정산 절대 금지** [CITED: CLAUDE.md]
- 한국어 UI, 에러 메시지 포함 [CITED: CLAUDE.md Conventions]
- Kebab-case 파일명, Server Components 기본, `"use client"` 명시 [CITED: CLAUDE.md Component Conventions]
- Zod 스키마로 서버 입력 검증 [CITED: CLAUDE.md Quality Patterns]
- Server Actions: `*-actions.ts` 네이밍, `{success, error}` 판별 유니언 리턴 [CITED: CLAUDE.md Server Actions]
- 한국어 응답 언어 (사용자 커뮤니케이션) [CITED: user memory]
- 작업 완료 시 GitHub 자동 push 사전 승인 [CITED: user memory]

**Next.js 16 breaking changes 주의 항목 (Phase 5 관련):**

- **`params`와 `searchParams`는 Promise** — `export default async function Page({ params }: { params: Promise<{ id: string }> })`로 선언 후 `const { id } = await params` 필수 [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md] — Phase 5 신규 페이지 `/my/applications/[id]/review`, `/biz/posts/[id]/applicants/[applicantId]/review`가 해당.
- `cookies()`, `headers()`도 async — Phase 5 Server Actions는 `dal.ts`의 `verifySession`을 통하므로 직접 호출 안 함, 문제 없음.
- `proxy.ts` (Next 16, 이전 `middleware.ts`) 이미 Phase 2에서 마이그레이션 완료 [VERIFIED: Phase 2-03 summary].

---

## Standard Stack

### Already installed (재사용)

| Library | Version | Purpose | Why Standard |
|---|---|---|---|
| Next.js | 16.2.1 | App Router, Server Actions, Server Components | Project-locked [VERIFIED: package.json] |
| React | 19.2.4 | Server/Client components | Project-locked [VERIFIED: package.json] |
| Prisma | 7.5.0 (local installed) | ORM, `$transaction`, `$executeRaw`, `@db.Decimal(3,2)` | Project-locked. Phase 4 검증된 패턴 재사용 [VERIFIED: package.json]. Latest on npm registry: 7.7.0 [VERIFIED: `npm view prisma version`] — Phase 5에서 업그레이드는 scope 밖 (버그 리스크). |
| @prisma/client | 7.5.0 | Generated client at `src/generated/prisma` | Same [VERIFIED: package.json] |
| @prisma/adapter-pg | ^7.5.0 | Supabase connection pooling | Project-locked [VERIFIED: package.json] |
| Zod | ^4.3.6 | Runtime validation of Server Action inputs | Phase 4에서 모든 action의 input schema로 사용 — Phase 5 리뷰/정산 action도 동일 패턴 [VERIFIED: `src/lib/validations/application.ts`] |
| React Hook Form | ^7.72.0 | `review-form.tsx` 클라이언트 폼 상태 | CLAUDE.md 명시 [CITED: CLAUDE.md] |
| @hookform/resolvers | ^5.2.2 | zod resolver | [CITED: CLAUDE.md] |
| shadcn/ui shims | — | Dialog, Card, Button — Phase 4에서 도입 | [CITED: CONTEXT.md] |
| sonner | — | Toast 성공/실패 피드백 | Phase 4에서 도입 [CITED: CONTEXT.md] |
| lucide-react | ^1.7.0 | 아이콘 (Star, Wallet, CheckCircle 등) | [VERIFIED: existing imports in `/my/settlements/page.tsx`] |
| date-fns | ^4.1.0 | 한국어 날짜 포맷 (Phase 5는 주로 Asia/Seoul 월 경계) | [VERIFIED: package.json] |

### NEW for Phase 5

**None.** 신규 npm 의존성 설치 없음. 전부 기존 스택으로 구현 가능.

### Alternatives Considered (NOT recommended)

| Instead of | Could Use | Tradeoff | Verdict |
|---|---|---|---|
| Interactive `$transaction` (rating update) | pg trigger on `reviews` insert | DB 레벨 원자성 강화 | **CONTEXT에서 명시적 거부** — "keep it in app code for testability" [CITED: 05-CONTEXT.md] |
| Interactive `$transaction` | `prisma.application.update` + separate `prisma.workerProfile.update` | 코드 간결 | **부적합** — 두 쿼리 사이 race 가능, rating drift 위험 |
| Cursor pagination (settlement list) | offset pagination (`.skip().take()`) | 구현 간결 | **권장: offset** — 정산 레코드는 월별 보기 기본, cursor 복잡도 불필요. Phase 3 job list가 cursor인 이유는 "최신순 무한 스크롤" 요구사항 때문이고 정산 목록은 그렇지 않음 |
| 신규 DAL 헬퍼 `requireReviewPermission` | 기존 `requireApplicationOwner` 재사용 + 인라인 direction/status 체크 | 코드 중복 vs 추가 추상화 | **권장: 재사용** — Phase 4 패턴. 새 헬퍼는 1곳에서만 쓰이면 YAGNI |

**Version verification commands executed:**

```bash
npm view prisma version            → 7.7.0 (local: 7.5.0, no upgrade needed)
npm view @prisma/client version    → 7.7.0 (same)
```

Latest Prisma 7.7.0은 로컬 7.5.0과 minor 차이이며 Phase 4에서 검증된 `$transaction` / `$executeRaw` / `Prisma.Decimal` / `@db.Decimal` API가 변경되지 않았음 [VERIFIED: 직접 확인한 Phase 4 사용처 동작 중]. Phase 5 업그레이드 금지.

---

## Architecture Patterns

### Recommended File Structure

```
src/
├── app/
│   ├── (worker)/my/
│   │   ├── applications/[id]/review/
│   │   │   ├── page.tsx                  # NEW — 이미 디렉토리 존재 (Phase 1 mock 페이지가 있을 수 있음 → 재작성)
│   │   │   ├── review-form.tsx           # 'use client' — 별점+태그+텍스트
│   │   │   └── actions.ts                # NEW — createWorkerReview Server Action
│   │   └── settlements/
│   │       └── page.tsx                  # REWRITE — 현재 getApplications 기반, settlementStatus 하드코딩 null
│   └── biz/
│       ├── posts/[id]/applicants/[applicantId]/review/
│       │   ├── page.tsx                  # NEW or REWRITE — 이미 디렉토리 존재
│       │   ├── review-form.tsx           # 'use client' — biz side
│       │   └── actions.ts                # NEW — createBusinessReview Server Action
│       └── settlements/
│           └── page.tsx                  # REWRITE — 현재 하드코딩된 Phase 1 mock HTML
├── components/ui/
│   ├── star-rating-input.tsx             # NEW — interactive 5-star picker
│   └── tag-chip-picker.tsx               # NEW — multi-select chip group
├── components/worker/
│   ├── settlement-card.tsx               # NEW — 정산 목록 리스트 아이템
│   └── review-prompt-banner.tsx          # NEW — "리뷰 작성하기" persistent nudge
├── lib/
│   ├── constants/
│   │   └── review-tags.ts                # NEW — 하드코딩 태그 세트 2방향
│   ├── validations/
│   │   └── review.ts                     # NEW — Zod schemas
│   ├── errors/
│   │   └── review-errors.ts              # NEW — ReviewError + Korean mapper
│   └── db/
│       └── queries.ts                    # EXTEND — getWorkerSettlements, getBizSettlements, getSettlementTotals, getReviewableApplications
└── app/(worker)/my/applications/[id]/check-in/
    └── actions.ts                        # MODIFY — checkOut: 'completed' → 'settled' (한 줄)

prisma/
├── schema.prisma                         # MODIFY — ApplicationStatus enum +settled (한 줄)
└── seed.ts                               # REFACTOR — mock-data.ts import 제거, 상수 인라인

src/lib/mock-data.ts                      # DELETE (exit plan 마지막 단계)
```

### Pattern 1: Atomic Review + Rating Aggregation (`$transaction` interactive)

**What:** 단일 트랜잭션 내에서 Review row insert + 대상 profile의 rating/reviewCount 업데이트.

**When to use:** REV-01, REV-02, REV-04 (모든 리뷰 생성 경로).

**Example (Phase 4 검증된 패턴 확장):**
```ts
// src/app/(worker)/my/applications/[id]/review/actions.ts
"use server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireApplicationOwner } from "@/lib/dal";
import { ReviewError } from "@/lib/errors/review-errors";
import { createWorkerReviewSchema } from "@/lib/validations/review";
import { safeRevalidate } from "@/lib/safe-revalidate";

export async function createWorkerReview(
  input: unknown,
): Promise<{ success: true; reviewId: string } | { success: false; error: string }> {
  const parsed = createWorkerReviewSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "invalid_input" };
  const { applicationId, rating, tags, comment } = parsed.data;

  const { session, application } = await requireApplicationOwner(applicationId);
  // Gate: only settled applications are reviewable (decoupling — UX can prompt earlier,
  // but DB-level must enforce that you only review a shift that actually happened).
  if (application.status !== "settled") {
    return { success: false, error: "not_settled" };
  }

  try {
    const reviewId = await prisma.$transaction(async (tx) => {
      // 1. Insert Review row — relies on @@unique([applicationId, direction]) for write-once.
      //    P2002 unique violation → map to already_reviewed.
      const job = await tx.job.findUnique({
        where: { id: application.jobId },
        select: { businessId: true, authorId: true, business: { select: { userId: true } } },
      });
      if (!job) throw new ReviewError("invalid_state");

      const review = await tx.review.create({
        data: {
          applicationId: application.id,
          reviewerId: session.id,
          revieweeId: job.authorId, // Biz owner = reviewee
          direction: "worker_to_business",
          rating,
          tags,
          comment: comment ?? null,
        },
      });

      // 2. Atomically update BusinessProfile.rating (Decimal(3,2)) + reviewCount.
      //    Use $executeRaw with SQL CASE to avoid a read-then-write race even
      //    inside the transaction (Postgres row-lock on UPDATE guarantees atomicity).
      await tx.$executeRaw(Prisma.sql`
        UPDATE public.business_profiles
        SET
          rating = ROUND(
            (("rating" * "reviewCount") + ${rating}) / ("reviewCount" + 1),
            2
          )::numeric(3, 2),
          "reviewCount" = "reviewCount" + 1,
          "updatedAt" = now()
        WHERE "id" = ${job.businessId}::uuid
      `);

      // 3. Flip Application.reviewGiven = true (already has this column per schema:184).
      await tx.application.update({
        where: { id: application.id },
        data: { reviewGiven: true },
      });

      return review.id;
    });

    safeRevalidate(`/my/applications/${applicationId}`);
    safeRevalidate("/my/settlements");
    return { success: true, reviewId };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { success: false, error: "already_reviewed" };
    }
    if (e instanceof ReviewError) return { success: false, error: e.code };
    console.error("[createWorkerReview]", e);
    return { success: false, error: "unknown" };
  }
}
```

**Key points:**
- `$transaction(async (tx) => {...})` interactive mode 사용 — Phase 4 `rejectApplication`과 정확히 동일한 shape [VERIFIED: `src/app/biz/posts/[id]/applicants/actions.ts:141`].
- `@db.Decimal(3, 2)` column에 대해 `ROUND(..., 2)::numeric(3, 2)` 캐스팅 필수 — 그렇지 않으면 Prisma가 Decimal 읽기 시 precision 에러 가능.
- P2002 catch는 Prisma 공식 문서에서 unique constraint violation 에러 코드 [CITED: Prisma 공식 error reference — `P2002` = "Unique constraint failed on the {constraint}"]. **[ASSUMED]** Phase 4에서 이 코드가 실제로 Prisma 7.5에서 동일하게 유지되는지는 Phase 4 tests에서는 재현되지 않았음 — 코드 작성 후 통합 테스트로 확인 필요.
- `reviewGiven` / `reviewReceived` boolean은 `Application` 모델에 이미 존재 (schema.prisma:184-185) — UI 리렌더용, 실제 source of truth는 Review row 존재 여부.

### Pattern 2: In-place `checkOut` Status Extension (SETL-01)

**What:** Phase 4의 `checkOut` Server Action 한 줄 수정.

**Current code (line 211-216 of `src/app/(worker)/my/applications/[id]/check-in/actions.ts`):**
```ts
await prisma.application.update({
  where: { id: applicationId },
  data: {
    status: "completed",           // ← CHANGE to "settled"
    checkOutAt,
    actualHours: new Prisma.Decimal(actualHours),
    earnings,                       // ← already locked at this write
  },
});
```

**Proposed change:**
```ts
await prisma.application.update({
  where: { id: applicationId },
  data: {
    status: "settled",              // SETL-01 — Phase 5
    checkOutAt,
    actualHours: new Prisma.Decimal(actualHours),
    earnings,                       // locked
  },
});
```

**Why in-place (not a hook):**
- 원자성: 이미 한 `prisma.application.update` 호출 안에 `earnings` + `actualHours` + `status`가 쓰이고 있음. `completed → settled` 중간 상태를 도입하는 건 불필요한 복잡도.
- Phase 4의 checkOut은 이미 `requireApplicationOwner`, state gate, time window, geofence, JWT 검증 5개 게이트를 통과한 후 실행됨 → 정산 조건 충족 증명.
- **단점**: Phase 4의 `checkOut` 코드를 수정하므로 Phase 4 tests (checkOut-jwt, earnings)를 회귀 테스트해야 함. 하지만 status 문자열 한 줄 변경이라 영향 최소.

**Collateral changes required:**
1. `DONE_STATUSES` in `src/lib/db/queries.ts:844` — 현재 `["completed"]`. Phase 5에서 `["settled", "completed"]`로 변경. 이유: legacy `completed` rows가 있을 수 있고 (테스트 시드 포함), /my/applications 완료 탭이 둘 다 보여야 함. 또는 마이그레이션에서 기존 `completed` → `settled` 일괄 변환.
2. `STATUS_TO_BUCKET` in `src/lib/types/job.ts:82` — `settled: "done"` 추가.
3. `ApplicationStatus` UI type union — `settled` 추가.
4. Phase 4 `tests/shift/earnings.test.ts` 및 checkOut 통합 테스트: 결과 검증 assertion에서 `status: 'completed'` → `status: 'settled'`.
5. `adaptApplication` in `queries.ts:115` — `settlementStatus: null` 하드코딩 제거, `settlementStatus: row.status === 'settled' ? 'settled' : null` 유도.

### Pattern 3: Settlement Queries with Asia/Seoul Month Boundary

**What:** Server-side aggregation of settled application earnings with KST timezone.

**When to use:** SETL-02, SETL-03.

**Example:**
```ts
// src/lib/db/queries.ts (new section)

/**
 * SETL-03: Worker 정산 요약 (총수입 + 이번 달 수입 + 건수)
 * KST month boundary via `AT TIME ZONE 'Asia/Seoul'`.
 * Korea has no DST → safe fixed offset.
 */
export async function getWorkerSettlementTotals(workerId: string) {
  const rows = await prisma.$queryRaw<
    { all_time_total: bigint; all_time_count: bigint;
      this_month_total: bigint; this_month_count: bigint }[]
  >`
    SELECT
      COALESCE(SUM(earnings), 0)::bigint AS all_time_total,
      COUNT(*)::bigint AS all_time_count,
      COALESCE(SUM(
        CASE WHEN date_trunc('month', "checkOutAt" AT TIME ZONE 'Asia/Seoul')
                = date_trunc('month', now() AT TIME ZONE 'Asia/Seoul')
             THEN earnings ELSE 0 END
      ), 0)::bigint AS this_month_total,
      COUNT(*) FILTER (
        WHERE date_trunc('month', "checkOutAt" AT TIME ZONE 'Asia/Seoul')
            = date_trunc('month', now() AT TIME ZONE 'Asia/Seoul')
      )::bigint AS this_month_count
    FROM public.applications
    WHERE "workerId" = ${workerId}::uuid
      AND status = 'settled'::"ApplicationStatus"
  `;
  const r = rows[0]!;
  return {
    allTimeTotal: Number(r.all_time_total),
    allTimeCount: Number(r.all_time_count),
    thisMonthTotal: Number(r.this_month_total),
    thisMonthCount: Number(r.this_month_count),
  };
}

/**
 * SETL-02/03: Paginated settlement list for worker (offset-based).
 */
export async function getWorkerSettlements(
  workerId: string,
  opts: { page?: number; limit?: number; month?: "this" | "all" } = {},
) {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const monthFilter =
    opts.month === "this"
      ? { checkOutAt: { not: null } }  // refined below in raw SQL if needed
      : {};

  const rows = await prisma.application.findMany({
    where: {
      workerId,
      status: "settled",
      ...monthFilter,
    },
    include: { job: { include: { business: true } } },
    orderBy: { checkOutAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });
  return rows;
}

/**
 * SETL-02: Business 정산 목록 — 자기 Job들에 대한 settled Application 리스트.
 * 이번 달 / 전체 지급액 포함.
 */
export async function getBizSettlements(
  userId: string,
  opts: { page?: number; limit?: number } = {},
) {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const rows = await prisma.application.findMany({
    where: {
      status: "settled",
      job: { authorId: userId },
    },
    include: {
      job: { include: { business: true } },
      worker: { include: { workerProfile: true } },
    },
    orderBy: { checkOutAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });
  return rows;
}
```

**Why raw SQL for totals, ORM for list:**
- 집계 (`SUM`, `COUNT FILTER`, `AT TIME ZONE`)는 `prisma.application.aggregate()`로 KST 월 경계를 표현할 수 없음 — `AT TIME ZONE`은 Postgres 함수이고 Prisma Client는 JS Date 비교만 제공.
- 리스트는 관계 포함 쿼리가 단순 → `findMany`의 `include` 사용이 가독성 좋음.

### Pattern 4: Recommended Indexes (for settlement queries)

```sql
-- Supabase migration (Phase 5 첫 wave)
CREATE INDEX IF NOT EXISTS "applications_workerId_status_checkOutAt_idx"
  ON public.applications ("workerId", status, "checkOutAt" DESC);

-- Biz side requires JOIN on jobs.authorId — composite index via job authorId
-- Not directly possible on applications table. Alternative: partial index.
CREATE INDEX IF NOT EXISTS "applications_status_settled_checkOutAt_idx"
  ON public.applications (status, "checkOutAt" DESC)
  WHERE status = 'settled';
```

**Why:**
- Worker dashboard 쿼리: `WHERE workerId=? AND status='settled' ORDER BY checkOutAt DESC` — composite index가 정확히 이 shape.
- Biz dashboard는 `jobs` JOIN 필요 — `applications` 쪽은 partial index, `jobs.authorId`는 이미 schema index.
- 현재 `schema.prisma:190`에는 `@@index([workerId, status])`만 존재 — `checkOutAt` 정렬까지 인덱스로 커버하려면 Phase 5에서 확장 필요. `prisma db push`로 배포 가능 (Phase 4와 동일 워크플로).

### Anti-Patterns to Avoid

- **리뷰 완료를 정산 전제조건으로 만들기** — Timee UX 3축 위배, CONTEXT에서 명시적 금지. UI flow에서 "리뷰 작성 후 정산 확인" 순서를 시각적으로 보여주더라도 **DB 레벨 gate 금지**.
- **Rating을 애플리케이션 레벨에서 가중평균 재계산** — `JOIN reviews → AVG(rating) → UPDATE profile` 패턴은 리뷰가 많아지면 O(N) 스캔. Phase 5의 incremental update (`(prev*count + new)/(count+1)`)가 O(1).
- **Rating을 쓰기 시점 아닌 읽기 시점에 집계** — Worker/Biz 프로필 페이지마다 리뷰 집계 쿼리가 돌면 N+1. Phase 5는 incremental로 프로필 컬럼에 저장 → 읽기는 컬럼 하나.
- **post-checkout 훅 / after() / background worker로 status 전환** — Phase 4 checkOut이 이미 단일 트랜잭션. 훅을 붙이면 partial failure시 unsettled earning 상태 발생 가능.
- **Review 코멘트에 길이 제한 없이** — T-05 DoS 위험. Zod `z.string().max(500)` 최소.

---

## Data Layer Patterns

### Review Server Action Signatures (Zod contracts)

```ts
// src/lib/validations/review.ts
import { z } from "zod";

export const createWorkerReviewSchema = z.object({
  applicationId: z.string().uuid("올바른 지원 ID가 필요합니다"),
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.string()).max(8).default([]),
  comment: z.string().max(500).optional(),
});

export const createBusinessReviewSchema = createWorkerReviewSchema;
// Same shape — direction is inferred from Server Action file, not client input.
```

### Review Query Extensions

```ts
// src/lib/db/queries.ts — append section "Review queries (Phase 5)"

/** Fetch existing review by application + direction (idempotent check for UI). */
export async function getReviewByApplication(
  applicationId: string,
  direction: "worker_to_business" | "business_to_worker",
) {
  return prisma.review.findUnique({
    where: { applicationId_direction: { applicationId, direction } },
    // ↑ Prisma composite unique accessor — generated from @@unique([applicationId, direction])
    include: { reviewer: true, reviewee: true },
  });
}

/** Reviews aimed at a specific user (받은 리뷰). Used by profile pages. */
export async function getReviewsForUser(
  revieweeId: string,
  opts: { limit?: number } = {},
) {
  return prisma.review.findMany({
    where: { revieweeId },
    include: { reviewer: true, application: { include: { job: true } } },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 20,
  });
}
```

**Note:** Prisma 7 composite unique accessor 문법은 `where: { <field1>_<field2>: {...} }`. Schema의 `@@unique([applicationId, direction])`가 자동으로 `applicationId_direction` 키를 생성. [VERIFIED: `src/generated/prisma/models/Review.ts:997-1011` — `findUnique` signature generated with this accessor].

### DAL Helper Decision (Claude Discretion)

**권장: 기존 `requireApplicationOwner` / `requireJobOwner` 재사용 + inline review permission checks.** 이유:

- Phase 4에서 이미 작동 검증된 redirect-on-fail 패턴. 새로 만든 `requireReviewPermission`은 1-2곳에서만 쓰여 YAGNI 위반.
- Review 권한 로직은 단순: `application.status === 'settled'` + `application.workerId === session.id` (worker side) 또는 `job.authorId === session.id` (biz side). `requireApplicationOwner`/`requireJobOwner`가 이미 소유권 검증 완료 → Phase 5 action은 인라인으로 `if (status !== 'settled') return {...}` 한 줄 추가.

### Error Taxonomy

```ts
// src/lib/errors/review-errors.ts
export type ReviewErrorCode =
  | "invalid_input"
  | "not_settled"         // Application이 settled 상태 아님
  | "already_reviewed"    // P2002 from unique constraint
  | "invalid_state"       // 관련 row 없음 등
  | "unknown";

export const reviewErrorToKorean = (code: ReviewErrorCode): string => {
  switch (code) {
    case "invalid_input":    return "입력값을 확인해주세요";
    case "not_settled":      return "아직 정산 완료되지 않은 지원은 리뷰할 수 없습니다";
    case "already_reviewed": return "이미 리뷰를 작성했습니다";
    case "invalid_state":    return "리뷰를 작성할 수 없는 상태입니다";
    case "unknown":          return "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요";
  }
};

export class ReviewError extends Error {
  constructor(public code: ReviewErrorCode) {
    super(code);
    this.name = "ReviewError";
  }
}
```

Phase 4의 `application-errors.ts`와 동일 패턴 — exhaustive switch가 새 variant 추가시 컴파일 에러 유발.

---

## Settlement Integration

### Phase 4 checkOut Current State

**File**: `src/app/(worker)/my/applications/[id]/check-in/actions.ts` (lines 136-229)

**Flow (검증된 상태):**
```
checkOut(applicationId, qrToken)
├── requireApplicationOwner (redirects on 404/403)
├── state guard: application.status === 'in_progress'
├── state guard: application.checkInAt is set
├── fetch Job (workDate/startTime/hourlyPay/transportFee)
├── time window: isWithinCheckOutWindow
├── JWT: verifyCheckoutToken → payload.jobId/businessId match
├── compute actualHours / nightPremium / earnings (pure functions)
└── prisma.application.update({
      status: 'completed',       ← Phase 5 수정 포인트
      checkOutAt,
      actualHours: Prisma.Decimal,
      earnings,
    })
```

### Phase 5 Minimal Extension

**Change 1 (schema.prisma):** ApplicationStatus enum에 `settled` 추가.
```prisma
enum ApplicationStatus {
  pending
  confirmed
  in_progress
  checked_in
  completed     // legacy — retained for historical rows, Phase 5 removal after data migration
  settled       // NEW Phase 5 — replaces 'completed' for new checkouts
  cancelled
}
```

**Change 2 (check-in/actions.ts line 212):** `status: 'completed'` → `status: 'settled'`. That's it for SETL-01.

**Change 3 (queries.ts DONE_STATUSES line 844):** `["completed"]` → `["settled", "completed"]`.
Rationale: seed-generated fixtures may still produce `completed`. New real checkouts produce `settled`. Both must show in "완료" tab until a one-time migration (optional) collapses them. **Planner decision**: include migration `UPDATE applications SET status='settled' WHERE status='completed'` as a separate migration if fully consolidating — but Phase 1 mock data is gone by exit plan, so seed.ts can emit `settled` directly after refactor.

**Change 4 (types/job.ts line 74-91):** Add `settled` to `ApplicationStatus` UI union and `STATUS_TO_BUCKET`:
```ts
export type ApplicationStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "settled"      // NEW
  | "completed"    // legacy, still shown in done bucket
  | "cancelled";

export const STATUS_TO_BUCKET: Record<ApplicationStatus, "upcoming" | "active" | "done"> = {
  pending: "upcoming",
  confirmed: "upcoming",
  in_progress: "active",
  settled: "done",    // NEW
  completed: "done",
  cancelled: "done",
};
```

**Change 5 (queries.ts adaptApplication line 115-125):** `settlementStatus` 하드코딩 `null` 제거:
```ts
settlementStatus: a.status === "settled" ? "settled" : null,
settledAt: a.status === "settled" && a.checkOutAt ? a.checkOutAt.toISOString() : null,
```

Rationale: 현재 UI (`/my/settlements/page.tsx:36`)가 `a.settlementStatus === 'settled'`로 필터링 중. Phase 5 변경 후 별도 컬럼 추가 없이 status에서 파생 → 스키마 변경 최소화.

**Change 6 (Phase 4 회귀 테스트):** `tests/shift/*.test.ts`에서 checkOut assertion이 `status: 'completed'`를 기대하는 곳 grep → `status: 'settled'`로 업데이트. **확인 필요**: VERIFICATION.md 기준 checkout JWT/earnings 테스트는 pure functions 대상이라 status 비교가 있는지 불확실. Planner가 실제 test files 직접 확인 후 업데이트 범위 결정.

### Why NOT a separate "complete-application" helper

CONTEXT의 Claude Discretion 항목 "Whether to extend Phase 4's `checkOut` action in place or introduce a post-checkout hook"에 대한 **확정 권장**:

| Option A (In-place 수정) | Option B (별도 helper / 훅) |
|---|---|
| 한 줄 변경 | 새 파일 + import + 호출 순서 관리 |
| 원자성 보장 (이미 한 update 안) | 훅 실패 시 partial state 위험 (settled인지 completed인지 불명확) |
| Phase 4 회귀 1-2개 | Phase 4 코드 재구조화 → 더 넓은 회귀 면적 |
| 테스트 변경 최소 | 새 helper unit test + 기존 테스트 전부 수정 |

**선택: Option A.** Planner가 첫 계획 노트에 "settlement 확장은 Phase 4 checkOut in-place 수정, post-checkout 훅 금지"를 lock으로 기록할 것.

---

## Mock Removal Inventory

### Current State of `src/lib/mock-data.ts` (verified 2026-04-11)

**File size:** 767 lines, ~21KB [VERIFIED: Phase 4 VERIFICATION.md].

**Exports:**

| Export | Type | Production Usage (within src/) | Production Usage (repo-wide) | Action Required |
|---|---|---|---|---|
| `JobCategory` (type) | type alias | **0 imports** — `src/lib/types/job.ts`에 이미 재정의됨 | `prisma/seed.ts` 경유 X | 삭제 (types/job.ts에서 대체) |
| `MockBusiness`, `MockJob`, ... (interfaces) | type aliases | **0 imports** — types/job.ts에 `MockJob = Job` 등 backward-compat alias로 재정의 | 0 | 삭제 |
| `MOCK_BUSINESSES` (array, 8 items) | const | **0 imports in src/** | `prisma/seed.ts:20` | seed.ts에서 인라인 or 별도 `prisma/seed-data.ts`로 이동 |
| `MOCK_JOBS` (array, 8 items) | const | **0** | `prisma/seed.ts:21` | 동일 |
| `MOCK_APPLICATIONS` (array, 5 items) | const | **0** | `prisma/seed.ts:22` | 동일 |
| `MOCK_CURRENT_WORKER` (object) | const | **0** | `prisma/seed.ts:23` | 동일 |
| `MOCK_REVIEWS` (array, 3 items) | const | **0** | 0 (not imported anywhere) | 삭제 (dead code) |
| `MOCK_BIZ_APPLICANTS` (array, 4 items) | const | **0** | 0 | 삭제 (dead code) |
| `getJobById(id)`, `getBusinessById(id)`, `getJobsByCategory`, `getUrgentJobs`, `getTodayJobs` | functions | **0** — `src/lib/db/queries.ts`에 real DB equivalent 존재 | 0 | 삭제 |
| `calculateEarnings(job)` | function | **0** — `src/lib/job-utils.ts`에 overload로 이미 재구현됨 | 0 | 삭제 |
| `formatWorkDate(iso)` | function | **0** — `src/lib/job-utils.ts:95`에 이미 재구현됨 | 0 | 삭제 |
| `categoryLabel`, `categoryEmoji` | functions | **0** — `job-utils.ts`에 이미 재구현됨 | 0 | 삭제 |
| `getBizApplicantById` | function | **0** — `queries.ts:350`에 real DB equivalent 존재 | 0 | 삭제 |

**Key insight:** 모든 production export는 이미 대체 구현을 가지고 있다. `mock-data.ts`는 **사실상 dead code** + seed.ts의 data source 역할만 남았다.

### Consumer Surface

**src/ imports (verified via grep `from ['"](@|\\.)/.*mock-data['"]`)**: **0 matches**. [VERIFIED: Phase 4 VERIFICATION.md + 직접 확인 2026-04-11]

**Non-src consumers:**
1. `prisma/seed.ts:20-24` — imports `MOCK_BUSINESSES, MOCK_JOBS, MOCK_APPLICATIONS, MOCK_CURRENT_WORKER` from `../src/lib/mock-data`. **유일한 코드 consumer.**
2. Comment references (주석 언급, import 아님):
   - `src/lib/job-utils.ts:3` — "Copied (not moved) from mock-data.ts so that seed.ts keeps working."
   - `src/lib/types/job.ts:3` — "These are copied (not moved) from mock-data.ts ..."
   - `src/lib/types/job.ts:150` — "Backward-compat aliases (allow consumer files to still reference Mock* names)"
   - `src/generated/prisma/internal/class.ts:248` — generated file, comment only (irrelevant — `src/generated/` excluded from grep)
3. Documentation references (`.planning/**`, CLAUDE.md) — out of scope (exit gate excludes `.planning`).

### Exit Plan Migration Checklist

```
STEP 1 — Refactor prisma/seed.ts
  [ ] Remove `import { ... } from "../src/lib/mock-data"`
  [ ] Option A: Inline the 4 arrays directly into seed.ts (preferred — single file)
  [ ] Option B: Move arrays to new `prisma/seed-data.ts` (no dependency on src/)
  [ ] Update MOCK_APPLICATIONS data: status 'confirmed' → 'settled' for completed past jobs
      so new seeds match Phase 5 status enum
  [ ] Verify seed runs: `npm run db:seed` produces no import errors
  [ ] Verify seed creates expected rows in Supabase (count check)

STEP 2 — Clean up src/ comment references
  [ ] Edit src/lib/job-utils.ts:3 comment to remove "from mock-data.ts" mention
  [ ] Edit src/lib/types/job.ts:3 comment to remove "Copied from mock-data.ts" mention
  [ ] Edit src/lib/types/job.ts:150 comment: drop "Mock*" alias section entirely
      (no one uses MockJob = Job anymore after STEP 3)

STEP 3 — Delete the file
  [ ] rm src/lib/mock-data.ts
  [ ] npm run build — verify no import errors
  [ ] npm test — verify no test failures

STEP 4 — Grep verification (automated test assertion)
  [ ] Write tests/mock-removal/exit-gate.test.ts with the exact grep assertion below
  [ ] Verify test passes locally
  [ ] Include in Phase 5 e2e verification plan

STEP 5 — Update DATA-05 traceability
  [ ] REQUIREMENTS.md: mark DATA-05 as Completed
  [ ] STATE.md: update exit criterion status
  [ ] ROADMAP.md: mark Phase 5 complete (after all other requirements)
```

**Scope note:** Out of all 5 steps, only STEP 1 (seed.ts refactor) involves non-trivial logic. STEPS 2-5 are mechanical. **Exit plan 전체가 1개의 작은 wave에 들어갈 수 있음** — planner는 이걸 과하게 쪼개지 말 것.

---

## Mock Removal Verification

### Machine-checkable grep command

```bash
# Exit criterion: this command MUST return exit code 1 (= no matches).
# If it prints any line OR returns 0, Phase 5 is not complete.
grep -rn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  -E "from ['\"](@/lib/mock-data|\\.\\.?/.*mock-data)['\"]" \
  src/ \
  --exclude-dir=generated
```

**Key flags explained:**
- `-r`: recursive
- `-n`: line numbers (for human debugging when it fails)
- `--include='*.ts' ...`: limit to source files only
- `-E`: extended regex for the alternation
- Pattern: matches `from "@/lib/mock-data"` OR `from "./mock-data"` OR `from "../lib/mock-data"` etc.
- `src/`: search root (excludes `.planning`, `prisma`, docs)
- `--exclude-dir=generated`: skips `src/generated/prisma/**` false positives
- Exit code: grep returns 0 if any match found, 1 if none — we want 1

### Automated test assertion (Vitest)

```ts
// tests/mock-removal/exit-gate.test.ts
import { execSync } from "node:child_process";
import { describe, it, expect } from "vitest";

describe("DATA-05: mock-data.ts exit gate", () => {
  it("src/lib/mock-data.ts file does not exist", async () => {
    const fs = await import("node:fs/promises");
    await expect(fs.stat("src/lib/mock-data.ts")).rejects.toThrow(/ENOENT/);
  });

  it("zero src/ imports of mock-data", () => {
    let matches = "";
    try {
      matches = execSync(
        `grep -rn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' ` +
        `-E "from ['\\"](@/lib/mock-data|\\.\\.?/.*mock-data)['\\"]" ` +
        `src/ --exclude-dir=generated`,
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      );
    } catch (e: unknown) {
      // grep exit code 1 = no matches = SUCCESS
      const status = (e as { status?: number } | null)?.status;
      if (status === 1) return; // PASS
      throw e;
    }
    // If we got here, grep found matches → FAIL with helpful output
    throw new Error(
      `DATA-05 EXIT GATE FAILED — mock-data imports still exist in src/:\n${matches}`,
    );
  });

  it("prisma/seed.ts does not import from src/lib/mock-data", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("prisma/seed.ts", "utf8");
    expect(content).not.toMatch(/mock-data/);
  });
});
```

**Why 3 assertions:**
1. File physically deleted.
2. No src/ imports (even if the file somehow re-appeared).
3. seed.ts detached — catches the "only consumer" regression.

**Platform note:** `grep` is required on the CI/dev machine. On Windows native, Git Bash / WSL provides it. The project already uses Windows with bash per env info — verified available. Alternative using pure Node.js `fs.readdir` + regex is possible but 10x more code.

---

## Review Tag Sets (Korean — hardcoded)

**File:** `src/lib/constants/review-tags.ts`

```ts
/**
 * Phase 5 REV-01/REV-02 — hardcoded review tag sets.
 *
 * 한국 단기·스팟 알바 문화 (Timee/당근알바 톤)에 맞춘 ~8 tags per direction.
 * Display-only in v1 — no search/filter by tag.
 *
 * Planner note: 추가/변경 시 이 상수만 수정하면 UI tag-chip-picker가 자동 반영.
 * Review.tags 컬럼은 String[] (text[]) 이므로 DB 마이그레이션 불필요.
 */

// Worker가 Business에 주는 태그 (어떤 사업장이었나?)
export const WORKER_TO_BIZ_TAGS = [
  "친절해요",          // 기본 긍정
  "분위기 좋음",       // 근무 환경
  "시간 엄수",         // 시작/종료 정확
  "지시 명확",         // 업무 설명
  "업무량 적당",       // 난이도 / 강도
  "교통비 제대로",     // 약속한 보상
  "재방문 의사",       // 재고용 희망
  "초보도 환영",       // 허들 없음
] as const;

// Business가 Worker에 주는 태그 (어떤 근무자였나?)
export const BIZ_TO_WORKER_TAGS = [
  "성실함",            // 기본 긍정
  "밝은 인상",         // 태도
  "시간 엄수",         // 지각 없음
  "업무 숙련",         // 일 처리
  "의사소통 원활",     // 커뮤
  "책임감 있음",       // 끝까지
  "팀워크 좋음",       // 조화
  "재고용 희망",       // 다시 부르고 싶음
] as const;

export type WorkerToBizTag = (typeof WORKER_TO_BIZ_TAGS)[number];
export type BizToWorkerTag = (typeof BIZ_TO_WORKER_TAGS)[number];
```

**Design rationale:**

- **8개 per direction** — CONTEXT에서 "~8 tags" 가이드. 8은 2×4 chip grid 모바일에 잘 맞음.
- **"시간 엄수" 양방향 공통** — 스팟 알바에서 가장 민감한 포인트. 양쪽이 같은 언어 사용하면 UX 일관성 ↑.
- **"재방문 의사" / "재고용 희망"** — Timee의 "리피트" 지표 벤치마크. v2에서 재매칭 알고리즘 시그널로 쓸 수 있음.
- **부정 태그 없음** — v1은 positive-only. 불만은 별점으로 표현. CONTEXT의 "No moderation queue" 원칙과 정합 (부정 태그는 분쟁 유발 → 모더레이션 필요).
- **"교통비 제대로"** — 한국 단기 알바 불만 1위가 "교통비 약속했는데 안 줌". Timee ≠ 한국 시장 차이점, 의도적으로 추가.
- **"초보도 환영"** — /home 필터의 `tags: ["초보환영"]`과 정합 (Phase 1 mock-data.ts:305).

**[ASSUMED]** 이 태그 세트는 업계 리서치 없이 PROJECT.md Timee 벤치마크 철학 + 일반적인 한국 알바 문화에 대한 일반지식으로 작성됨. Planner 또는 유저 확인 권장:
- "교통비 제대로"가 긍정 태그로 충분한지 / "교통비 별도"로 더 중립적으로?
- "재방문 의사" vs "다시 일하고 싶어요" 중 어느 쪽이 UX 상 자연스러운지?

---

## Validation Architecture

**Test framework:** Vitest 3 + Playwright (Phase 2에서 도입, Phase 4에서 통합 테스트 인프라 완성)

| Property | Value |
|---|---|
| Framework | Vitest (current version: whatever Phase 4 has) |
| Config file | `vitest.config.ts` (exists, `fileParallelism: false` for tests/applications/**) |
| Quick run command | `npm test -- tests/reviews --run` |
| Full suite command | `npm test -- --run` (Phase 4: 34 files / 109 tests baseline) |
| Integration DB | Real Supabase via `DATABASE_URL` in `.env.local` (tests use `@test.local` workers/bizes, test resolvers in dal.ts) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| REV-01 | Worker creates Biz review with star+tags+comment | integration | `npm test -- tests/reviews/worker-review-create.test.ts --run` | ❌ Wave 0 |
| REV-01 | Review rejected when application not in `settled` state | integration | same file, additional `it` | ❌ Wave 0 |
| REV-02 | Business creates Worker review | integration | `npm test -- tests/reviews/biz-review-create.test.ts --run` | ❌ Wave 0 |
| REV-03 | Second review on same (applicationId, direction) → `already_reviewed` | integration | `npm test -- tests/reviews/unique-constraint.test.ts --run` | ❌ Wave 0 |
| REV-03 | Same application, different direction → both succeed | integration | same file, additional `it` | ❌ Wave 0 |
| REV-04 | After worker review, BusinessProfile.rating updated atomically | integration | `npm test -- tests/reviews/rating-aggregation.test.ts --run` | ❌ Wave 0 |
| REV-04 | 10 concurrent reviews → final rating is mathematically correct (race) | integration | same file, `it.concurrent` | ❌ Wave 0 |
| SETL-01 | checkOut success → Application.status='settled' in same transaction | integration | `npm test -- tests/settlements/checkout-to-settled.test.ts --run` | ❌ Wave 0 |
| SETL-01 | earnings locked on status='settled' (second update attempt fails or idempotent) | unit | same file | ❌ Wave 0 |
| SETL-02 | Biz settlements list returns only own-job settlements | integration | `npm test -- tests/settlements/biz-list.test.ts --run` | ❌ Wave 0 |
| SETL-02 | Biz cannot see other business's settlements (RLS + app gate) | integration | same file | ❌ Wave 0 |
| SETL-03 | Worker totals: sum correct across multiple settled jobs | integration | `npm test -- tests/settlements/worker-totals.test.ts --run` | ❌ Wave 0 |
| SETL-03 | KST month boundary — job settled at 2026-04-30 23:59 KST counts in April; at 2026-05-01 00:01 KST counts in May | integration | same file, edge case `it` | ❌ Wave 0 |
| SETL-03 | KST month boundary — job settled at UTC 2026-04-30 16:00 (= 2026-05-01 01:00 KST) counts in May | integration | same file | ❌ Wave 0 |
| DATA-05 | `src/lib/mock-data.ts` file does not exist | unit (fs) | `npm test -- tests/mock-removal/exit-gate.test.ts --run` | ❌ Final wave |
| DATA-05 | grep returns 0 matches in src/ (exit code 1) | unit (shell) | same file | ❌ Final wave |
| DATA-05 | prisma/seed.ts does not import mock-data | unit (fs) | same file | ❌ Final wave |

### Sampling Rate (Nyquist)

- **Per task commit:** `npm test -- <area> --run` where `<area>` matches the task (e.g., `tests/reviews` for REV tasks).
- **Per wave merge:** `npm test -- --run` (full suite — currently 34 files / 109 tests baseline from Phase 4, will be ~40 files / ~130 tests after Phase 5).
- **Phase gate:** Full suite GREEN + exit-gate test passing before `/gsd-verify-work`.

### Edge Cases to Cover Explicitly

1. **Double-submission race** (REV-03): Promise.all two identical review creates. One wins, one gets `already_reviewed`. Phase 4's apply-race.test.ts has the blueprint — reuse pattern with vitest `it.concurrent`.
2. **Simultaneous review + settlement race** (REV + SETL): Decoupled by design, but still test: checkOut in-flight while worker tries to submit review → expect `not_settled` error (review gate), settlement proceeds normally.
3. **Timezone edge** (SETL-03): seed an application with `checkOutAt = '2026-04-30T14:59:59.999Z'` (= April 30 23:59 KST) and another with `'2026-04-30T15:00:01Z'` (= May 1 00:00 KST). Verify totals partition correctly by KST month.
4. **Review on cancelled application** (REV-01 gate): Cancelled apps never reach settled → review action must return `not_settled`. Confirms no "review the noshow" path.
5. **Rating precision**: BusinessProfile.rating is `Decimal(3,2)` = range `0.00–9.99` (max 3 integer + 2 fractional = display `0.00`..`9.99`). 5-star scale never exceeds 5.00 → no overflow. But incremental formula `(prev * count + new) / (count + 1)` with `count = 0` must handle prev=0 edge case → result = new/1 = new. Test this specifically.
6. **Atomic rating under rollback**: Force a failure in the UPDATE step (e.g., inject DB error) → verify Review row also rolled back. Prisma `$transaction` handles this automatically; test verifies the contract.
7. **Mock removal grep false positive** (DATA-05): After deletion, re-add a fake import line to a throwaway branch → verify test FAILS (proving the assertion actually runs). Negative test.

### Wave 0 Gaps

- [ ] `tests/reviews/` directory — covers REV-01..04
- [ ] `tests/settlements/` directory — covers SETL-01..03
- [ ] `tests/mock-removal/exit-gate.test.ts` — covers DATA-05
- [ ] `tests/fixtures/review-fixtures.ts` — shared factory (createReviewApplication, seedSettledApplication)
- [ ] Test helper extension to `src/lib/dal.ts` for `requireApplicationOwner` test-mode path (may already work via existing `@test.local` resolver — verify in Wave 0)

*No new framework install needed — Vitest infra is complete from Phase 2/3/4.*

---

## Security Domain

**Security enforcement:** Assumed enabled (no explicit `security_enforcement: false` in config.json). Phase 5 introduces no authentication or session flow changes — all new surfaces ride on Phase 2 DAL (`verifySession` + `requireWorker` + `requireApplicationOwner` / `requireJobOwner`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | reuses Phase 2 | Supabase Auth — no Phase 5 change |
| V3 Session Management | reuses Phase 2 | cookie-based session via `@supabase/ssr` — no Phase 5 change |
| V4 Access Control | **yes — new** | `requireApplicationOwner` (review write gate worker-side), `requireJobOwner` (review write gate biz-side), Application.status === 'settled' gate |
| V5 Input Validation | **yes — new** | Zod schemas in `src/lib/validations/review.ts` for all Server Action inputs |
| V6 Cryptography | no | No new crypto; existing jose/VAPID infra untouched |

### Known Threat Patterns for Phase 5

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| **T-05-01**: Worker writes fake review on someone else's application | Elevation of Privilege | `requireApplicationOwner` redirects on 403. Same helper used by checkIn/checkOut → already battle-tested. |
| **T-05-02**: Double review submission (race) | Tampering | `@@unique([applicationId, direction])` DB constraint + P2002 error mapping. Not application-level check (vulnerable to TOCTOU). |
| **T-05-03**: Review before work completed (rating a job that never happened) | Tampering | `if (application.status !== 'settled')` gate inside Server Action. The `settled` transition only happens inside the atomic checkOut flow, which itself has 5 gates (ownership/state/time/geofence/JWT). |
| **T-05-04**: Negative rating injection (rating = 0 or -1 or 6) | Tampering | Zod `z.number().int().min(1).max(5)`. |
| **T-05-05**: XSS via review comment (stored) | Tampering | Zod `z.string().max(500)` length guard + React auto-escapes text in `{comment}` JSX interpolation (no `dangerouslySetInnerHTML`). |
| **T-05-06**: Rating aggregation inflation via many fake accounts | Tampering | Out of scope v1 — `already_reviewed` per application is the app-level defense. Anti-fraud (device fingerprinting, abuse detection) is v2 admin scope. |
| **T-05-07**: Settlement amount tampering by reading another worker's data | Information Disclosure | Worker settlement queries filter `WHERE workerId = session.id`. Biz queries filter `WHERE job.authorId = session.id`. No user-controlled filter parameter. |
| **T-05-08**: SQL injection via review tag array | Tampering | Zod validates each tag as string; Prisma Client parameterizes array bind. No `$queryRaw` with user-controlled tag strings. |
| **T-05-09**: Settlement total aggregation info leak via timing | Information Disclosure | Low risk (deterministic query) — no mitigation needed in v1. |
| **T-05-10**: Mock removal accidentally drops a live config path | Denial of Service | Exit plan STEP 1 (seed.ts refactor) is a controlled edit. STEP 5 (verify build + test) catches regressions before merge. |

### RLS Carry-Forward

Phase 4's migration `20260412000001_applications_rls_phase4.sql` enabled RLS on `applications` table. **Reviews table is NOT currently under RLS** (Phase 4 VERIFICATION.md: "Reviews 의도적으로 disabled (Phase 5 scope)"). Phase 5 must add:

```sql
-- supabase/migrations/<timestamp>_reviews_rls_phase5.sql
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Reviewer can read their own written reviews
CREATE POLICY "reviews_select_reviewer" ON public.reviews
  FOR SELECT USING (auth.uid() = "reviewerId");

-- Reviewee can read reviews about them
CREATE POLICY "reviews_select_reviewee" ON public.reviews
  FOR SELECT USING (auth.uid() = "revieweeId");

-- Reviewer can insert their own reviews (enforced at application layer too,
-- via @@unique; RLS is defense-in-depth).
CREATE POLICY "reviews_insert_reviewer" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = "reviewerId");

-- No UPDATE / DELETE policies — v1 write-once enforcement.
```

Defense-in-depth rationale: Prisma's `DIRECT_URL` bypasses RLS (same as Phase 4 applications), so RLS is for any future client-side Supabase reads AND to block direct REST API abuse.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| PostgreSQL (Supabase) | All DB ops | ✓ | Phase 2 verified | — |
| PostGIS | Reused from Phase 3/4 | ✓ | Enabled | — |
| Node runtime | Server Actions | ✓ | — | — |
| `grep` CLI | Exit gate test | ✓ | Git Bash / WSL (confirmed from env info: "Shell: bash") | Pure Node.js readdir + regex (10x code) |
| Prisma 7.5.0 | ORM | ✓ | Installed | — |
| Vitest | Tests | ✓ | Phase 2-4 baseline | — |
| Playwright | E2E | ✓ | Phase 2 setup | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

Phase 5 has zero new external dependencies. Everything runs on Phase 4's verified stack.

---

## Common Pitfalls

### Pitfall 1: Prisma `$executeRaw` with Decimal arithmetic
**What goes wrong:** `UPDATE ... SET rating = (prev * count + new) / (count + 1)` without explicit cast can return a different precision than `@db.Decimal(3,2)`, causing Prisma Client read to throw on field decode.
**Why it happens:** Postgres infers numeric type from the division result; Prisma expects exact Decimal(3,2).
**How to avoid:** Wrap the expression in `ROUND(..., 2)::numeric(3, 2)`. See the Pattern 1 example above.
**Warning signs:** `PrismaClientValidationError` on the next `findUnique` of the updated profile row.

### Pitfall 2: Next.js 16 async `params` forgotten in new pages
**What goes wrong:** `export default async function Page({ params }: { params: { id: string } })` — TS accepts but runtime crashes because `params` is a Promise.
**Why it happens:** Training data includes Next 14 sync params. AGENTS.md explicitly warns about this.
**How to avoid:** Always `params: Promise<{ id: string }>` + `const { id } = await params`. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md] Phase 5 routes affected: `/my/applications/[id]/review`, `/biz/posts/[id]/applicants/[applicantId]/review`.
**Warning signs:** `TypeError: params is a Promise` at runtime, or build-time warning about "accessing `params.id` directly".

### Pitfall 3: Prisma `findUnique` composite key accessor typo
**What goes wrong:** For `@@unique([applicationId, direction])`, the generated accessor is `applicationId_direction`, NOT `application_direction` or `applicationId-direction`. A typo produces a confusing `Argument 'where' must not be empty` error.
**How to avoid:** `where: { applicationId_direction: { applicationId, direction } }`. [VERIFIED: `src/generated/prisma/models/Review.ts:997-1011`]
**Warning signs:** TypeScript error on the `where` clause; or runtime empty-where error.

### Pitfall 4: SETL-01 collateral damage to Phase 4 tests
**What goes wrong:** Changing `checkOut` status to `settled` breaks Phase 4's shift tests that assert `status: 'completed'`.
**Why it happens:** Phase 4 tests were written against the pre-Phase-5 enum.
**How to avoid:** After the Phase 5-01 schema + action change, `grep -rn "'completed'" tests/shift/` and update assertions. Expected: ≤3 locations based on Phase 4 SUMMARY inventory.
**Warning signs:** Phase 4 shift tests fail with `expected 'settled' to equal 'completed'`.

### Pitfall 5: KST month boundary off-by-one
**What goes wrong:** Using JS `new Date().getMonth()` for month boundary — runs in server timezone (UTC on Vercel), so a worker who checks out at 2026-04-30 23:00 KST (= 2026-04-30 14:00 UTC) is correctly April, but a checkout at 2026-05-01 00:30 KST (= 2026-04-30 15:30 UTC) would be wrongly labeled April in naive JS.
**Why it happens:** Server ≠ Asia/Seoul.
**How to avoid:** Always use SQL `AT TIME ZONE 'Asia/Seoul'` for aggregation boundaries (see Pattern 3). Or convert to KST epoch-ms in JS: `new Date(utcMs + 9 * 3600_000)` + use `getUTCMonth()`. SQL approach is preferred — it's pushed to DB and doesn't depend on server TZ config.
**Warning signs:** /my/settlements "이번 달" total drifts ±1 month for checkouts near midnight KST.

### Pitfall 6: Prisma 7 `_count` + `select` incompatibility
**What goes wrong:** Mixing `_count` aggregations with `select` in the same query can throw type errors in Prisma 7. Phase 4 worked around this by using `include` exclusively.
**How to avoid:** Stick with `include` for Phase 5 query helpers. If a `_count` is needed, a separate roundtrip is safer than mixed include/select.
**Warning signs:** `PrismaClientValidationError: Unknown argument '_count'`.

### Pitfall 7: Seed.ts refactor changes fixture status
**What goes wrong:** When removing mock-data.ts import, the MOCK_APPLICATIONS inline data has `status: 'completed'` or `'confirmed'` literals. Phase 5 should seed test data with `settled` for proper /my/settlements rendering.
**How to avoid:** Exit plan STEP 1 explicitly updates the past-job fixtures to `status: 'settled'`. Otherwise new dev envs show an empty settlements page.

### Pitfall 8: `safeRevalidate` import forgotten
**What goes wrong:** New Server Actions call `revalidatePath()` directly → vitest fails with "static generation store missing". Phase 4 learned this the hard way.
**How to avoid:** Always import `safeRevalidate` from `@/lib/safe-revalidate` in all Phase 5 Server Actions. Never `revalidatePath` directly. [VERIFIED: `src/lib/safe-revalidate.ts` exists from Phase 4]
**Warning signs:** Vitest error in happy path tests: `Invariant: static generation store missing`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Review unique-per-application enforcement | Custom `SELECT ... THEN INSERT` check | `@@unique([applicationId, direction])` Prisma constraint (already in schema) + P2002 catch | TOCTOU race impossible at DB level. Already declared in schema. |
| Rating incremental average | Manual field + scheduled reaggregation cron | `$transaction` + `$executeRaw` UPDATE in same transaction | Concurrency-safe, read-time O(1), no cron complexity |
| Settlement month aggregation | JS-side groupBy after `findMany` | Postgres `date_trunc(... AT TIME ZONE 'Asia/Seoul')` in `$queryRaw` | Timezone correctness + query pushdown |
| Settlement total computation | Client-side sum in React | Server-side `SUM(earnings)` query | Avoid exposing all records; PII + performance |
| Review write race | Application-level lock or retry loop | DB unique constraint + P2002 mapping | Zero application state |
| Status enum migration from 'completed' to 'settled' | SQL DELETE + reinsert | Postgres `ALTER TYPE ApplicationStatus ADD VALUE 'settled'` via `prisma db push` | Additive enum changes are safe, existing rows untouched |
| Tag storage | `review_tags` join table | `tags String[]` (Postgres `text[]`) column on Review | Display-only use case, no search/filter → over-normalization waste |
| Mock removal grep | Eyeballed review | `execSync(grep ...)` in vitest with exit-code assertion | Machine-checkable, part of CI |

**Key insight:** Phase 5는 거의 모든 복잡한 문제에 **기존 Postgres/Prisma 기능으로 해결책이 이미 있다**. Hand-rolling하려는 유혹에 주의할 것.

---

## Code Examples

### Example A: Review Server Action (worker → biz direction)

See Pattern 1 above — full example with Zod validation, `$transaction`, `$executeRaw` rating aggregation, error mapping, `safeRevalidate`. Source of patterns: [VERIFIED: `src/app/biz/posts/[id]/applicants/actions.ts:141` (rejectApplication $transaction), `src/lib/safe-revalidate.ts`, `src/lib/errors/application-errors.ts`].

### Example B: Settlement totals query with KST boundary

See Pattern 3 above — `$queryRaw` with `date_trunc('month', "checkOutAt" AT TIME ZONE 'Asia/Seoul')`. Source: [VERIFIED: `src/lib/night-shift.ts` uses fixed UTC+9 Korea offset with no-DST assumption; same rationale applies to month boundaries].

### Example C: Next.js 16 async params in review page

```tsx
// src/app/(worker)/my/applications/[id]/review/page.tsx
import { notFound, redirect } from "next/navigation";
import { requireApplicationOwner } from "@/lib/dal";
import { getReviewByApplication } from "@/lib/db/queries";
import { ReviewForm } from "./review-form";

export default async function WorkerReviewPage({
  params,
}: {
  params: Promise<{ id: string }>; // Next.js 16 — async params
}) {
  const { id } = await params;
  const { session, application } = await requireApplicationOwner(id);

  if (application.status !== "settled") {
    // UX: redirect back with error query instead of 404
    redirect(`/my/applications/${id}?error=not_settled`);
  }

  const existing = await getReviewByApplication(id, "worker_to_business");
  if (existing) {
    // Already reviewed — show read-only confirmation
    redirect(`/my/applications/${id}?message=already_reviewed`);
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-lg font-bold mb-4">리뷰 작성</h1>
      <ReviewForm applicationId={id} direction="worker_to_business" />
    </div>
  );
}
```

Verified patterns:
- `params: Promise<...>` + `await params` [VERIFIED: bundled Next 16 page.md]
- `requireApplicationOwner` [VERIFIED: `src/lib/dal.ts:211`]
- `redirect()` import from `next/navigation` [VERIFIED: Phase 4 existing pages]

### Example D: Grep-based exit gate test

See "Mock Removal Verification" section above for complete runnable test file.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| `params: { id: string }` sync | `params: Promise<{ id: string }>` async | Next.js 15+, required in 16 | [VERIFIED] All Phase 5 new pages must use async pattern |
| `prisma.$transaction([...])` array batch | `prisma.$transaction(async (tx) => {...})` interactive | Prisma 3+ (both still supported) | Phase 4/5 uses interactive for multi-step atomic work |
| pg trigger for denormalized counters | Application-level `$transaction` incremental update | Phase 5 decision per CONTEXT | Testability + portability |
| `revalidatePath` unconditional | `safeRevalidate` wrapper | Phase 4 learned — vitest context bug | [VERIFIED: Phase 4 fix, required going forward] |

**Deprecated / outdated (don't use in Phase 5):**
- `middleware.ts` at src/ root — replaced by `src/proxy.ts` in Next 16. Phase 2 already migrated. [CITED: Phase 2-03 summary]
- `ApplicationStatus.checked_in` — legacy, schema comment says "deprecated - use in_progress (Phase 5 removal candidate)". **Phase 5 can remove** after confirming no DB rows use it (grep seed.ts + a quick `SELECT COUNT(*) WHERE status='checked_in'` in a migration script).
- Mock-specific imports from `src/lib/mock-data.ts` (none exist in src/ already).

---

## Runtime State Inventory

Phase 5 is **not** a rename/refactor phase in the traditional sense, but DATA-05 (mock removal) has a string-deletion aspect. Brief inventory:

| Category | Items Found | Action Required |
|---|---|---|
| Stored data | None — no DB rows reference "mock-data" path | none |
| Live service config | None — no n8n / external service config has "mock-data" | none |
| OS-registered state | None — no Windows Task / systemd / launchd tasks | none |
| Secrets/env vars | None — no env var name contains "mock-data" | none |
| Build artifacts | `src/generated/prisma/internal/class.ts:248` contains a generated comment with "mock-data" — this is **auto-regenerated by `prisma generate`** from prior schema state, not a stale artifact. No action needed, excluded from exit gate grep via `--exclude-dir=generated`. | none |

**Nothing found in categories 1-5.** The `generated/` false positive is handled by the grep flag.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | Prisma 7.5 error code `P2002` for unique violation is unchanged from Prisma 6 | Pattern 1 / Error Taxonomy | **Low** — if different, integration test fails immediately, easy fix (match to actual code in error) |
| A2 | Review tag suggestions (WORKER_TO_BIZ_TAGS / BIZ_TO_WORKER_TAGS) match Timee/당근알바 Korean UX conventions | Review Tag Sets | **Medium** — subjective, user confirmation recommended before hardcoding. Can be adjusted by single file edit post-launch. |
| A3 | Exit plan seed.ts refactor can inline arrays without functional regression | Mock Removal Inventory | **Low** — the arrays are pure data, no logic branches. `npm run db:seed` + row count check catches issues. |
| A4 | Phase 4 shift tests have ≤3 locations asserting `status: 'completed'` that need updating to `'settled'` | Pitfall 4 | **Low** — planner verifies by grep during task implementation, affects only test-update scope estimation |
| A5 | `grep` is available on the dev/CI environment (Windows bash per env info) | Mock Removal Verification | **Low-medium** — env info confirms `bash`, but if a pure-Windows CI runner is added later, the test needs a Node fallback. Document this. |
| A6 | `ALTER TYPE "ApplicationStatus" ADD VALUE 'settled'` via `prisma db push` works for Postgres 15+ without issues | Settlement Integration / Pattern 2 | **Low** — Postgres supports enum additive changes since 9.1. Prisma 7 generates the correct DDL. Verified in Phase 4 when adding `pending`. |
| A7 | Current installed Prisma 7.5.0 has no regression vs 7.7.0 (latest) for `$transaction` interactive mode | Standard Stack | **Low** — Phase 4 battle-tested 7.5.0 extensively. Upgrade is optional and out of scope for Phase 5 |
| A8 | `completionRate` on WorkerProfile / BusinessProfile doesn't need updating on review (rating separate from completion) | Pattern 1 | **Low** — completion rate is about work completion (check-in/out), not review. Verified by reading existing schema + Phase 3 summaries. |
| A9 | No existing production data on the target Supabase has `ApplicationStatus='completed'` that needs migrating to `settled` — only seed data | Settlement Integration | **Medium** — if users have already used the dev deployment with real checkouts, those rows will show in `completed` bucket forever unless migrated. Planner should include a one-time `UPDATE` migration as safety net |

---

## Open Questions

1. **Should we collapse `completed` → `settled` via one-time migration, or keep both enum values?**
   - Option A: Keep both (legacy `completed` treated same as `settled` in queries, new writes use `settled`). Simpler, but forever carries the duplicate.
   - Option B: `UPDATE applications SET status='settled' WHERE status='completed'` migration, then drop `completed` from enum after data migration. Cleaner, but requires two-step enum change (drop enum values in Postgres is painful — would need full enum recreate).
   - **Recommendation:** Option A for Phase 5 (v1 completeness > schema cleanliness). Revisit in v2.

2. **Does `checked_in` enum value have any existing rows?**
   - Phase 4 schema comment: "deprecated - use in_progress (Phase 5 removal candidate)". If the answer is "zero rows", Phase 5 can drop it via `ALTER TYPE`. If non-zero, leave alone.
   - **Planner action:** Run `SELECT COUNT(*) FROM applications WHERE status='checked_in'` in the first Phase 5 wave. If 0, include removal as cleanup task. If >0, defer to v2.

3. **Do we need a `ReviewForm` component in both `(worker)` and `biz` app groups, or a single shared component in `components/shared/`?**
   - CONTEXT says "new components: `review-form.tsx` in `src/components/worker/` and `src/components/biz/`" — 두 위치 명시. But the form shape (star + tags + textarea) is identical, only the tag set and direction differ.
   - **Recommendation:** One shared `src/components/shared/review-form.tsx` parameterized by `direction: 'worker_to_business' | 'business_to_worker'` and `tagSet: readonly string[]`. CONTEXT is non-binding on this — it's Claude's Discretion per UI-SPEC section.

4. **Should `DONE_STATUSES` in queries.ts include `cancelled`?**
   - Phase 4 deliberately excluded `cancelled` per list-worker test comment. Phase 5 may want /my/applications history tab to show cancellations. 
   - **Recommendation:** Leave Phase 4 behavior unchanged. Show cancelled in a separate section or let users see it via `/my/applications?bucket=all` if UX demands. Not a Phase 5 blocker.

5. **Seed.ts Phase 5 past-job fixtures: how many?**
   - Current seed has 5 MOCK_APPLICATIONS (3 completed past + 2 upcoming confirmed). /my/settlements with 3 past settlements is a thin demo.
   - **Recommendation:** Exit plan STEP 1 bumps past-settled count to ~6-8 so the demo page has visible totals for both "이번 달" and older months. Optional — aesthetic.

6. **Should Review insert trigger a Web Push notification to the reviewee?**
   - Phase 4 established push triggers on apply/accept/reject. Symmetry suggests "You received a review" push. CONTEXT doesn't mention it.
   - **Recommendation:** v1 = no push on review (keep Phase 5 scope tight). Add to v2 follow-up list.

7. **Biz settlement view — flat list or grouped by job?**
   - CONTEXT says "list grouped by job or flat paginated". Grouping adds UI complexity for marginal value (each job typically has 1-3 workers).
   - **Recommendation:** Flat paginated (worker + date + amount per row). Add grouping as v2 polish.

---

## Sources

### Primary (HIGH confidence)
- **Repo code-reading** — `src/lib/db/queries.ts`, `src/lib/dal.ts`, `src/lib/job-utils.ts`, `src/lib/types/job.ts`, `src/lib/mock-data.ts`, `src/app/(worker)/my/settlements/page.tsx`, `src/app/biz/settlements/page.tsx`, `src/app/(worker)/my/applications/[id]/check-in/actions.ts`, `src/app/biz/posts/[id]/applicants/actions.ts`, `prisma/schema.prisma`, `prisma/seed.ts`
- **Phase 4 artifacts** — `.planning/phases/04-db/VERIFICATION.md` (mock removal pre-status, integration concerns), `04-02-schema-dal-SUMMARY.md` (DAL helpers, schema patterns), `04-04-application-actions-SUMMARY.md` ($transaction patterns, error taxonomy, safeRevalidate), `04-05-shift-actions-SUMMARY.md` (checkOut structure, Asia/Seoul time math, calculateEarnings)
- **CONTEXT.md** — `05-CONTEXT.md` (locked decisions, scope boundaries, Claude's discretion areas)
- **Bundled Next.js 16 docs** — `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` (async params), `01-app/02-guides/caching-without-cache-components.md` (caching patterns)
- **npm registry version check** — `npm view prisma version` → 7.7.0 (local 7.5.0 confirmed production-safe)
- **Requirements traceability** — `.planning/REQUIREMENTS.md` (REV-01..04, SETL-01..03, DATA-05 canonical definitions)

### Secondary (MEDIUM confidence)
- **Phase 2/3 summaries** referenced indirectly via STATE.md and ROADMAP.md for historical context on why seed.ts imports mock-data and why `src/lib/types/job.ts` has Mock* aliases
- **PROJECT.md constraints** — Timee UX 3-axis principle as basis for the decoupled review-settlement design

### Tertiary (LOW confidence — flagged for validation)
- **Review tag set (WORKER_TO_BIZ_TAGS / BIZ_TO_WORKER_TAGS)** — composed from general knowledge of Korean short-term labor culture + Timee benchmark description in PROJECT.md. No A/B test data or user research. See Assumption A2.
- **Estimated Phase 4 shift test update count** (≤3 locations) in Pitfall 4 — based on SUMMARY inventory, not direct file grep. Verify in Wave 0.
- **KST no-DST assumption** — Korea has not observed DST since 1988. [CITED: general knowledge + Phase 4 `src/lib/night-shift.ts` comment "Korea has no DST → Asia/Seoul is a FIXED UTC+9 offset"]. Unlikely to change but documented.

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all versions verified against repo + npm registry, Phase 4 battle-tested patterns
- Architecture (schema + $transaction patterns): **HIGH** — direct code evidence from Phase 4
- Mock removal inventory: **HIGH** — grep results verified against VERIFICATION.md + independent 2026-04-11 grep
- Settlement integration: **HIGH** — checkOut code read directly, change scope is a single literal
- Review tag sets: **LOW** — domain-knowledge-based, needs user confirmation
- Pitfalls: **HIGH** — Phase 4 verification + bundled Next.js 16 docs + direct code inspection
- Validation architecture: **HIGH** — reuses Phase 4 test infrastructure (34/109 PASS baseline)

**Research date:** 2026-04-11
**Valid until:** 2026-04-25 (14 days — stable stack, no impending version bumps)
**Researcher:** gsd-phase-researcher (Claude Opus 4.6)

---

## RESEARCH COMPLETE
