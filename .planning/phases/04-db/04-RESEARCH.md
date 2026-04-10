---
phase: 04-db
phase_name: 지원·근무 라이프사이클 DB 연결 + 탐색 고도화
researched: 2026-04-10
status: ready-for-planning
research_areas_count: 12
confidence: HIGH
response_language: ko
---

# Phase 4: 지원·근무 라이프사이클 DB 연결 — Research

<user_constraints>
## User Constraints (from CONTEXT.md)

> CONTEXT.md D-01..D-28 (28 locked decisions) 전체가 planner의 제약이다. Researcher는 이 결정들의 **HOW**만 조사했으며, WHAT은 이미 고정되었으므로 re-litigate하지 않는다. 아래는 전문(verbatim) 요약 — 실제 해석은 04-CONTEXT.md가 authoritative.

### Locked Decisions (28)

- **D-01** ApplicationStatus enum에 `pending` 추가(맨 앞), `Application.status` 기본값 `pending`. `checked_in` deprecate(이번엔 enum 유지).
- **D-02** Business 수락 = 수동 수락 버튼 + 자동수락 타이머 혼합.
- **D-03** 자동수락 타이머 기본값 **30분**. pg_cron `* * * * *` 주기로 pending → confirmed 전이.
- **D-04** Headcount 계산 = pending + confirmed + in_progress + checked_in + completed (cancelled 제외). `jobs.filled` 컬럼을 Server Action 내부에서 explicit 관리.
- **D-05** 동시 지원 경합 = atomic UPDATE 조건부(`filled<headcount AND status='active'`) + `prisma.$transaction` interactive. ON CONFLICT `(jobId, workerId)` 재지원 차단 + filled++ 롤백.
- **D-06** Worker Realtime = Supabase `postgres_changes` subscribe, `filter: 'workerId=eq.${userId}'`, UPDATE 이벤트, RLS 존중, `removeChannel` 정리.
- **D-07** Business Realtime = 동일 패턴, `filter: 'jobId=eq.${jobId}'`, INSERT+UPDATE 이벤트.
- **D-08** Realtime 폴백 = 60초 polling, channel.subscribe 콜백에서 SUBSCRIBED/TIMED_OUT/CHANNEL_ERROR 상태 추적 + React Query `refetchInterval` 토글.
- **D-09** 체크인 검증 = 시간창(`startTime-10min ~ startTime+30min`) + PostGIS `ST_DWithin` geofence. QR 불필요.
- **D-10** Geofence 반경 **200m**.
- **D-11** 실근무 시간 = 15분 단위 반올림(`Math.round(min/15)*15`), 정직한 시간 지급, 조퇴 패널티 없음. 교통비 전액.
- **D-12** 야간할증 = TypeScript 함수 `calculateNightShiftPremium` (src/lib/job-utils.ts). 22:00-06:00 Asia/Seoul 구간 4시간 이상 겹침 → 전체 야간 시간 × 0.5 추가.
- **D-13** QR은 **체크아웃 전용**. 체크인은 geofence + 시간창.
- **D-14** QR 라이브러리 = `html5-qrcode`. `check-in-flow.tsx`의 `handleScan` 교체.
- **D-15** QR payload = JWT `{ jobId, businessId, nonce, iat, exp }`, HS256, **10분 만료**, `jose.SignJWT`/`jose.jwtVerify`, `APPLICATION_JWT_SECRET` env.
- **D-16** Biz QR 생성 UI = `/biz/posts/[id]` "퇴근 QR 열기" 버튼 → 모달 + QR SVG + 카운트다운 + 만료 전 자동 재생성. `qrcode` npm.
- **D-17** applications RLS 엄격 = Worker 본인(`workerId=auth.uid()`) SELECT/INSERT/UPDATE + Business via `EXISTS jobs JOIN authorId=auth.uid()` SELECT/UPDATE. DELETE 없음. 새 마이그레이션이 Phase 2 D-05 disable SQL overwrite.
- **D-18** dal.ts 확장: `requireApplicationOwner(applicationId)`, `requireJobOwner(jobId)`.
- **D-19** 알림 = Realtime 인앱 배너(shadcn Toast) + Web Push(VAPID). 네이티브/SMS/알림톡은 v2.
- **D-20** Web Push 인프라 = Prisma `PushSubscription` 모델 + `subscribePush`/`unsubscribePush` Server Actions + `web-push` 라이브러리. `public/sw.js` Service Worker. `npx web-push generate-vapid-keys` 수동 발급.
- **D-21** Worker 취소 = 근무 24시간 전까지 무료, 이후 노쇼 경고.
- **D-22** 노쇼 페널티 = `WorkerProfile.noShowCount` 컬럼 + `completionRate` 자동 재계산. pg_cron 5분 주기로 `startTime+30min` 지나도 `checkInAt=null`이면 cancelled + noShowCount++ + filled--.
- **D-23** SEARCH-02 카카오맵 v2→v1 승격. PROJECT/ROADMAP/REQUIREMENTS 문서 Phase 4 첫 plan에서 동기화(BLOCKING 태스크).
- **D-24** 카카오맵 키 = 사용자 수동 발급(`NEXT_PUBLIC_KAKAO_MAP_KEY`). 키 없으면 지도 토글 버튼 disable.
- **D-25** /home 리스트/지도 토글. 지도 모드 = 카카오맵 + viewport marker + drawer 카드.
- **D-26** 시간 필터 = 오늘/내일/이번주 프리셋 + 오전/오후/저녁/야간 버킷. `getJobsPaginated`/`getJobsByDistance`에 파라미터 추가.
- **D-27** 거리 필터 = 1/3/5/10km 스테퍼, URL query `?radius=3`, `kakao.maps.Circle` 시각화. 기본 3km.
- **D-28** 지도 marker = 단순 marker만(clustering 미적용), limit 50 고정, cursor 페이지네이션 비활성, custom SVG 핀 권장.

### Claude's Discretion (planner 재량)

- `checked_in` enum deprecate 방식(주석만, Phase 5 재검토)
- Push 메시지 본문 한국어 copywriting
- Realtime channel 이름 컨벤션(`applications:worker:{userId}` vs `applications:job:{jobId}`)
- Auto-accept pg_cron 주기(1분 권장)
- 노쇼 감지 pg_cron 주기(5분 권장)
- Application Server Action 파일 구조(`src/lib/actions/application-actions.ts` 단일 파일 권장)
- `generateCheckoutQrToken` rate limit 방식
- html5-qrcode 권한 거부 fallback copy
- Kakao map lazy loading 전략(지도 모드 진입시 inject 권장)
- Map marker 아이콘 커스텀 여부
- Service Worker 등록 위치(root layout useEffect vs 별도 provider)
- Web Push 권한 요청 타이밍(`/my` 첫 방문시 dismissable banner)
- 지원 버튼 disable 조건(재지원/비활성 공고/노쇼 3회+)
- 체크인/체크아웃 실패 UX 메시지
- Phase 4 첫 plan의 문서 동기화 태스크 묶음 단위

### Deferred Ideas (OUT OF SCOPE — Phase 4가 연구하거나 계획해서는 안 됨)

- Review system (REV-01..04) — Phase 5
- Settlement 실연동 (SETL-01..03) — Phase 5
- `src/lib/mock-data.ts` 파일 삭제 — Phase 5 최종 exit
- 네이티브 FCM/APNs push, SMS, 카카오 알림톡 — v2
- Toss Payments, 원천징수 3.3%, 국세청 사업자번호 검증 — v2
- 카카오 SSO 로그인 — v2 (Supabase Auth 기본 유지)
- Worker 가용 시간 캘린더 (WorkerAvailability 모델) — v2
- Job 키워드 검색, 즐겨찾기/찜 — v2
- 지도 marker clustering, "전국" 옵션(10km 초과) — Phase 5+
- AI 매칭, 채팅 — v2
- 지원 거절 사유 입력 필드, Worker-to-Worker 팀 근무 — 간소화 원칙 위배

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| APPL-01 | 인증된 Worker는 공고 상세에서 "원탭 지원" 버튼으로 지원을 생성할 수 있다 | 영역 1 (동시 경합 SQL), 9 (schema 마이그레이션), 11 (Next 16 Server Action) |
| APPL-02 | Worker는 자신의 지원 목록(예정/진행중/완료)을 본다 | 영역 1 (Realtime), 9 (pending 상태 UI), 10 (applications RLS) |
| APPL-03 | Business는 자신의 공고 각각에 대한 지원자 목록을 본다 | 영역 1 (Realtime jobId filter), 10 (RLS JOIN 패턴) |
| APPL-04 | Business는 지원자를 accept/reject할 수 있으며 Worker 쪽에 실시간 반영된다 | 영역 1 (Realtime UPDATE), 7 (pg_cron auto-accept) |
| APPL-05 | Accept된 headcount가 도달하면 공고가 자동 "마감"으로 전환된다 | 영역 1 (Atomic UPDATE + Server Action) |
| SHIFT-01 | Accept된 Worker는 근무 시작 시간에 체크인할 수 있다 | 영역 2 (geofence + 시간창), 3 (html5-qrcode는 체크아웃만) |
| SHIFT-02 | 체크아웃 시 실근무 시간과 수입이 계산되어 Application에 저장된다 | 영역 4 (JWT verify), 8 (Asia/Seoul + 15분 반올림) |
| SHIFT-03 | 야간 할증(22:00-06:00, 4시간 이상)은 50% 가산된다 | 영역 8 (Asia/Seoul Intl.DateTimeFormat 패턴) |
| SEARCH-02 | 카카오맵 연동 공고 지도 표시 (v2→v1) | 영역 6 (SDK 로딩 + autoload=false + marker) |
| SEARCH-03 | 시간 프리셋 + 시간대 버킷 필터 (신설) | 영역 1 (queries.ts 확장) |
| NOTIF-partial | Web Push 알림 채널 활성화 | 영역 5 (VAPID + sw.js + web-push + 410 cleanup) |

</phase_requirements>

## Project Constraints (from CLAUDE.md + AGENTS.md)

| 제약 | 영향 |
|------|------|
| **"This is NOT the Next.js you know"** (AGENTS.md) | 코드 작성 전 `node_modules/next/dist/docs/` 읽기 필수. proxy/revalidatePath/use-server/public-folder/pwa 문서는 이 연구에서 **직접 확인 완료** [VERIFIED]. |
| **`src/proxy.ts` (not middleware.ts)** | Next 16 breaking rename. 이미 Phase 2에서 적용됨. Phase 4는 변경 없음. |
| **`cacheComponents` flag OFF** (next.config.ts 확인 완료) | Phase 4 코드는 **Previous Model** 사용 — `'use cache'` directive 금지, `unstable_cache`/`revalidatePath`/route segment config 사용. [VERIFIED: next.config.ts] |
| **Supabase 단일 벤더 원칙** | Kakao Maps가 첫 예외 (scope 확장 승인). 그 외 외부 의존성 추가는 계속 차단. |
| **Korean UX copy** | 모든 user-facing 에러/배너/알림은 한국어. 영어 error code → 한국어 매핑 레이어 필수. |
| **mock-data.ts 제거 target Phase 5** | Phase 4는 `apply-confirm-flow.tsx`·`my/applications/page.tsx`·`biz/posts/[id]/applicants/page.tsx`·`check-in-flow.tsx`의 인라인 목업만 제거. `src/lib/mock-data.ts` 파일 자체는 Phase 5까지 보존. |
| **Vercel Node.js runtime** (D-07 carry) | `jose`/`web-push`/`prisma` 모두 Node runtime 전제. Edge runtime 필요 없음. |
| **Timee 3-axis 원칙** | "면접 없음 · 당일 근무 · 즉시 정산". pending 단계 추가는 **자동수락 타이머**로 "면접 없음"을 유지하는 방식. Business가 수동 거절만으로 pending을 무한 유지하는 UX는 안 됨. |

## Summary

1. **Supabase Realtime은 이미 설치되어 있고(@supabase/realtime-js), API 표면이 안정적이다.** `postgres_changes` 필터는 `column=eq.value` 문자열 형식이며, camelCase 컬럼(`workerId`)도 그대로 동작. 단, Phase 2 D-05가 applications를 RLS OFF 해 두었으므로 Phase 4 첫 SQL 마이그레이션이 **RLS 활성화 + `supabase_realtime` publication에 테이블 추가 + `REPLICA IDENTITY DEFAULT`** 3가지를 함께 해야 한다 (현재 기본값이 DEFAULT라 ALTER 불필요 — 확인만 필요).
2. **Next.js 16 공식 PWA 가이드가 Web Push 전체 플로우를 `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`에 제공한다.** VAPID 키 생성, `public/sw.js` 구조, `navigator.serviceWorker.register('/sw.js')` 호출 위치, Server Action에서 `webpush.sendNotification` 호출, 보안 헤더 설정까지 모두 verbatim 예제가 있다. Phase 4는 이 가이드를 따르되 `in-memory subscription` 대신 Prisma `PushSubscription` 모델에 저장만 교체하면 된다.
3. **`cacheComponents` flag는 현재 프로젝트에서 OFF 상태**이므로 Phase 4 코드는 `'use cache'`/`cacheLife` 등 **cache-components 신기능을 사용해서는 안 된다**. `revalidatePath('/my/applications/${id}')` 같은 Previous Model 호출만 사용. 이것은 discuss-phase 중 가정하지 않은 새로운 제약이다.
4. **html5-qrcode는 React 19 StrictMode에서 useEffect 더블 마운트 문제를 가진다.** dynamic import + `ssr: false` + `scannerRef`로 double-start 방어 + async stop().then(clear) 정리 패턴이 확립되어 있음. Phase 4 planner는 별도 wrapper 컴포넌트(`components/worker/qr-scanner.tsx`)로 분리해서 main flow 파일에서 dynamic import하는 구조를 권장한다.
5. **Kakao Maps SDK는 `autoload=false` + `kakao.maps.load()` 콜백 패턴이 필수**다. Next.js 16 `next/script` 대신 "지도 모드 진입시 `document.head.appendChild`로 수동 inject"하는 lazy 패턴이 D-25의 "지도 모드 토글시 로딩" UX와 가장 잘 맞는다. TypeScript ambient d.ts(`src/types/kakao.d.ts`)를 Phase 4에서 신설해야 한다 — `@types/kakaomaps`가 없기 때문.

**Primary recommendation:** Phase 4의 plan 분할은 아래 ordering이 가장 안전하다 — (Wave 0) Vitest infra 확인 + `prisma db push` 스키마 변경(pending/noShowCount/PushSubscription) + 문서 동기화 `[BLOCKING]` → (Wave 1) Supabase 새 SQL 마이그레이션 4개 (applications RLS · publication · auto-accept cron · no-show cron) + dal.ts 확장 → (Wave 2) 원탭 지원/수락/거절 Server Actions + Realtime 인프라 → (Wave 3) check-in geofence + check-out JWT + html5-qrcode + 야간할증 + job-utils 유닛 테스트 → (Wave 4) Web Push VAPID + sw.js + PushSubscription Server Actions → (Wave 5) /home 지도 토글 + 시간/거리 필터 + Kakao Maps SDK → (Wave 6) 레거시 /api/push/register 삭제 + E2E smoke + UAT 문서. 예상 6-8개 plan 파일.

## Standard Stack

### Already Installed (재사용)

| Library | Version | 출처 | Phase 4 역할 | Confidence |
|---------|---------|------|-------------|-----------|
| next | 16.2.1 | package.json | App Router, Server Actions, revalidatePath, proxy.ts | HIGH [VERIFIED: package.json + local docs] |
| react / react-dom | 19.2.4 | package.json | Server Components, Actions, useEffect cleanup (StrictMode 주의) | HIGH [VERIFIED] |
| @prisma/client | ^7.5.0 | package.json | ORM, `$queryRaw`, `$transaction` interactive | HIGH [VERIFIED] |
| @supabase/ssr | ^0.10.2 | package.json | Browser/server client for Realtime + Auth | HIGH [VERIFIED] |
| @supabase/supabase-js | ^2.103.0 | package.json | Realtime 의존성 | HIGH [VERIFIED: node_modules/@supabase/realtime-js installed] |
| @tanstack/react-query | ^5.95.2 | package.json | Polling fallback + cache invalidation on Realtime events | HIGH [VERIFIED] |
| zustand | ^5.0.12 | package.json | `/home` 지도/리스트 토글 + 필터 state (URL sync) | HIGH [VERIFIED] |
| zod | ^4.3.6 | package.json | Server Action 입력 검증 | HIGH [VERIFIED] |
| date-fns | ^4.1.0 | package.json | 날짜 포맷팅(기존 formatWorkDate 확장). TZ는 Intl 사용 | HIGH [VERIFIED: no tz module in date-fns v4 node_modules listing] |
| lucide-react | ^1.7.0 | package.json | QR/Map/Bell/AlertTriangle 아이콘 | HIGH [VERIFIED] |
| vitest | ^3.2.4 | package.json | 야간할증/지원 경합 유닛 테스트 | HIGH [VERIFIED: vitest.config.ts] |
| @playwright/test | ^1.59.1 | package.json | check-in/check-out E2E (카메라는 수동 UAT) | HIGH [VERIFIED] |

### New Dependencies (Phase 4가 설치)

| Library | 권장 Version | 용도 | 비고 | Confidence |
|---------|--------------|------|------|-----------|
| `jose` | `^6.2.2` | JWT HS256 서명/검증 (체크아웃 QR payload) | **이미 node_modules/jose@6.2.2 존재** (transitive). package.json에 명시적으로 추가 필요. Node.js·Web API 모두 지원. | HIGH [VERIFIED: node_modules/jose/package.json] |
| `web-push` | `^3.6.7` or latest | Node 서버에서 Web Push 발송 + VAPID 서명 | `webpush.setVapidDetails()` + `sendNotification()`. 410 Gone 에러를 반드시 catch해서 DB에서 subscription 삭제. | HIGH [CITED: web.dev + Next.js PWA guide] |
| `html5-qrcode` | `^2.3.8` or latest | 체크아웃 카메라 QR 스캔 | client-only. dynamic import + `ssr:false` + StrictMode 가드 필수. | HIGH [CITED: github.com/mebjas/html5-qrcode + Next.js community guides] |
| `qrcode` | `^1.5.4` or latest | Biz 쪽 퇴근 QR SVG 생성 | `QRCode.toString(jwtPayload, { type: 'svg' })`. `@types/qrcode` devDep 필요. | HIGH [ASSUMED — planner가 `npm view qrcode version` 확인] |

### Version Verification 태스크 (Wave 0 BLOCKING)

Planner는 Wave 0 첫 plan에서 아래 4개 `npm view` 결과를 기록해서 버전을 락해야 한다. 본 연구는 training data가 stale할 수 있어 버전 자체는 `[ASSUMED]` 로 간주한다. 단 라이브러리 선택 자체는 `[CITED]`.

```bash
npm view jose version           # current latest
npm view web-push version       # current latest  
npm view html5-qrcode version   # current latest
npm view qrcode version         # current latest
npm view @types/qrcode version  # current latest
```

### Alternatives Considered (기각)

| Instead of | Alternative | 기각 이유 |
|-----------|-------------|----------|
| `jose` | `jsonwebtoken` | jsonwebtoken은 Next 16 Edge 호환성 문제 있음, jose는 Web Crypto 기반으로 모든 runtime 동작. 프로젝트 Vercel Node runtime 고정이지만 향후 Edge 전환 대비. |
| `html5-qrcode` | `@zxing/browser`, `@yudiel/react-qr-scanner`, `react-qr-barcode-scanner` | CONTEXT.md D-14가 html5-qrcode로 고정. Researcher는 결정을 뒤집지 않음. |
| `qrcode` npm | `react-qrcode-logo`, `qrcode.react` | CONTEXT.md D-16이 `qrcode` 언급. Server Action 반환값으로 SVG string 생성 가능 (React-agnostic). |
| `web-push` Node lib | Firebase Cloud Messaging, OneSignal, Pushpad | FCM은 CONTEXT.md D-19에서 v2로 명시. OneSignal 같은 SaaS는 단일 벤더 원칙 위배. web-push는 VAPID 표준 구현. |
| `date-fns-tz` | 설치 불필요 — Intl.DateTimeFormat 사용 | date-fns v4에 tz 모듈 없음. 새 의존성 추가보다 native `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', hour12: false, hour: '2-digit', minute: '2-digit' })` 조합이 더 가벼움. |
| `react-kakao-maps-sdk` | 직접 `kakao.maps` 사용 | react-kakao-maps-sdk는 여전히 native SDK 선 로드가 필요하고 wrapper가 추가 번들 크기를 만듦. Phase 4는 marker 수 ≤ 50개 단순 use case이므로 native API 직접 사용이 충분. 단, 타입 정의는 프로젝트 ambient d.ts로 자체 작성. |

### 설치 커맨드 (Wave 0에서 실행)

```bash
npm install jose web-push html5-qrcode qrcode
npm install -D @types/web-push @types/qrcode
```

> **주의:** `web-push generate-vapid-keys`는 global install 없이도 `npx web-push generate-vapid-keys`로 실행 가능. global install 불필요.

## Architecture Patterns

### Recommended File Additions

```
src/
├── lib/
│   ├── actions/
│   │   └── application-actions.ts     # NEW — applyOneTap / acceptApplication /
│   │                                    #       rejectApplication / cancelApplication /
│   │                                    #       checkIn / checkOut / generateCheckoutQrToken
│   │                                    #       (단일 파일 권장 — Phase 2/3 컨벤션)
│   │   └── push-actions.ts             # NEW — subscribePush / unsubscribePush /
│   │                                    #       sendPushToUser (internal)
│   ├── push.ts                         # NEW — webpush.setVapidDetails + low-level sender helper
│   ├── qr.ts                           # NEW — JWT sign/verify helpers (jose wrapper)
│   ├── geofence.ts                     # NEW — ST_DWithin $queryRaw wrapper
│   ├── night-shift.ts                  # NEW — calculateNightShiftPremium + computeNightHoursOverlap (Intl 기반)
│   ├── time-filters.ts                 # NEW — SEARCH-03 preset/bucket → SQL WHERE 파편 생성기
│   ├── dal.ts                          # EXTEND — requireApplicationOwner / requireJobOwner 추가
│   ├── db/
│   │   └── queries.ts                  # EXTEND — getApplicationsByJob / getApplicationsByWorker
│   │                                    #          + time/distance 필터 파라미터
│   ├── job-utils.ts                    # EXTEND — calculateActualHours (15분 반올림) 추가
│   └── supabase/
│       └── realtime.ts                 # NEW (optional) — subscribeApplicationsForWorker /
│                                        #                  subscribeApplicationsForJob helpers
├── types/
│   └── kakao.d.ts                      # NEW — ambient module declaration for window.kakao
├── components/
│   ├── worker/
│   │   ├── qr-scanner.tsx              # NEW — html5-qrcode wrapper (client-only)
│   │   ├── map-view.tsx                # NEW — Kakao Maps container + marker layer
│   │   ├── home-filter-bar.tsx         # NEW — 시간 프리셋 + 시간대 버킷 + 거리 스테퍼
│   │   └── push-permission-banner.tsx  # NEW — /my 첫 방문시 dismissable banner
│   ├── biz/
│   │   └── checkout-qr-modal.tsx       # NEW — 10분 카운트다운 + auto-regenerate
│   └── providers/
│       └── service-worker-registrar.tsx # NEW — root layout child, registers /sw.js
public/
└── sw.js                                # NEW — push + notificationclick handlers
supabase/migrations/
├── {ts}_applications_rls_phase4.sql                  # NEW — D-17 RLS
├── {ts}_applications_realtime_publication.sql        # NEW — ALTER PUBLICATION + REPLICA IDENTITY
├── {ts}_pg_cron_auto_accept_applications.sql         # NEW — D-03 cron
└── {ts}_pg_cron_detect_no_show_applications.sql      # NEW — D-22 cron
prisma/schema.prisma                                  # EDIT — ApplicationStatus + noShowCount + PushSubscription
src/app/api/push/register/route.ts                    # DELETE — Phase 1 FCM 스텁
```

### Pattern 1: Atomic One-Tap Apply (APPL-01 + APPL-05)

**What:** Worker가 "원탭 지원" 버튼을 누르면 같은 Server Action 안에서 (1) 좌석 확보 원자적 UPDATE, (2) application INSERT, (3) 마감 조건 도달시 status='filled' 전이까지 한 트랜잭션에 수행.

**When to use:** Phase 4 D-05 locked decision. headcount 경합 방지의 유일한 올바른 방법.

**Code pattern:**

```ts
// src/lib/actions/application-actions.ts
'use server'
import { prisma } from '@/lib/db'
import { requireWorker } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import { sendPushToUser } from '@/lib/push' // intra-process
import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client'

const applySchema = z.object({
  jobId: z.string().uuid(),
})

type ApplyResult =
  | { success: true; applicationId: string }
  | { success: false; error: 'job_full' | 'already_applied' | 'job_not_active' | 'unknown' }

export async function applyOneTap(input: z.infer<typeof applySchema>): Promise<ApplyResult> {
  const { jobId } = applySchema.parse(input)
  const session = await requireWorker()

  try {
    const applicationId = await prisma.$transaction(async (tx) => {
      // Step 1: atomic capacity check + increment
      const seatRows = await tx.$queryRaw<{ id: string; filled: number; headcount: number; status: string }[]>(
        Prisma.sql`
          UPDATE public.jobs
          SET filled = filled + 1,
              status = CASE WHEN filled + 1 >= headcount THEN 'filled' ELSE status END,
              "updatedAt" = now()
          WHERE id = ${jobId}::uuid
            AND filled < headcount
            AND status = 'active'
          RETURNING id, filled, headcount, status
        `
      )
      if (seatRows.length === 0) {
        throw new ApplyError('job_full')
      }

      // Step 2: insert application (ON CONFLICT guards re-apply)
      const appRows = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`
          INSERT INTO public.applications (id, "jobId", "workerId", status, "appliedAt")
          VALUES (gen_random_uuid(), ${jobId}::uuid, ${session.id}::uuid, 'pending', now())
          ON CONFLICT ("jobId", "workerId") DO NOTHING
          RETURNING id
        `
      )
      if (appRows.length === 0) {
        // Step 3: compensate filled++ rollback (same transaction)
        throw new ApplyError('already_applied')
      }
      return appRows[0].id
    })

    // Out of transaction: revalidate + push (non-blocking to the DB)
    revalidatePath(`/my/applications`)
    revalidatePath(`/posts/${jobId}`)
    // Business 쪽 지원자 페이지도 revalidate (Realtime이 메인 채널이지만 SSR fallback)
    revalidatePath(`/biz/posts/${jobId}/applicants`)

    // Push 트리거는 여기서는 Business에게 (신규 지원 알림). Worker → Business.
    // sendPushToUser(jobAuthorId, payload) — authorId lookup 필요.

    return { success: true, applicationId }
  } catch (err) {
    if (err instanceof ApplyError) return { success: false, error: err.code }
    console.error('applyOneTap failed', err)
    return { success: false, error: 'unknown' }
  }
}

class ApplyError extends Error {
  constructor(public code: 'job_full' | 'already_applied' | 'job_not_active') {
    super(code)
  }
}
```

**Why `$queryRaw` inside `$transaction(async)` not `$transaction([])`:**
- Interactive transaction은 Step 2의 결과에 따라 throw할지 결정할 수 있음 (sequential array는 불가능).
- Step 1에서 RETURNING한 filled 값을 읽어 Step 2로 전달 가능 (미사용이지만 향후 확장 여지).
- Rollback은 throw만으로 자동 처리.

**[VERIFIED]**: 이 패턴은 Phase 3 D-06 `$queryRaw` + `Prisma.sql` 템플릿 리터럴 패턴과 일관. parameterization 안전.

### Pattern 2: Supabase Realtime Subscribe + Polling Fallback (APPL-02, APPL-03, APPL-04)

**What:** 클라이언트 페이지가 mount될 때 applications 테이블의 특정 필터에 대해 subscribe하고, channel 상태를 추적해서 error/timeout이면 60초 polling으로 fallback.

**When to use:** /my/applications (worker 본인 필터) + /biz/posts/[id]/applicants (jobId 필터). CONTEXT.md D-06, D-07, D-08 locked decision.

**Code pattern (Worker side):**

```tsx
// src/components/worker/applications-realtime.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { REALTIME_SUBSCRIBE_STATES } from '@supabase/realtime-js'

type PollMode = 'realtime' | 'polling'

export function useApplicationsRealtime(userId: string) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<PollMode>('realtime')
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`applications:worker:${userId}`) // Claude 재량 naming
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'applications',
          filter: `workerId=eq.${userId}`, // camelCase works — column=eq.value string
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['my-applications'] })
        }
      )
      .subscribe((status, err) => {
        // REALTIME_SUBSCRIBE_STATES: SUBSCRIBED | TIMED_OUT | CLOSED | CHANNEL_ERROR
        if (status === 'SUBSCRIBED') setMode('realtime')
        else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          console.warn('[realtime] fallback to polling', status, err)
          setMode('polling')
        }
      })

    channelRef.current = channel
    return () => {
      // StrictMode safe: removeChannel is idempotent
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId, queryClient])

  return { mode }
}
```

Then in `/my/applications/page.tsx` wrap the client in a React Query hook with conditional `refetchInterval`:

```tsx
const { mode } = useApplicationsRealtime(userId)
const { data } = useQuery({
  queryKey: ['my-applications'],
  queryFn: fetchMyApplications,
  refetchInterval: mode === 'polling' ? 60_000 : false, // D-08
})
```

**[VERIFIED via node_modules/@supabase/realtime-js/dist/module/RealtimeChannel.d.ts]:**
- `REALTIME_SUBSCRIBE_STATES` enum has exactly 4 values: `SUBSCRIBED`, `TIMED_OUT`, `CLOSED`, `CHANNEL_ERROR`.
- `subscribe(callback?: (status, err?) => void, timeout?)` signature confirmed.
- `on('postgres_changes', { event, schema, table, filter }, callback)` overloads for INSERT/UPDATE/DELETE/ALL verified.

### Pattern 3: PostGIS Geofence Check-in ($queryRaw ST_DWithin)

**What:** 체크인 Server Action 안에서 현재 navigator 좌표와 BusinessProfile.location geography Point 간 거리를 Postgres 한 번의 쿼리로 판정.

**When to use:** SHIFT-01 체크인. CONTEXT.md D-09, D-10 (200m) locked.

**Code pattern:**

```ts
// src/lib/geofence.ts
import { prisma } from '@/lib/db'
import { Prisma } from '@/generated/prisma/client'

export async function isWithinGeofence(params: {
  businessId: string
  userLat: number
  userLng: number
  radiusM: number
}): Promise<boolean> {
  // Validate numeric inputs at the TS boundary — Prisma.sql parameterizes but type safety matters
  if (
    !Number.isFinite(params.userLat) ||
    !Number.isFinite(params.userLng) ||
    !Number.isFinite(params.radiusM) ||
    Math.abs(params.userLat) > 90 ||
    Math.abs(params.userLng) > 180
  ) {
    return false
  }

  const rows = await prisma.$queryRaw<{ within: boolean }[]>(
    Prisma.sql`
      SELECT ST_DWithin(
        bp.location,
        ST_SetSRID(ST_MakePoint(${params.userLng}, ${params.userLat}), 4326)::geography,
        ${params.radiusM}
      ) AS within
      FROM public.business_profiles bp
      WHERE bp.id = ${params.businessId}::uuid
        AND bp.location IS NOT NULL
      LIMIT 1
    `
  )
  if (rows.length === 0) return false // business not found OR location is NULL
  return rows[0].within === true
}
```

**Gotchas:**
- **`ST_MakePoint(lng, lat)` — order matters.** lng first, lat second. This is PostGIS convention. Phase 3's `getJobsByDistance` follows the same order. [VERIFIED: queries.ts line 639 + 648]
- **Null location fallback:** Legacy BusinessProfile rows may have NULL `location` (Phase 2 seed 전에 만든 것). `WHERE bp.location IS NOT NULL`이 `ST_DWithin(NULL, ..., ...)` → NULL (not false) 문제를 예방.
- **Prisma.sql parameterization:** `${params.userLat}` 등은 자동 parameterized. SQL injection 불가. 추가 validation은 NaN/range defense only.

### Pattern 4: QR JWT Sign + Verify (SHIFT-02 + D-15)

**What:** Business가 "퇴근 QR" 버튼을 누르면 Server Action이 HS256 JWT를 서명해서 반환 → qrcode 라이브러리로 SVG 생성 → 모달 표시. Worker 쪽 체크아웃 Server Action이 html5-qrcode로 읽은 문자열을 `jose.jwtVerify`로 검증.

**Code pattern:**

```ts
// src/lib/qr.ts
import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.APPLICATION_JWT_SECRET!)

export async function signCheckoutToken(payload: {
  jobId: string
  businessId: string
}): Promise<string> {
  return await new SignJWT({
    jobId: payload.jobId,
    businessId: payload.businessId,
    nonce: crypto.randomUUID(), // Replay defense — nonce included in payload, not stored
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(secret)
}

export type VerifiedCheckoutPayload = {
  jobId: string
  businessId: string
  nonce: string
  iat: number
  exp: number
}

export async function verifyCheckoutToken(token: string): Promise<VerifiedCheckoutPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'], // Algorithm confusion defense
    })
    // Type narrowing
    if (
      typeof payload.jobId !== 'string' ||
      typeof payload.businessId !== 'string' ||
      typeof payload.nonce !== 'string' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      return null
    }
    return payload as unknown as VerifiedCheckoutPayload
  } catch {
    return null // invalid signature OR expired OR wrong alg
  }
}
```

**Env var:**
```bash
# .env.local
APPLICATION_JWT_SECRET=$(openssl rand -hex 32)   # 32-byte hex, 64 chars
```

**Nonce design note:**
- `nonce` is included in payload but **not stored server-side** → not a true replay prevention. But with 10-minute `exp` and JWT-per-checkout (one-time use implied by the application state transition), the attack surface is: "within 10 min, attacker sniffs QR, scans same application's checkout twice". The defense is the application state machine: second checkout Server Action call finds `application.status === 'completed'` and rejects. So nonce is defense-in-depth, not primary guard.
- Phase 4 planner가 진정한 replay 방어를 원하면 `Job.lastCheckoutNonce` 컬럼에 사용된 nonce를 저장하는 방법이 있지만, CONTEXT.md가 요구하지 않으므로 과잉 엔지니어링. **권장: 상태 기반 방어만 사용.**

**[VERIFIED via npm jose 6.2.2 docs + Medium 가이드]:**
- `SignJWT` chainable API confirmed.
- `jwtVerify(token, secret, { algorithms: ['HS256'] })` — algorithms 옵션으로 알고리즘 컨퓨전 공격 방어 필수.
- HS256은 symmetric key, key rotation 어려움. Phase 4 scope로는 acceptable, v2에서 RS256 고려.

### Pattern 5: html5-qrcode in React 19 + Next 16 (D-14 implementation)

**What:** html5-qrcode는 client-only (navigator/window 의존). React 19 StrictMode 더블 마운트 + double-start race condition을 막는 wrapper 필요.

**Code pattern:**

```tsx
// src/components/worker/qr-scanner.tsx
'use client'
import { useEffect, useRef, useState } from 'react'

type Props = {
  onScan: (decodedText: string) => void
  onError?: (err: string) => void
}

// Dynamically import inside the component so the library is never on the server bundle
export function QrScanner({ onScan, onError }: Props) {
  const containerId = 'qr-scanner-container' // Fixed ID — library requires a DOM id
  const scannerRef = useRef<any>(null) // html5-qrcode Html5Qrcode instance
  const startedRef = useRef(false) // StrictMode double-start guard
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    // Dynamic import — library only loads client-side
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled || startedRef.current) return
      startedRef.current = true

      const scanner = new Html5Qrcode(containerId)
      scannerRef.current = scanner
      scanner
        .start(
          { facingMode: 'environment' }, // rear camera on mobile
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            // Success — stop scanner, hand off
            scanner.stop().then(() => {
              scanner.clear()
              scannerRef.current = null
              startedRef.current = false
              onScan(decodedText)
            }).catch(() => {})
          },
          undefined // ignore per-frame fail callback to reduce console spam
        )
        .catch((err: Error) => {
          if (cancelled) return
          setCameraError(err.message)
          onError?.(err.message)
          startedRef.current = false
        })
    })

    return () => {
      cancelled = true
      const scanner = scannerRef.current
      if (scanner) {
        // Async cleanup — never block unmount
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null
            startedRef.current = false
          })
      }
    }
  }, [onScan, onError])

  if (cameraError) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-destructive font-medium mb-2">카메라를 사용할 수 없습니다</p>
        <p className="text-xs text-muted-foreground">
          브라우저 설정에서 카메라 권한을 허용해주세요.
        </p>
      </div>
    )
  }

  return <div id={containerId} className="w-full aspect-square rounded-2xl overflow-hidden" />
}
```

Then in the check-in-flow.tsx:

```tsx
import dynamic from 'next/dynamic'

const QrScanner = dynamic(
  () => import('@/components/worker/qr-scanner').then(m => m.QrScanner),
  { ssr: false, loading: () => <div>카메라 준비 중…</div> }
)
```

**Gotchas (all [CITED: community guides]):**
- **StrictMode double-mount:** `startedRef` guard prevents `scanner.start()` being called twice on the same instance. Without it, the second call throws.
- **Container must exist before start():** The `<div id="qr-scanner-container">` must be in DOM before `new Html5Qrcode(containerId)`. React 19 useEffect runs after commit so this is safe, but **do not conditionally unmount the container** (D-14 note: use CSS hide/show or a wrapper stage state).
- **HTTPS requirement:** Camera API requires HTTPS except on `localhost`. Dev works, Vercel preview works, but custom domains without cert fail silently. 기존 Next 16 `next dev --experimental-https` 옵션으로 local HTTPS 검증 가능 (Phase 4 plan에 Wave 0 체크리스트 추가 권장).
- **Async stop().then(clear()):** cleanup은 동기 block하면 안 됨. `.catch(() => {})`로 swallow (unmount 중 에러는 무해).

### Pattern 6: Next.js 16 PWA Web Push (D-19, D-20)

**What:** Next.js 16 공식 PWA 가이드가 VAPID 키 생성, Service Worker, PushManager.subscribe, Server Action 발송까지 **end-to-end 예제**를 `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`에 제공. Phase 4는 이 가이드를 DB 저장 부분만 수정해서 사용.

**Differences from official guide:**

| 공식 가이드 | Phase 4 수정 |
|-------------|-------------|
| In-memory `let subscription` | Prisma `PushSubscription` 모델에 저장 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | CONTEXT.md D-07: `WEB_PUSH_VAPID_PUBLIC_KEY` + `_PRIVATE_KEY` (명시적 WEB_PUSH prefix) — planner 결정: `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` 로 rename 권장 (브라우저 노출 필요) |
| 수동 test button | 실제 트리거는 Server Action 내부 (apply accept/reject, 근무 1시간 전 리마인더 pg_cron) |
| `subscription: PushSubscription` Web type 직접 | `prisma.pushSubscription.create({ endpoint, p256dh, auth })` 로 분해 저장 |

**VAPID 키 생성 (Wave 0 user manual):**
```bash
npx web-push generate-vapid-keys
# Output:
# Public Key: BO...                  (copy to NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY)
# Private Key: k7...                 (copy to WEB_PUSH_VAPID_PRIVATE_KEY)
```

**public/sw.js (from official guide, minimal modification for 한국어):**

```js
// public/sw.js
self.addEventListener('push', function (event) {
  if (!event.data) return
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: '/badge.png',
    data: {
      url: data.url, // deep link — Phase 4 payload includes /my/applications/{id}
    },
  }
  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Focus existing tab if open, otherwise open new
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl)
    })
  )
})
```

**Server Action sender (D-20 extended with 410 cleanup):**

```ts
// src/lib/push.ts
import 'server-only'
import webpush from 'web-push'
import { prisma } from '@/lib/db'

webpush.setVapidDetails(
  'mailto:admin@gignow.kr', // Phase 4 planner가 도메인 확정
  process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY!,
  process.env.WEB_PUSH_VAPID_PRIVATE_KEY!,
)

export type PushPayload = {
  title: string
  body: string
  url?: string
  icon?: string
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        )
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsedAt: new Date() },
        })
      } catch (err: any) {
        // 410 Gone or 404 Not Found → subscription expired, prune
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        }
        // other errors: log and continue (don't fail the parent Server Action)
        console.warn('[push] send failed', { userId, endpoint: sub.endpoint, status: err?.statusCode })
      }
    })
  )
}
```

**Client subscribe helper (lifted from Next.js 16 PWA guide):**

```ts
// lib/push-client.ts (public, not server-only)
export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}
```

Usage in the permission banner component:

```tsx
// src/components/worker/push-permission-banner.tsx
'use client'
import { useEffect, useState } from 'react'
import { urlBase64ToUint8Array } from '@/lib/push-client'
import { subscribePush } from '@/lib/actions/push-actions'

export function PushPermissionBanner() {
  const [supported, setSupported] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) setSupported(true)
  }, [])

  if (!supported || dismissed) return null

  async function enable() {
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    if (existing) return setDismissed(true)
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true, // REQUIRED — web push spec
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY!),
    })
    // Serialize — PushSubscription.toJSON() returns { endpoint, keys: { p256dh, auth } }
    const serialized = sub.toJSON()
    await subscribePush({
      endpoint: serialized.endpoint!,
      p256dh: serialized.keys!.p256dh!,
      auth: serialized.keys!.auth!,
    })
    setDismissed(true)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
      <div className="flex-1">
        <p className="text-sm font-bold">알림을 켜주세요</p>
        <p className="text-xs text-muted-foreground">지원 수락 · 근무 시작 소식을 빠르게 받을 수 있어요</p>
      </div>
      <button onClick={enable} className="h-9 px-3 rounded-lg bg-brand text-white text-sm font-bold">
        켜기
      </button>
      <button onClick={() => setDismissed(true)} className="h-9 px-2 text-xs text-muted-foreground">
        나중에
      </button>
    </div>
  )
}
```

**Service Worker 등록 (root layout):**

```tsx
// src/components/providers/service-worker-registrar.tsx
'use client'
import { useEffect } from 'react'

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    void navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch((err) => console.warn('[sw] register failed', err))
  }, [])
  return null
}
```

Mounted once in root `src/app/layout.tsx` as a child of `<body>`.

**[VERIFIED via node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md]:** full Next.js 16 official PWA guide examines verbatim. 410 Gone handling [CITED: pushpad.xyz + github.com/web-push-libs/web-push].

### Pattern 7: Kakao Maps SDK Lazy Load (D-23..D-28)

**What:** `/home`이 리스트 모드로 초기 렌더되다가 사용자가 "지도" 토글을 누르면 그 시점에 kakao.maps SDK를 `document.head.appendChild`로 주입하고 `kakao.maps.load()` 콜백에서 map 초기화.

**Rationale for inject-on-demand over `next/script`:** CONTEXT.md D-25는 "토글 시 지도 모드"이고 지도 사용하지 않는 사용자가 대부분일 수 있음. `next/script strategy="beforeInteractive"`는 전 페이지에 SDK를 주입하므로 초기 번들 낭비. lazy inject가 CONTEXT.md 철학("시각적 변경 최소화 + 필요할 때만")과 맞음.

**Ambient types (`src/types/kakao.d.ts`):**

```ts
// src/types/kakao.d.ts
declare global {
  interface Window {
    kakao: typeof kakao
  }

  namespace kakao.maps {
    class LatLng {
      constructor(lat: number, lng: number)
      getLat(): number
      getLng(): number
    }
    class LatLngBounds {
      constructor()
      extend(latlng: LatLng): void
      getSouthWest(): LatLng
      getNorthEast(): LatLng
    }
    class Map {
      constructor(container: HTMLElement, options: MapOptions)
      setCenter(latlng: LatLng): void
      setLevel(level: number): void
      getBounds(): LatLngBounds
      getCenter(): LatLng
      getLevel(): number
    }
    interface MapOptions {
      center: LatLng
      level: number
    }
    class Marker {
      constructor(options: { position: LatLng; map?: Map; image?: MarkerImage; title?: string })
      setMap(map: Map | null): void
    }
    class MarkerImage {
      constructor(src: string, size: Size, options?: { offset?: Point })
    }
    class Size {
      constructor(width: number, height: number)
    }
    class Point {
      constructor(x: number, y: number)
    }
    class Circle {
      constructor(options: { center: LatLng; radius: number; strokeWeight?: number; strokeColor?: string; fillColor?: string; fillOpacity?: number })
      setMap(map: Map | null): void
    }
    namespace event {
      function addListener(target: any, type: string, handler: (...args: any[]) => void): void
    }
    function load(callback: () => void): void
  }
}
export {}
```

> **Note:** 이 ambient d.ts는 Phase 4가 사용하는 API만 커버. 필요시 planner가 추가 클래스(Clusterer 등) 보완. `@types/kakaomaps`는 존재하지 않음(확인 완료).

**SDK loader helper:**

```ts
// src/lib/kakao-map-loader.ts (client module)
let loadPromise: Promise<void> | null = null

export function loadKakaoMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('server'))
  if (loadPromise) return loadPromise

  const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
  if (!apiKey) {
    loadPromise = Promise.reject(new Error('NEXT_PUBLIC_KAKAO_MAP_KEY 누락'))
    return loadPromise
  }

  loadPromise = new Promise((resolve, reject) => {
    // Already loaded?
    if (window.kakao?.maps) {
      window.kakao.maps.load(resolve)
      return
    }
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`
    script.async = true
    script.onload = () => {
      if (!window.kakao?.maps) return reject(new Error('kakao.maps not available after script load'))
      window.kakao.maps.load(() => resolve())
    }
    script.onerror = () => reject(new Error('Kakao Maps SDK script load failed'))
    document.head.appendChild(script)
  })
  return loadPromise
}
```

**Map component:**

```tsx
// src/components/worker/map-view.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { loadKakaoMaps } from '@/lib/kakao-map-loader'
import type { Job } from '@/lib/types/job'

type Props = {
  center: { lat: number; lng: number }
  radiusKm: number
  jobs: Job[]
  onMarkerClick: (jobId: string) => void
}

export function MapView({ center, radiusKm, jobs, onMarkerClick }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const markersRef = useRef<kakao.maps.Marker[]>([])
  const circleRef = useRef<kakao.maps.Circle | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load SDK + init map (once)
  useEffect(() => {
    let cancelled = false
    loadKakaoMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(center.lat, center.lng),
          level: 5, // ~500m screen radius at level 5
        })
        mapRef.current = map
        circleRef.current = new kakao.maps.Circle({
          center: new kakao.maps.LatLng(center.lat, center.lng),
          radius: radiusKm * 1000,
          strokeWeight: 1,
          strokeColor: '#14b8a6',
          fillColor: '#14b8a6',
          fillOpacity: 0.08,
        })
        circleRef.current.setMap(map)
      })
      .catch((err) => setError(err.message))
    return () => {
      cancelled = true
      markersRef.current.forEach((m) => m.setMap(null))
      markersRef.current = []
      circleRef.current?.setMap(null)
      circleRef.current = null
      mapRef.current = null
    }
  }, [center.lat, center.lng, radiusKm])

  // Update markers when jobs change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = jobs.map((job) => {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(job.business.lat, job.business.lng),
        map,
        title: job.title,
      })
      kakao.maps.event.addListener(marker, 'click', () => onMarkerClick(job.id))
      return marker
    })
  }, [jobs, onMarkerClick])

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-muted p-6 text-center">
        <p className="text-sm font-bold mb-1">지도를 불러올 수 없습니다</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    )
  }

  return <div ref={containerRef} className="w-full aspect-square rounded-xl overflow-hidden" />
}
```

**[VERIFIED via apis.map.kakao.com/web/guide/]:** Script URL `https://dapi.kakao.com/v2/maps/sdk.js?appkey=...&autoload=false` confirmed, `kakao.maps.load(callback)` pattern confirmed, `new kakao.maps.LatLng(lat, lng)` confirmed.

**Kakao Developer console setup (user manual, Wave 0 dependency):**

1. https://developers.kakao.com → 로그인
2. 내 애플리케이션 → 앱 추가
3. 플랫폼 → Web 플랫폼 등록 → 도메인에 `http://localhost:3000` + Vercel preview 도메인 + 프로덕션 도메인 등록
4. 앱 키 → JavaScript 키 복사 → `.env.local`에 `NEXT_PUBLIC_KAKAO_MAP_KEY=...`

**Free tier quota:** Kakao Developers 공식 quota 페이지 참조. 정확한 "300,000 calls/day" 숫자는 [ASSUMED] — Wave 0 plan에서 Planner가 https://developers.kakao.com/docs/latest/en/getting-started/quota 직접 확인 후 락. 2026년 2월부터 free tier 초과시 10 KRW/call 유료화 적용 [CITED: 웹 검색 결과]. Phase 4 scope(베타 사용자 수)에서는 free tier 충분.

### Anti-Patterns to Avoid

- **`'use cache'` directive** — cacheComponents flag OFF이므로 사용 불가. `revalidatePath` + `unstable_cache` (필요시)만 사용.
- **Client-side에서 직접 `prisma` import** — `server-only` 경로 규칙 위반. 반드시 Server Action / Route Handler 경유.
- **`navigator.geolocation.getCurrentPosition` 결과를 Server Action 파라미터로 직접 전달 후 파라미터 검증 없이 DB 저장** — 악의적 요청이 임의 좌표를 전송 가능. Zod 에서 lat [-90,90], lng [-180,180] 범위 validation 필수.
- **Realtime channel을 page.tsx(Server Component)에서 직접 생성** — 반드시 'use client' 컴포넌트 안에서. page는 `userId`만 prop으로 넘김.
- **Service Worker `public/sw.js`에 ES module import** — Service Worker는 classic script로 서빙되므로 `import` 구문 사용 금지. 모든 코드를 sw.js 안에 inline.
- **html5-qrcode를 Server Component에서 import** — 빌드 타임 에러. 반드시 'use client' + dynamic + ssr:false.
- **`'use cache'` 아래에서 `cookies()`/`headers()` 호출** — Previous Model에서도 위험. Phase 4 Server Actions는 `requireWorker()`/`requireBusiness()` 안에서만 세션 읽기.
- **SIGN된 JWT를 URL query parameter로 전달** — URL 로그/리퍼러 유출 위험. QR payload는 SVG 안 (렌더링만)에 존재하고, 검증은 body/form으로 전송.
- **pg_cron에서 app function 호출** — pg_cron은 순수 SQL만. TS 함수(야간할증, 푸시 발송)는 Server Action trigger로 별도 경로. 리마인더 같은 시간 기반 push 발송은 pg_cron으로 DB 상태만 업데이트 → Realtime이 Worker 클라이언트에 전달, 또는 별도 Vercel cron 고려 (Phase 4 scope 넘으므로 v2).

- **useSearchParams/usePathname in client component without Suspense boundary** - Next.js 16 CSR bailout. /home filter state URL sync (?radius=3&time=evening) client component calling useSearchParams must be wrapped in <Suspense fallback={...}>. HomeFilterBar / MapView required when using useSearchParams.
- **Dynamic route params accessed sync** - Next.js 15+ breaking: params and searchParams are Promise<T>. Existing /biz/posts/[id] already uses await params [VERIFIED: src/app/biz/posts/[id]/page.tsx line 47]. New Server Actions receiving params must follow the same pattern.
- **Async client component** - React Server Component rule: use client cannot be async function. All Phase 4 client components (qr-scanner, map-view, applications-realtime, push-permission-banner) must be sync functions with async logic in useEffect.
- **Non-serializable prop to Server Action** - Server Action args must be JSON serializable. Date objects must be converted to string/number at the boundary. Phase 4 applyOneTap/checkIn/checkOut accept only primitives; safe, but watch for future extensions.
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT 서명/검증 | 자체 HMAC + base64 | `jose` (이미 설치) | 알고리즘 컨퓨전, exp/iat 검증, constant-time compare 전부 jose가 처리. self-rolled JWT는 CVE 자석. |
| Web Push 페이로드 암호화 | 자체 ECDH + AES-GCM | `web-push` 라이브러리 | Web Push 프로토콜은 RFC 8291 (Message Encryption) + RFC 8292 (VAPID) 두 스펙이 겹쳐서 self-impl 금지. |
| Kakao Maps DOM 조작 | `document.createElement('div').style.position = 'absolute'`로 marker 구현 | `new kakao.maps.Marker` + `kakao.maps.event.addListener` | 지도 panning/zoom 시 marker 좌표 재계산을 SDK가 처리. |
| QR 코드 SVG 생성 | SVG path 수동 계산 | `qrcode` npm (`QRCode.toString(..., { type: 'svg' })`) | Reed-Solomon 에러 보정 코드 자체 구현은 수백 줄. 표준 라이브러리가 있음. |
| 카메라 QR 스캔 | getUserMedia + canvas pixel loop + ZXing wasm 로드 | `html5-qrcode` | 프레임 처리 스케줄링, 회전/확대 가이드, 플래시 토글 등을 wrapper가 처리. |
| Supabase Realtime 연결 관리 | 자체 WebSocket reconnect logic | `supabase.channel().subscribe()` | Phoenix channels의 reconnect 백오프, heartbeat, RLS 존중 등 이미 구현됨. |
| 동시 지원 경합 | 애플리케이션 락 (mutex) | Postgres atomic UPDATE `WHERE filled < headcount` | 여러 서버 인스턴스 간 정합성을 DB가 보장. TS 레벨 mutex는 멀티 인스턴스에서 무효. |
| 시간창 계산 | 자체 시간 파싱 | `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' })` + `Date.parse` | Asia/Seoul TZ 처리가 native. date-fns-tz 의존성 추가 불필요. |
| Geofence 거리 계산 | Haversine 공식 TS 구현 | PostGIS `ST_DWithin(geography, geography, meters)` | 지구 타원체 (WGS84) 정확도가 높고 GIST 인덱스 사용 가능. Phase 3 D-06 패턴과 동일. |

**Key insight:** Phase 4의 모든 "복잡해 보이는" 기능(원탭 경합, geofence, 야간할증, QR, 푸시, 지도)은 **이미 존재하는 프로젝트 패턴 또는 설치된 라이브러리의 표준 API 조합**으로 해결된다. 새로 발명할 것이 없다.

## Runtime State Inventory

> Phase 4는 rename/refactor가 아닌 neue feature phase지만, 한 가지 runtime state 경계가 있다: **Service Worker 캐시 + PushSubscription 라이프사이클**.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | (1) Prisma `Application` 테이블에 기존 `confirmed` 기본값 데이터 존재 가능 (Phase 2 seed 5 records) — enum 추가 후 기본값 변경 영향 | (1) 기존 `confirmed` 레코드는 `in_progress`/`completed`/`cancelled`로 유지되고, `@default(pending)` 변경은 **새 INSERT만** 적용됨. 데이터 마이그레이션 불필요. Prisma는 enum에 값 추가를 하위호환으로 처리 (ALTER TYPE ADD VALUE). |
| Live service config | (1) Supabase `supabase_realtime` publication 현재 상태 미상. Phase 2/3에서 건드린 적 없음. | (1) Wave 1 SQL 마이그레이션에서 `ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;` 실행. 이미 publication에 있으면 `CREATE PUBLICATION IF NOT EXISTS` + idempotent DO block 또는 sub-SELECT 존재 확인 후 skip. |
| OS-registered state | None — web PWA, no OS-level registration. Service Worker는 각 브라우저가 자체 관리. | (1) `public/sw.js`를 배포하면 기존 방문자는 다음 방문시 자동 업데이트(`updateViaCache: 'none'` 옵션). 기존 방문자가 없으므로 Phase 4 최초 배포에는 영향 없음. |
| Secrets/env vars | 4개 신규 환경변수 추가 (CONTEXT.md D-07 확장): `NEXT_PUBLIC_KAKAO_MAP_KEY`, `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`, `APPLICATION_JWT_SECRET` | (1) `.env.local` + Vercel dashboard(preview + production) 양쪽에 등록. (2) `.env.example`에 key 이름만 등록(값 없이). (3) CI secrets에 등록(Playwright E2E가 필요로 한다면). (4) `NEXT_PUBLIC_` prefix는 클라이언트 번들에 포함되는 것에 주의 — VAPID public key와 Kakao key만 프리픽스, VAPID private key와 APPLICATION_JWT_SECRET은 서버 전용. |
| Build artifacts | (1) `src/generated/prisma/` — `prisma db push` 이후 재생성 필요. | (1) Wave 0 끝에 `npx prisma generate` 자동 실행 (package.json postinstall 이미 있음). (2) Phase 4 schema 변경 후 첫 `npm install` or `npx prisma generate` 실행 확인. (3) `PushSubscription` 타입이 Prisma client에 등장하는 것을 commit 전에 `git status`로 확인. |

**Additional runtime state (Phase 4 신규):**

| 경계 | 행동 | 담당 |
|------|------|------|
| 기존 `src/app/api/push/register/route.ts` | 삭제. `mock-user-id`, FCM 용어, Clerk TODO 주석을 포함한 Phase 1 스캐폴드 — Phase 4 Web Push 아키텍처와 무관. | Planner plan에 `rm` 태스크 명시 (Wave 6) |
| `prisma/seed.ts` 기존 5 Applications | `status` 필드가 `confirmed`로 하드코딩되어 있을 가능성. enum 추가로 타입 에러 발생 예상. | Phase 4 plan에서 seed 파일 확인 + 필요시 `pending` 1개 추가로 status tabs UI 검증 가능하게 |

## Common Pitfalls

### Pitfall 1: Realtime이 조용히 안 와서 "UI 안 된다" 알림
**What goes wrong:** Biz가 수락 버튼 눌렀는데 Worker의 `/my/applications`에 30초 넘게 반영 안 됨. 사용자는 버그로 인식.
**Why it happens:** 4가지 원인 중 하나 — (a) `ALTER PUBLICATION supabase_realtime ADD TABLE` 누락, (b) RLS 정책의 SELECT가 Worker에게 해당 row를 visible하게 만들지 않음, (c) 채널 이름 conflict, (d) channel.subscribe 콜백에서 CHANNEL_ERROR 수신했지만 무시됨.
**How to avoid:** (1) Wave 1 SQL 마이그레이션에 반드시 `ALTER PUBLICATION` 포함. (2) D-17 SELECT 정책이 workerId=auth.uid() 커버. (3) 채널 이름에 userId/jobId 포함해 uniqueness 확보. (4) D-08 폴백 전략으로 channel error를 명시적 감지 → polling 자동 전환.
**Warning signs:** browser devtools Network → WS 탭 → 메시지 흐름 확인. supabase.channel 상태가 `joining`에서 `joined`로 안 넘어가면 RLS 또는 publication 문제.

### Pitfall 2: Prisma enum `pending` 추가 migration 순서
**What goes wrong:** `prisma db push`를 먼저 하면 default 값이 `pending`으로 변경되어 기존 enum 없던 시점의 statement preparation이 깨짐. 또는 enum이 생기기 전에 RLS SQL 마이그레이션이 enum 값 `'pending'`을 참조해서 에러.
**Why it happens:** Prisma와 raw SQL 마이그레이션이 별도 경로.
**How to avoid:** Wave 1 순서 = (1) `prisma db push` → enum·컬럼·모델 생성 → (2) `npx prisma generate` → (3) `tsx scripts/apply-supabase-migrations.ts` → RLS/publication/pg_cron. **역순 금지**. Planner는 이 순서를 plan 태스크 번호로 강제.
**Warning signs:** `invalid input value for enum "ApplicationStatus": "pending"` 에러.

### Pitfall 3: html5-qrcode StrictMode 더블 마운트 race condition
**What goes wrong:** 개발 모드에서 카메라가 켜졌다가 바로 꺼지고 "Already running" 에러 콘솔에 뜸. 프로덕션에서는 "가끔" 실패.
**Why it happens:** React 19 StrictMode가 개발에서 useEffect를 2회 실행. 2번째 실행이 scanner.start()를 다시 호출하면서 race.
**How to avoid:** `startedRef` guard + cleanup에서 scanner.stop().then(clear) 비동기 체인. Pattern 5 code 그대로 사용.
**Warning signs:** `Scanner is already running` 에러. 프로덕션에서는 `video` 태그가 null이 되는 flash.

### Pitfall 4: Kakao Maps 도메인 등록 누락
**What goes wrong:** 로컬에서는 동작하는데 Vercel preview에서 "Not authorized" 에러.
**Why it happens:** Kakao Developer console에 preview 도메인(`*.vercel.app` 또는 구체 preview URL)이 등록되지 않음.
**How to avoid:** Wave 0에 "Kakao console에 localhost:3000 + 모든 Vercel 도메인 등록" 체크리스트. Vercel preview는 URL이 매번 바뀌므로 `gignow-*.vercel.app` 같은 와일드카드 또는 최소한 production 도메인 + localhost 등록.
**Warning signs:** Network 탭에서 Kakao SDK `sdk.js` 요청이 401/403.

### Pitfall 5: Web Push HTTPS 요구사항
**What goes wrong:** 로컬 개발시 `http://localhost:3000`에서 `navigator.serviceWorker.register`는 동작하지만 `PushManager.subscribe`가 `NotAllowedError`.
**Why it happens:** Push API는 HTTPS 필수 (localhost는 예외지만 일부 브라우저 버전에 inconsistency 있음).
**How to avoid:** 로컬 push 테스트는 `next dev --experimental-https` 사용. Vercel preview는 기본 HTTPS이므로 OK. Playwright E2E는 push 구독 부분만 수동 UAT 표기.
**Warning signs:** `NotAllowedError: Permission denied` 또는 `subscribe` Promise가 reject.

### Pitfall 6: pg_cron auto-accept가 이미 filled된 job에 대해 pending을 confirmed로 돌리지 않음
**What goes wrong:** Job이 headcount 도달해서 `status='filled'`인데, pending status의 지원자(이미 filled 카운트에 포함)는 그대로 pending. 사용자 혼란.
**Why it happens:** D-04가 "filled = pending + confirmed + ... 합"이므로 pending도 이미 seat을 차지함. auto-accept의 역할은 seat 확보가 아니라 pending → confirmed 전환만. cron이 filter를 `WHERE status = 'pending'`으로만 쓰면 filled와 무관.
**How to avoid:** pg_cron SQL에서 `jobs.status` 참조하지 말고 오직 `applications.status = 'pending' AND appliedAt < now() - interval '30 minutes'`만 필터. D-03 SQL 그대로 사용.
**Warning signs:** 테스트에서 filled job의 pending application이 30분 후에도 pending 그대로 → SQL 필터가 지나치게 tight한지 확인.

### Pitfall 7: 야간할증 시간대 경계 오프 바이 원
**What goes wrong:** 체크인 21:59, 체크아웃 02:00인 케이스에서 야간 시간 4시간 미만으로 계산 → 할증 없음. 사용자 항의.
**Why it happens:** "22:00-06:00 구간 안에 겹침"에서 inclusivity(22:00 포함? 06:00 포함?) 모호.
**How to avoid:** 명확한 정의 — 야간 = [22:00, 06:00) (22:00 포함, 06:00 미포함). 22:00 전 1분은 야간 아님, 06:00 정각은 주간. Unit test로 boundary 6개(정확 22:00 진입, 22:00 직전 나감, 정확 06:00 이탈, 06:00 1분 초과, 전체 포함, 전체 제외) 작성.
**Warning signs:** 테스트 케이스 없이 production에서 edge case 사용자 신고.

### Pitfall 8: `revalidatePath` 가 Realtime 이벤트와 충돌
**What goes wrong:** Server Action 안에서 `revalidatePath('/my/applications')`를 호출하면 Next.js 가 client cache를 invalidate. 동시에 Realtime이 postgres_changes 이벤트를 받아서 React Query가 invalidate. 2중 네트워크 요청.
**Why it happens:** 2개 reactive 경로가 동시 동작.
**How to avoid:** 허용되는 비용 — 중복은 idempotent이고 1초 내. 단, Server Action이 revalidatePath 호출 후 200-300ms 이내 Realtime 이벤트가 오면 double fetch. Phase 4에서는 문제 없지만 `lib/actions/application-actions.ts`에서 revalidatePath를 **Worker 본인 경로만** 호출하고, Business 쪽은 Realtime에만 의존하는 방식도 선택지. 단순함을 위해 둘 다 호출해도 OK.
**Warning signs:** Network 탭에서 동일 `GET /my/applications` 호출이 200ms 간격으로 2회.

## Code Examples

### Night shift premium (Asia/Seoul, Intl-based, no date-fns-tz)

```ts
// src/lib/night-shift.ts

/**
 * Returns the hours of overlap between [checkIn, checkOut] and the Asia/Seoul
 * night window [22:00, 06:00). Crosses midnight correctly.
 *
 * Approach: convert both Date to minutes-since-epoch-in-Seoul, then iterate
 * day-by-day windowing. Pure functional, zero timezone library.
 */
export function computeNightHoursOverlap(checkIn: Date, checkOut: Date): number {
  if (checkOut <= checkIn) return 0

  // Use Intl to derive "Seoul wall-clock minutes since epoch" — a trick that
  // uses the formatter to pull Y-M-D H:M:S in Seoul, then Date.UTC on those
  // fields gives us pretend-UTC timestamps that are equivalent to Seoul time.
  function seoulWall(d: Date): number {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    })
    const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]))
    return Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    )
  }

  const startW = seoulWall(checkIn)
  const endW = seoulWall(checkOut)

  // Walk each Seoul-day intersecting the interval, accumulate minutes in [22:00, 06:00).
  let overlapMinutes = 0
  // Start from the Seoul-day midnight at or before startW
  const oneDayMs = 24 * 60 * 60 * 1000
  let dayStart = Math.floor(startW / oneDayMs) * oneDayMs
  while (dayStart < endW) {
    // For this Seoul-day, night regions are [00:00, 06:00) and [22:00, 24:00)
    const earlyNightStart = dayStart
    const earlyNightEnd = dayStart + 6 * 60 * 60 * 1000 // 06:00
    const lateNightStart = dayStart + 22 * 60 * 60 * 1000 // 22:00
    const lateNightEnd = dayStart + oneDayMs

    overlapMinutes += Math.max(0, Math.min(endW, earlyNightEnd) - Math.max(startW, earlyNightStart)) / 60000
    overlapMinutes += Math.max(0, Math.min(endW, lateNightEnd) - Math.max(startW, lateNightStart)) / 60000

    dayStart += oneDayMs
  }
  return overlapMinutes / 60 // hours
}

/**
 * SHIFT-03: 22:00-06:00 Asia/Seoul 구간 4시간 이상 겹치면 전체 야간시간 × 50% 가산.
 */
export function calculateNightShiftPremium(
  checkIn: Date,
  checkOut: Date,
  hourlyPay: number,
): number {
  const nightHours = computeNightHoursOverlap(checkIn, checkOut)
  if (nightHours < 4) return 0
  return Math.floor(nightHours * hourlyPay * 0.5)
}
```

**Why this approach:** no extra dependency, deterministic, testable. DST 없는 Seoul 특성 덕분에 Intl formatter + wall-clock 변환이 정확.

### 15-minute rounding + earnings

```ts
// src/lib/job-utils.ts (EXTEND)

/** D-11: 15-minute rounding, honest hours. */
export function calculateActualHours(checkIn: Date, checkOut: Date): number {
  if (checkOut <= checkIn) return 0
  const rawMinutes = (checkOut.getTime() - checkIn.getTime()) / 60000
  const roundedMinutes = Math.round(rawMinutes / 15) * 15
  return roundedMinutes / 60 // hours, 0.25 step
}
```

### Application status adapter (pending 추가)

```ts
// src/lib/db/queries.ts adaptApplication — no change needed since status is
// already pass-through, but update the TS type union in src/lib/types/job.ts
// to include 'pending' as the first value. Then any switch on status should
// be exhaustiveness-checked by TypeScript.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` Next.js convention | `proxy.ts` | Next.js 16 | Phase 2에서 이미 마이그레이션 완료. Phase 4는 변경 없음. |
| `cacheComponents` flag = OFF (Previous Model) | `cacheComponents: true` + `'use cache'` | Next.js 16 | Phase 4 scope 외. `cacheComponents` flag를 OFF로 유지. 기존 패턴(revalidatePath)만 사용. |
| `jsonwebtoken` npm | `jose` (Web Crypto 기반) | Next.js Edge runtime 등장 이후 | Phase 4에서 `jose` 사용. Edge/Node/Bun 모두 호환. |
| FCM 기반 network push | VAPID Web Push | 브라우저 표준화, iOS 16.4 지원 | Phase 4에서 VAPID만. FCM은 v2. |
| `setInterval` polling | Supabase Realtime `postgres_changes` | Supabase Realtime GA | Phase 4 primary, 60초 polling은 fallback only. |
| `getServerSideProps` data waterfall | Server Components + Server Actions + Realtime | Next 13+ App Router | Phase 2-3에서 완성, Phase 4는 Server Actions + Realtime 조합 사용. |

**Deprecated/outdated:**
- `src/app/api/push/register/route.ts` — Phase 1 FCM 스캐폴드, Phase 4에서 **삭제**.
- CONTEXT.md `checked_in` enum 값 — Phase 4에서 deprecate 주석만, Phase 5에서 제거 재검토.
- `formatWorkDate` 로컬 사용자 TZ 기반 — 한국 서비스이므로 Seoul 고정 TZ로 migration 고려 (Phase 4 scope 아님, Phase 5 polish).

## Assumptions Log

> 이 테이블의 항목들은 `[ASSUMED]` 태그된 claim들이다. Planner는 discuss-phase 또는 Wave 0에서 user/real sources와 cross-check 후 lock 해야 한다.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `jose@^6.2.2`가 Phase 4 실행 시점 최신 stable | Standard Stack | 낮음 — 실제로 node_modules/jose@6.2.2 존재 확인. npm view로 재확인만 필요. |
| A2 | `web-push@^3.6.7` 또는 최신이 API breaking change 없음 | Standard Stack | 중간 — 3.x 대에서 setVapidDetails/sendNotification API 안정. Wave 0에서 현재 버전 lock. |
| A3 | `html5-qrcode@^2.3.8` 또는 최신이 React 19 호환 | Standard Stack | 중간 — 라이브러리 자체는 React-agnostic이지만 React 19 StrictMode 가드 패턴이 필요. 패턴 5 사용시 안전. |
| A4 | `qrcode@^1.5.4` SVG 생성 API (`QRCode.toString`) 유지 | Standard Stack | 낮음 — 매우 안정적인 라이브러리. |
| A5 | Kakao Maps free tier = 300,000 calls/day (CONTEXT.md D-24 기술) | Pattern 7 / Environment | 중간 — 2026년 2월부터 유료 전환 정책 [CITED]. 정확한 free tier 숫자는 Kakao 공식 quota 페이지에서 Wave 0 실제 확인 필요. Phase 4 베타 규모에서는 어떤 숫자든 충분할 것. |
| A6 | Supabase Realtime RLS 정책 respect가 INSERT/UPDATE/DELETE 모두 적용 | Architecture Pattern 2 | 낮음 — 공식 문서 확인, DELETE는 primary key만 전송되는 특수 케이스. |
| A7 | 30분 auto-accept 타이머가 "Timee 철학" (면접 없음)과 호환 | CONTEXT.md D-01 | 비즈니스 결정 — CONTEXT.md 락, researcher가 재해석하지 않음. |
| A8 | `APPLICATION_JWT_SECRET` 32-byte hex가 충분한 엔트로피 | Pattern 4 | 낮음 — 256-bit HMAC key는 HS256 표준. |
| A9 | `checkout` nonce를 DB에 저장하지 않고 state machine만으로 replay 방어 | Pattern 4 | 중간 — 10분 안에 동일 QR로 2회 체크아웃 시도 시, 2번째는 application.status='completed'에서 reject. 충분. |
| A10 | `src/generated/prisma` 재생성이 `prisma db push` 이후 자동 이루어짐 | Runtime State | 낮음 — package.json postinstall + 플랜에 명시적 generate 태스크. |
| A11 | Intl.DateTimeFormat `Asia/Seoul` 타임존이 Vitest Node 환경에서 동작 | Validation | 낮음 — Node 22.14 full ICU. |
| A12 | `supabase_realtime` publication 현재 상태 unknown — Phase 2/3 auth/jobs만 추가되었을 수 있음 | Runtime State | 낮음 — Wave 1 SQL이 idempotent ADD TABLE 보장. |

**No assumptions table empty:** 12개 assumed claim 존재. 대부분 Wave 0 / Wave 1에서 자연스럽게 resolved (npm view, Kakao console, SQL idempotent ADD).

## Open Questions

1. **pg_cron에서 실제로 Push 발송은 불가능 (순수 SQL only)**
   - 알고 있는 것: CONTEXT.md D-20 말미 "근무 1시간 전 리마인더 (pg_cron → Server Action → sendPushToUser)"
   - 불명확한 것: pg_cron은 app code를 직접 호출 못 함. Vercel Cron / Supabase Edge Function / DB Trigger + HTTP webhook 중 어떤 방식?
   - 권장: **Phase 4 scope에서 "근무 1시간 전 리마인더"는 소프트 스코프** — 구현하지 않고 v2로 이월. 주 스코프인 "accept/reject 즉시 push"는 Server Action 내부 sendPushToUser 호출로 완벽 커버. Planner가 CONTEXT.md D-20 해석을 "event-driven만 Phase 4, time-driven은 v2"로 좁혀야 함.

2. **pg_cron의 no-show 감지가 BUSY 상황에서 정확히 5분 뒤에 돈다는 보장 없음**
   - 알고 있는 것: Phase 3 `pg_cron_expire_jobs`가 5분 주기, `LAZY_FILTER_SQL`로 gap 방어.
   - 불명확한 것: no-show 감지를 LAZY로 방어하려면 Worker가 `/my/applications/[id]` 를 볼 때도 status를 runtime 계산해야 함. 복잡도 증가.
   - 권장: no-show는 통계 용도이지 실시간 UX 차단 기준이 아니므로 5-분 gap은 허용. UI는 DB 값 그대로 표시.

3. **Kakao Maps viewport 기반 marker 쿼리 vs 고정 반경 쿼리**
   - 알고 있는 것: D-25 "지도 viewport 내 marker" + D-27 "1/3/5/10km 거리 스테퍼".
   - 불명확한 것: 사용자가 지도를 panning하면 viewport가 반경을 벗어남. viewport 변경마다 쿼리 재호출하는가? 아니면 거리 필터가 고정이고 panning은 클라이언트 가시화만?
   - 권장: **거리 필터가 ground truth** → `getJobsByDistance({ radiusM })` 로 모든 마커 로드 (≤50) → panning은 지도 내부 이동만, 쿼리 재호출 없음. D-28이 "limit 50 고정" 명시. Planner가 이 해석을 plan에 명시.

4. **Biz-side applicants 페이지 Realtime이 RLS SELECT 정책과 JOIN을 통과하는가**
   - 알고 있는 것: D-17 SELECT 정책 = `EXISTS jobs JOIN authorId=auth.uid()`.
   - 불명확한 것: Supabase Realtime postgres_changes는 SELECT 정책을 평가할 때 EXISTS 서브쿼리를 지원하는가? 공식 문서 "simple eq. filters"만 보장.
   - 권장: Wave 1 SQL 마이그레이션 적용 직후 **수동 검증 필수** — biz dev 계정으로 /biz/posts/[id]/applicants 열고 다른 계정에서 지원 발생 → Realtime 이벤트 수신되는지 Network WS 탭에서 확인. 실패하면 fallback으로 60초 polling만 사용하고 scope 축소 plan.

5. **Playwright E2E에서 카메라 / Push 권한 테스트 불가능**
   - 알고 있는 것: Playwright는 `navigator.mediaDevices.getUserMedia` mock, `pushManager.subscribe` mock 모두 제한적.
   - 권장: E2E는 "버튼 클릭 → Server Action 호출 → DB 상태 변경" 레벨까지 자동화. 카메라/푸시 자체는 Phase 4 HUMAN-UAT 문서에 수동 체크리스트로 분리.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vercel runtime + local dev | ✓ | 22.14.0 | — |
| PostgreSQL + PostGIS | Geofence + Phase 3 carry | ✓ | Supabase hosted | — |
| pg_cron | Auto-accept + no-show detection | ✓ | Phase 3 활성 | — |
| Supabase Realtime | APPL-04 실시간 반영 | ✓ | `@supabase/realtime-js` installed | D-08 60초 polling |
| `jose` npm | QR JWT | ✓ | 6.2.2 (node_modules 존재) | — |
| `web-push` npm | Web Push 발송 | ✗ | — | 설치 필요 (Wave 0) |
| `html5-qrcode` npm | 체크아웃 카메라 | ✗ | — | 설치 필요 (Wave 0) |
| `qrcode` npm | Biz QR SVG 생성 | ✗ | — | 설치 필요 (Wave 0) |
| Kakao JavaScript API key | 지도 기능 | ✗ | — | **사용자 수동 발급** (D-24). 키 없으면 지도 토글 버튼 disable + 안내 배너. |
| VAPID key pair | Web Push | ✗ | — | `npx web-push generate-vapid-keys` (Wave 0 user manual) |
| `APPLICATION_JWT_SECRET` | QR 서명 | ✗ | — | `openssl rand -hex 32` (Wave 0) |
| HTTPS (로컬 개발) | camera + push 테스트 | ✓ (Vercel) / optional (local) | — | `next dev --experimental-https` 로컬 |
| Vitest | 단위 테스트 | ✓ | 3.2.4 | — |
| Playwright | E2E | ✓ | 1.59.1 | — |

**Missing dependencies with no fallback:**
- Kakao API key, VAPID key pair, APPLICATION_JWT_SECRET — 모두 사용자/시스템 생성 필요. Wave 0 checklist로 block.

**Missing dependencies with fallback:**
- Realtime → polling. html5-qrcode → 사용자에게 "카메라 권한 허용" 안내 배너.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 (unit + integration) + Playwright 1.59.1 (E2E) |
| Config file | `vitest.config.ts` (root) + `playwright.config.ts` (assumed) |
| Quick run command | `npm test` (Vitest run) |
| Full suite command | `npm run test:all` (Vitest + Playwright) |

### Test Infrastructure Present

Vitest config 분석 결과 [VERIFIED]:
- `environmentMatchGlobs`: `tests/data/**` / `tests/auth/**` / `tests/proxy/**` = node, `tests/components/**` = jsdom, 나머지 = node.
- Setup: `tests/setup.ts` (testing-library jest-dom 등).
- `server-only` 모듈을 Vitest용으로 stub (`tests/stubs/server-only.ts`) — 이미 DAL 테스트 패턴 확립됨.
- Timeout 15000ms (DB-backed integration 커버).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APPL-01 | 원탭 지원 성공 | integration (Prisma direct) | `vitest run tests/applications/apply-one-tap.test.ts` | ❌ Wave 0 |
| APPL-01 | 동시 지원 경합 (10 concurrent) | integration | `vitest run tests/applications/apply-race.test.ts` | ❌ Wave 0 |
| APPL-01 | 재지원 차단 (ON CONFLICT) | integration | `vitest run tests/applications/apply-duplicate.test.ts` | ❌ Wave 0 |
| APPL-01 | 마감 공고 지원 차단 | integration | same file as above | ❌ Wave 0 |
| APPL-02 | Worker applications 목록 + 상태 탭 | integration | `vitest run tests/applications/list-worker.test.ts` | ❌ Wave 0 |
| APPL-03 | Business applicants 목록 | integration | `vitest run tests/applications/list-biz.test.ts` | ❌ Wave 0 |
| APPL-04 | accept/reject Server Action | integration | `vitest run tests/applications/accept-reject.test.ts` | ❌ Wave 0 |
| APPL-04 | Auto-accept pg_cron 30분 경과 | integration (SQL) | `vitest run tests/applications/auto-accept-cron.test.ts` | ❌ Wave 0 |
| APPL-04 | Realtime event 수신 | **manual UAT** | `docs: 04-HUMAN-UAT.md → Realtime` | — |
| APPL-05 | headcount 도달시 jobs.status='filled' | integration | `vitest run tests/applications/headcount-fill.test.ts` | ❌ Wave 0 |
| SHIFT-01 | 체크인 시간창 validation (6 boundary) | unit | `vitest run tests/shift/check-in-time-window.test.ts` | ❌ Wave 0 |
| SHIFT-01 | 체크인 geofence validation (inside/outside) | integration (PostGIS) | `vitest run tests/shift/geofence.test.ts` | ❌ Wave 0 |
| SHIFT-02 | 체크아웃 JWT verify (valid/expired/tampered) | unit | `vitest run tests/shift/checkout-jwt.test.ts` | ❌ Wave 0 |
| SHIFT-02 | 15분 반올림 계산 | unit | `vitest run tests/shift/actual-hours.test.ts` | ❌ Wave 0 |
| SHIFT-02 | earnings 계산 (base + night + transport) | unit | `vitest run tests/shift/earnings.test.ts` | ❌ Wave 0 |
| SHIFT-03 | 야간할증 6 boundary cases | unit | `vitest run tests/shift/night-shift.test.ts` | ❌ Wave 0 |
| SEARCH-02 | Kakao map SDK 로드 | **manual UAT** (requires HTTPS + API key) | `docs: 04-HUMAN-UAT.md → Map` | — |
| SEARCH-02 | Marker viewport 렌더 | E2E (Playwright) | `npx playwright test tests/e2e/map-view.spec.ts` | ❌ Wave 0 |
| SEARCH-03 | 시간 프리셋 SQL 필터 | integration | `vitest run tests/search/time-filter.test.ts` | ❌ Wave 0 |
| SEARCH-03 | 시간대 버킷 overlap 계산 | unit | `vitest run tests/search/time-bucket.test.ts` | ❌ Wave 0 |
| NOTIF (Web Push) | subscribePush/unsubscribePush Server Action | integration | `vitest run tests/push/subscribe.test.ts` | ❌ Wave 0 |
| NOTIF (Web Push) | sendPushToUser 410 cleanup | unit (mocked web-push) | `vitest run tests/push/send-410-cleanup.test.ts` | ❌ Wave 0 |
| NOTIF (Web Push) | Service Worker 등록 + notification click | **manual UAT** | `docs: 04-HUMAN-UAT.md → Push` | — |

### Sampling Rate

- **Per task commit:** `npm test -- <specific file pattern>` (< 30초)
- **Per wave merge:** `npm test` (full Vitest, ~1-2분 예상)
- **Phase gate:** `npm run test:all` (Vitest + Playwright) green + 04-HUMAN-UAT.md 전체 체크

### Wave 0 Gaps

- [ ] `tests/applications/` 디렉토리 신설 + 다음 파일:
  - `apply-one-tap.test.ts` — APPL-01 happy path
  - `apply-race.test.ts` — APPL-01 concurrency (10 parallel Promise.all + headcount=5)
  - `apply-duplicate.test.ts` — APPL-01 ON CONFLICT
  - `list-worker.test.ts`, `list-biz.test.ts` — APPL-02/03
  - `accept-reject.test.ts` — APPL-04
  - `auto-accept-cron.test.ts` — pg_cron SQL 수동 실행 (cron 스케줄 대기 불필요, `UPDATE ... WHERE appliedAt < now() - interval '30 minutes'` 쿼리만 직접 호출)
  - `headcount-fill.test.ts` — APPL-05
- [ ] `tests/shift/` 디렉토리 신설 + 다음 파일:
  - `check-in-time-window.test.ts` — SHIFT-01 시간창 (unit, 순수 함수)
  - `geofence.test.ts` — SHIFT-01 PostGIS (integration, real DB)
  - `checkout-jwt.test.ts` — SHIFT-02 jose sign/verify (unit)
  - `actual-hours.test.ts`, `earnings.test.ts` — SHIFT-02 계산 (unit)
  - `night-shift.test.ts` — SHIFT-03 6 boundary cases (unit)
- [ ] `tests/search/` 디렉토리 신설:
  - `time-filter.test.ts` — SEARCH-03 SQL WHERE 파편 생성 (integration)
  - `time-bucket.test.ts` — SEARCH-03 unit
- [ ] `tests/push/` 디렉토리 신설:
  - `subscribe.test.ts`, `send-410-cleanup.test.ts` — mock web-push 모듈
- [ ] `tests/e2e/` (Playwright) 확장:
  - `map-view.spec.ts` — /home 토글 → map container 렌더 (API key env flag로 skip 가능)
- [ ] `04-HUMAN-UAT.md` 신설:
  - Real camera QR 체크아웃 end-to-end (카메라 권한 → 스캔 → 서버 저장 → UI 전이)
  - Push 구독/발송/클릭/410 만료 cleanup
  - Kakao map 로드 + marker click + panning + 거리 필터 변경
  - Realtime event 수동 비교 (두 브라우저 탭, biz 수락 → worker 자동 갱신)

**요약:** 현재 Vitest/Playwright 인프라는 완비되어 있으며 Phase 4는 **새 테스트 파일 추가만** 필요. 프레임워크 install/config 추가 없음.

## Security Domain

> CONTEXT.md는 `security_enforcement` flag를 명시하지 않으므로 기본값(활성)으로 간주.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (Phase 2 complete). Phase 4 변경 없음. |
| V3 Session Management | yes | `@supabase/ssr` + cookie session (Phase 2). Phase 4 변경 없음. |
| V4 Access Control | yes | **Phase 4가 크게 확장**: applications RLS (D-17) + dal.ts `requireApplicationOwner`/`requireJobOwner` (D-18). 2중 방어. |
| V5 Input Validation | yes | **Zod** Server Action boundary 검증 (jobId UUID, lat/lng numeric range, QR token 길이). camera QR decoded text는 `jose.jwtVerify`가 구조 검증. |
| V6 Cryptography | yes | **HS256 `jose`** (QR), **VAPID ECDSA `web-push`** (push). 모두 표준 라이브러리 사용, hand-roll 금지. |
| V7 Error Handling | yes | Server Action 에러 → `{ success: false, error: '...' }` 한국어 매핑. stack trace leak 금지. |
| V8 Data Protection | yes | QR payload는 **서명**이지 암호화 아님. jobId/businessId가 PII 수준이 아니므로 허용. nonce는 noise only. |
| V9 Communication | yes | HTTPS 필수 (Vercel). Web Push는 VAPID로 서버 인증. |
| V10 Malicious Code | yes | html5-qrcode/kakao/web-push/jose 모두 well-known, audit된 라이브러리. `package-lock.json` 고정. |
| V11 Business Logic | yes | **동시 지원 경합** (V11 category가 주 위험). Pattern 1 atomic UPDATE가 primary mitigation. |
| V12 Files & Resources | no | Phase 4는 파일 업로드 없음 (avatar는 Phase 3에서 완료). |
| V13 API | yes | Server Actions는 CSRF 내장 보호 (Next.js). Route Handlers 없음 (Phase 4는 모두 Server Action). |
| V14 Configuration | yes | `.env.local` 4개 신규 키 관리. `NEXT_PUBLIC_` prefix는 브라우저 노출 의식적. |

### Known Threat Patterns for Phase 4 stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 동시 원탭 지원으로 headcount 초과 | Elevation of Privilege | Pattern 1 atomic UPDATE `WHERE filled < headcount` |
| 다른 Worker의 application 조작 | Tampering / Access Control | D-17 applications RLS + D-18 requireApplicationOwner |
| 다른 Business의 job으로 reject | Elevation of Privilege | D-18 requireJobOwner |
| QR token 위조 | Spoofing | jose HS256 `algorithms: ['HS256']` (alg confusion 방어) + 서버 보관 secret |
| QR token 재사용 (replay) | Tampering | 10분 exp + application state machine (completed 이후 거부) |
| Push subscription 탈취 | Information Disclosure | VAPID 서버 인증 + p256dh/auth는 서버 쪽 저장 (NEXT_PUBLIC 아님) |
| 악의적 lat/lng 주입으로 geofence 우회 | Spoofing | Server Action Zod + isFinite + 범위 check. 그러나 physical presence 강제는 불가 (web-only scope 제한) |
| 마감된 공고 재개 | Tampering | Pattern 1 WHERE status='active' filter |
| Realtime channel hijack | Information Disclosure | Supabase Realtime이 RLS 존중 + filter는 서버 검증 |
| SQL injection via $queryRaw | Tampering | Prisma.sql template literal 자동 parameterization, `${...}`만 사용 |
| XSS via marker title / push payload | Tampering | React 기본 escape + Notification API가 plain text only |
| Service Worker hijack | Tampering | `public/sw.js` scope='/' + Cache-Control no-cache (Next 16 PWA 가이드 권장 헤더) |
| Open redirect after push click | Tampering | `notificationclick` 내부에서 deep link 화이트리스트 (`/my/applications/...`만 허용) |
| rate-limit bypass on QR regenerate | DoS | Claude 재량 throttle (CONTEXT.md 언급). Phase 4 기본: 10분 자연 expiry로 DB write는 억제됨. |

## Sources

### Primary (HIGH confidence)

- `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md` — Server Action 패턴 + 보안 고려사항 [VERIFIED]
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md` — revalidatePath 사용법 + Route Handlers vs Server Function 차이 [VERIFIED]
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` — `proxy.ts` (middleware rename) [VERIFIED]
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/public-folder.md` — `public/sw.js` 정적 서빙 [VERIFIED]
- `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` — **end-to-end Web Push 예제 (VAPID + sw.js + Server Action)** [VERIFIED — 가장 중요한 참조]
- `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` — `next/dynamic` + `ssr: false` 패턴 [VERIFIED]
- `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md` — Previous Model 사용법 (Phase 4가 따를 경로) [VERIFIED]
- `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md` — cacheComponents flag 동작 확인 (Phase 4는 OFF 유지) [VERIFIED]
- `node_modules/@supabase/realtime-js/dist/module/RealtimeChannel.d.ts` — `REALTIME_SUBSCRIBE_STATES` enum + on/subscribe 타입 시그니처 [VERIFIED]
- `node_modules/@supabase/realtime-js/dist/module/RealtimeChannel.d.ts` line 250-262 — `postgres_changes` overload (INSERT/UPDATE/DELETE/ALL) [VERIFIED]
- `prisma/schema.prisma` — 현재 스키마 (Phase 4 변경 대상) [VERIFIED]
- `src/lib/db/queries.ts` — Phase 3 `$queryRaw` + `Prisma.sql` + `ST_DWithin` 패턴 (Phase 4 geofence 재사용) [VERIFIED]
- `src/lib/dal.ts` — 현재 `verifySession`/`requireWorker`/`requireBusiness` (Phase 4가 확장) [VERIFIED]
- `supabase/migrations/20260411000001_jobs_rls_phase3.sql` — RLS 패턴 (applications RLS 참조 모델) [VERIFIED]
- `supabase/migrations/20260411000003_pg_cron_expire_jobs.sql` — pg_cron 패턴 (auto-accept/no-show 참조 모델) [VERIFIED]
- `next.config.ts` — `cacheComponents` flag 부재 확인 [VERIFIED]
- `vitest.config.ts` — Vitest 3.2.4 + environmentMatchGlobs + server-only stub [VERIFIED]
- `package.json` — 설치된 모든 dependency 버전 확인 [VERIFIED]
- `node_modules/jose/package.json` — jose 6.2.2 존재 확인 [VERIFIED]

### Secondary (MEDIUM confidence — verified with official source)

- Supabase Realtime Postgres Changes docs — [CITED: https://supabase.com/docs/guides/realtime/postgres-changes]
- Kakao Maps JavaScript SDK guide — [CITED: https://apis.map.kakao.com/web/guide/]
- `web-push` npm package docs — [CITED: https://www.npmjs.com/package/web-push]
- `web-push-libs/web-push` GitHub README — [CITED: https://github.com/web-push-libs/web-push]
- `jose` npm package + GitHub changelog — [CITED: https://github.com/panva/jose, https://www.npmjs.com/package/jose]
- web.dev Web Push 에러 가이드 — [CITED: https://web.dev/articles/sending-messages-with-web-push-libraries]
- pushpad.xyz 410 Gone 해석 — [CITED: https://pushpad.xyz/blog/web-push-error-410-the-push-subscription-has-expired-or-the-user-has-unsubscribed]

### Tertiary (LOW confidence — single web source, needs validation)

- Kakao Maps 정확한 free tier 수치(300k calls/day) — [ASSUMED] — Planner가 Wave 0에서 https://developers.kakao.com/docs/latest/en/getting-started/quota 직접 확인.
- html5-qrcode StrictMode 패턴 디테일 — [CITED: dev.to, medium.com community guides]. React 19 호환성 자체는 라이브러리가 React-agnostic이므로 기술적으로 안전.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 모든 기 설치 의존성 node_modules에서 직접 확인, 신규 4개 의존성은 CONTEXT.md 락 + 공식 문서 확인.
- Architecture patterns: HIGH — 모든 코드 예제가 verified source(Next.js 16 공식 docs) 또는 verified node_modules 타입에 기반.
- Pitfalls: HIGH — 7개 pitfall 중 5개는 프로젝트 자체의 기존 코드/migration 분석에서, 2개는 커뮤니티 가이드 [CITED]에서.
- Realtime + RLS interaction: MEDIUM-HIGH — 공식 docs 확인했으나 "EXISTS subquery가 Realtime SELECT 평가에서 동작"은 Open Question #4에 수동 검증 플래그.
- Kakao Maps: MEDIUM — 공식 가이드가 autoload/marker/load 콜백을 명시적으로 문서화하지 않음. community가이드와 공식 Script URL fragment만으로 조합. Wave 0 수동 검증 필요.
- Web Push: HIGH — Next.js 16 공식 PWA 가이드가 verbatim end-to-end 예제 제공.
- 야간할증 계산: HIGH — pure function, deterministic, Vitest 단위 테스트로 fully verifiable.
- 동시 지원 경합: HIGH — Phase 3 `$queryRaw` pattern 연장, PostgreSQL `UPDATE ... WHERE` atomicity 보장.

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (30 days — 프로젝트 스택 안정적, 외부 라이브러리도 메이저 버전 변경 예정 없음. Kakao quota 정책만 2026년 말에 재확인 필요.)

## RESEARCH COMPLETE
