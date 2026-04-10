# Phase 4: 지원·근무 라이프사이클 DB 연결 — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 04-db
**Areas discussed:** 지원 모델 & Headcount, 상태 동기화, 체크인/체크아웃, Applications RLS, 알림 채널, 취소 정책, 탐색 고도화 (scope 확장)

---

## Area 1: 지원 모델 & Headcount 경합

### Q1.1: Worker가 '원탭 지원' 버튼을 눌렀을 때 지원의 초기 상태는?

| Option | Description | Selected |
|--------|-------------|----------|
| 즉시 confirmed + headcount 차감 (권장) | 스키마가 이미 이런 모델 — 지원 시 바로 confirmed, jobs.filled++. Timee 체결, PROJECT.md out-of-scope 준수 | |
| pending → Business 승인 필요 | Worker는 pending 상태로 대기, Business가 '수락' 클릭시 confirmed로 전이. Prisma enum에 pending 추가 + 모든 코드 수정 필요 | ✓ (사용자 custom) |

**User's choice:** "지원시 바로 대기 상태로 넘어가고 수락시 컨펌되고 워커에게 알림이 가고 마이페이지의 스케쥴 등에 반영 되어야 하는 것이 맞으나 그 절차는 최대한 간소화하고 사용자가 쉽게 지원하고 일을 할 수 있다는 본연의 목적에 맞아야 함"

**Notes:** 사용자는 pending 모델을 명시적으로 선택. PROJECT.md의 "지원→대기→면접→채용 out of scope"는 "면접·판단 심사 금지"로 재정의 필요. → CONTEXT.md D-01

### Q1.2: Business의 '수락' 인터페이스는 어떤 수준까지 간소화할까요?

| Option | Description | Selected |
|--------|-------------|----------|
| 지원자 카드 + 원탭 수락버튼 (권장) | 현재 목업과 동일. 판단 소요 시간 <5초 목표 | |
| 더 강한 간소화: 자동수락 타이머 | Business가 N분 내 승인/거절 안 하면 자동으로 confirmed로 전이. pg_cron 구현 | ✓ |
| 역방향: 목록 화면에서 바로 다중수락 | 체크박스 + 선택한 모두 수락 버튼. 10명 한번에 중일괄 승인 가능 | |

**User's choice:** 더 강한 간소화: 자동수락 타이머
**Notes:** → CONTEXT.md D-02

### Q1.3: 자동수락 타이머의 기본 대기 시간은?

| Option | Description | Selected |
|--------|-------------|----------|
| 30분 (권장) | 반나절 타이닝 — Business가 Worker 프로필을 활어달리 확인할 시간은 주되, 지원 후 오래 걸리는 느낌은 없음 | ✓ |
| 1시간 | Business에게 여유 많은 시간 할애 | |
| 10분 (매우 엄격) | 거의 즉시 수준. Business는 알림 확인 즉시 보아야 함 | |

**User's choice:** 30분 (권장)
**Notes:** → CONTEXT.md D-03

### Q1.4: pending 지원은 jobs.headcount 정원을 '정점'으로 소지하나요?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — pending + confirmed 합께 headcount 소지 (권장) | headcount=3이면 pending 3명 차면 지원 마감 | ✓ |
| No — headcount는 confirmed만 소지 | 지원은 무제한 받음, Business가 수락할 때만 카운트 | |
| Hybrid — headcount * 1.5까지 pending 허용 | 예약석 모델 — 30% 거절을 가정하고 여분 받음 | |

**User's choice:** Yes — pending + confirmed 합께 headcount 소지 (권장)
**Notes:** → CONTEXT.md D-04

### Q1.5: 동시 지원 경합 (headcount=1에 두 Worker가 동시에 탭) 처리 방식은?

| Option | Description | Selected |
|--------|-------------|----------|
| Atomic UPDATE 조건부 + 실패 재해석 (권장) | `UPDATE jobs SET filled = filled + 1 WHERE id = ? AND filled < headcount RETURNING *` | ✓ |
| Postgres 함수 + SECURITY DEFINER | create_application 저장 프로시저 | |
| Prisma interactive transaction + SELECT FOR UPDATE | prisma.$transaction() 내부에서 lock | |

**User's choice:** Atomic UPDATE 조건부 + 실패 재해석 (권장)
**Notes:** → CONTEXT.md D-05

---

## Area 2: 상태 동기화 방식

### Q2.1: Worker가 자신의 지원 상태 (pending → confirmed) 업데이트를 보는 방식은?

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase Realtime (postgres_changes) (권장) | applications 테이블에 postgres_changes 구독. 단일 벤더 철학과 일치 | ✓ |
| React Query polling (15초 간격) | refetchInterval=15000. 별도 Realtime 인프라 불필요 | |
| Server Action revalidate + 페이지 이동 시 재조회 | 가장 단순. Timee '시간에 맞춰 나오기' 인티브와 충돌 가능 | |

**User's choice:** Supabase Realtime (postgres_changes) (권장)
**Notes:** → CONTEXT.md D-06

### Q2.2: Business 측 지원자 목록도 같은 Realtime 갱신을 받나요?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — /biz/posts/[id]/applicants도 postgres_changes 구독 (권장) | 새 지원자 들어올 때 Business가 즉시 볼 수 있음 | ✓ |
| No — Business는 새로고침 딱에만 보면 충분 | 리소스 절약 | |

**User's choice:** Yes — /biz/posts/[id]/applicants도 postgres_changes 구독 (권장)
**Notes:** → CONTEXT.md D-07

### Q2.3: Realtime 구독 실패/끊김 폴백 전략은?

| Option | Description | Selected |
|--------|-------------|----------|
| 60초 간격 polling 폴백 (권장) | Supabase.channel.on('status', ...)로 채널 상태 감지, CONNECTED 상태일 때만 polling off | ✓ |
| 폴백 없음 | Realtime만 신뢰 | |
| 페이지 focus에서 refetch | window.onFocus 훅 사용 | |

**User's choice:** 60초 간격 polling 폴백 (권장)
**Notes:** → CONTEXT.md D-08

---

## Area 3: 체크인/체크아웃 검증

### Q3.1: Phase 4의 체크인 검증 방식은?

| Option | Description | Selected |
|--------|-------------|----------|
| 시간창 + PostGIS geofence (권장) | 추소 권한 요청 → job 시작 10분전~30분후 시간창 검증 + 축주 위치 200m 이내 ST_DWithin 검증 | ✓ |
| 시간창만 (geofence 없이) | 위치 권한 불필요. Worker가 현장 안 가고 체크인 시도 가능 | |
| QR 심볼리컨 (검증 없이 버튼 아카도 OK) | 목업 UI 그대로 사용 | |

**User's choice:** 시간창 + PostGIS geofence (권장)
**Notes:** → CONTEXT.md D-09

### Q3.2: 체크인 geofence 반경은 몇 m인가요?

| Option | Description | Selected |
|--------|-------------|----------|
| 200m (권장) | 도심형 매장 현실적 반경. GPS 오차 20-50m + 건물 규모 감안 3배 | ✓ |
| 500m | 대규모 시설 (이벤트장, 창고) 대응 | |
| 100m (엄격) | 확실한 현장 검증. GPS 오차로 Worker 불편 가능 | |

**User's choice:** 200m (권장)
**Notes:** → CONTEXT.md D-10

### Q3.3: 체크아웃 시 실근무시간 라운딩 및 수입 계산 규칙은?

| Option | Description | Selected |
|--------|-------------|----------|
| 15분 단위 반올림 + 정직한 시간 지급 (권장) | actualHours = ceil((checkOut - checkIn) / 15min) * 0.25h. 조퇴시도 실근무만큼 지급 (지각 패널티 없음) | ✓ |
| 1분 단위 정확 지급 | 분 단위 정밀 계산. UX에서 '89분 근무 = 14,458원' 토스흑스러움 | |
| 30분 단위 반올림 + 계약시간 최소 보장 | 원래 계약 workHours까지는 무조건 지급 | |

**User's choice:** 15분 단위 반올림 + 정직한 시간 지급 (권장)
**Notes:** → CONTEXT.md D-11

### Q3.4: 야간 할증 (SHIFT-03: 22:00-06:00 중 4시간+, 50% 가산) 계산 위치는?

| Option | Description | Selected |
|--------|-------------|----------|
| Server Action TypeScript 함수 (권장) | checkOut Server Action 내부에서 calculateNightShiftPremium(checkIn, checkOut, hourlyPay) 호출 | ✓ |
| Postgres 함수 (calculate_night_premium) | 새 마이그레이션에 SQL 함수 정의 | |
| Postgres trigger (AFTER UPDATE) | applications 테이블 checkOutAt 설정 시 트리거가 earnings 자동 재계산 | |

**User's choice:** Server Action TypeScript 함수 (권장)
**Notes:** → CONTEXT.md D-12

### Q3.5 (follow-up): QR 스캔은 Phase 4의 어떤 단계에 필요한가요?

**User raised concern:** "qr코드 확인이 어떻게 구현되어있는지 확인이 필요합니다. worker가 근무 끝난 후 카메라로 회사계정에서 생성된 qr을 스캔하면 db에 근무를 완료한 것으로 기록해야 합니다"

| Option | Description | Selected |
|--------|-------------|----------|
| 체크아웃만 (말씀 근거) (권장) | 출근은 도착 즉시 geofence+시간창으로 자동체크인. 퇴근 시 QR만 스캔하면 근무 완료 | ✓ |
| 체크인 + 체크아웃 둘 다 | 현재 목업 UI 그대로 | |
| 체크인만 | 도착 인증에 QR 사용 | |

**User's choice:** 체크아웃만 (말씀 근거) (권장)
**Notes:** → CONTEXT.md D-13

### Q3.6: QR 문서 호스트 라이브러리 선택은?

| Option | Description | Selected |
|--------|-------------|----------|
| @zxing/browser (권장) | 성숙한 TS 라이브러리, 웹카메라 API 기반 | |
| html5-qrcode | 더 가볍고 스고들 이식이 쉬움 | ✓ |
| 커스텀: BarcodeDetector API | 브라우저 내장 API | |

**User's choice:** html5-qrcode
**Notes:** → CONTEXT.md D-14

### Q3.7: QR payload 및 서명 전략은?

| Option | Description | Selected |
|--------|-------------|----------|
| JWT: jobId + businessId + nonce + exp (권장) | HS256, 10분 만료. jose 라이브러리 사용 | ✓ |
| 단순 URL: /checkout/{jobId}?sig={hmac} | HMAC-SHA256 서명 URL | |
| 단순 jobId string (서명 없음) | 위변조 위험 | |

**User's choice:** JWT: jobId + businessId + nonce + exp (권장)
**Notes:** → CONTEXT.md D-15

### Q3.8: Business가 체크아웃 QR을 어디서 열어보고 Worker에게 보여주나요?

| Option | Description | Selected |
|--------|-------------|----------|
| /biz/posts/[id] 상세페이지에 '퇴근 QR 열기' 버튼 + 모달 (권장) | 10분 자동 재생성 | ✓ |
| /biz/posts/[id]/checkout-qr 전용 페이지 | 태블릿에서 매장 운영 중 상시 띄워두는 용도 | |
| 인쇄용 PDF 생성 | 한 번 생성해 인쇄해서 붙여두는 모델. JWT 기반 exp와 충돌 | |

**User's choice:** /biz/posts/[id] 상세페이지에 '퇴근 QR 열기' 버튼 + 모달 (권장)
**Notes:** → CONTEXT.md D-16

---

## Area 4: Applications RLS & Server Action 경계

### Q4.1: applications RLS 정책 엄격도는?

| Option | Description | Selected |
|--------|-------------|----------|
| 엄격 - Worker 본인 + Business via jobs JOIN (권장) | Worker: workerId = auth.uid(). Business: jobId IN (SELECT id FROM jobs WHERE authorId = auth.uid()) | ✓ |
| 보통 - RLS 정책 + Business UPDATE도 허용 확장 | 위와 동일 + Business가 status를 confirmed/cancelled로 변경할 수 있게 | |
| 간소 - Server Action만 신뢰, RLS는 모두 deny | service_role 키로 직접 DB 호출 | |

**User's choice:** 엄격 - Worker 본인 + Business via jobs JOIN (권장)
**Notes:** → CONTEXT.md D-17

### Q4.2: Server Action 간접체 (dal.ts) 확장 방향은?

| Option | Description | Selected |
|--------|-------------|----------|
| requireWorker + requireApplicationOwner 추가 (권장) | 기존 requireWorker/requireBusiness에 requireApplicationOwner(applicationId) + requireJobOwner(jobId) 추가 | ✓ |
| 새 헬퍼 함수 없이 인라인으로 검증 | 각 Server Action이 직접 application.workerId === session.id 체크 | |

**User's choice:** requireWorker + requireApplicationOwner 추가 (권장)
**Notes:** → CONTEXT.md D-18

---

## Area 5: 알림 채널 (추가 논의)

**User raised concern:** "Push 알림을 Phase 4에 포함하고 싶음"

### Q5.1: Phase 4에 포함할 알림 채널 수준은?

| Option | Description | Selected |
|--------|-------------|----------|
| Realtime + 인앱 배너만 (권장) | Phase 4 자체 scope 내 완결. Push/SMS는 v2 유지 | |
| Web Push API 포함 (브라우저 내장 push) | 서비스워커 + 구독 + VAPID 키 + 푸시 엔드포인트. PROJECT.md '푸시 알림 v2' 경계 확장 필요 | ✓ |
| Supabase Auth 메일리스트 + Resend | 이메일 알림 | |

**User's choice:** Web Push API 포함 (브라우저 내장 push)
**Notes:** → CONTEXT.md D-19. PROJECT.md scope 재정의 필요.

### Q5.2: Web Push subscription 저장 및 인프라 구성 방향은?

| Option | Description | Selected |
|--------|-------------|----------|
| Prisma model + Server Action (권장) | PushSubscription 모델 신설. /api/push/register 삭제 후 Server Action으로 대체. web-push 라이브러리 설치. VAPID 키 2개 .env 추가. public/sw.js 추가. | ✓ |
| Supabase Edge Function + 전용 테이블 | 구독 저장은 Prisma, 주식 전송은 Edge Function | |
| 로컬 구독만 (서버 없음) | Notification API로 로컬 알림 | |

**User's choice:** Prisma model + Server Action (권장)
**Notes:** → CONTEXT.md D-20

---

## Area 6: Worker 취소 정책 (추가 논의)

### Q6.1: Worker 무료 취소 시간 윈도우는?

| Option | Description | Selected |
|--------|-------------|----------|
| 근무 24시간 전까지 (권장) | 목업 UI 일지. workDate+startTime - 24h 이전은 무료 취소 | ✓ |
| 근무 12시간 전까지 | 더 관대, 긴급한 상황 허용 | |
| 항상 취소 가능 + 쿨 안 남 | 체크인 전엔 언제든지 취소 | |

**User's choice:** 근무 24시간 전까지 (권장)
**Notes:** → CONTEXT.md D-21

### Q6.2: 24시간 내 취소 또는 노쇼 시 페널티는?

| Option | Description | Selected |
|--------|-------------|----------|
| 완료율(노쇼 카운트) 만 추적, 금전적 패널티 없음 (권장) | WorkerProfile에 noShowCount 컬럼 추가 | ✓ |
| 1회정지 + 재범 시 X일 정지 | 지원 할기를 직접 차단 | |
| 그냥 경고 배너만 | noShowCount 헤아리지 상태 없이 UI 경고만 표시 | |

**User's choice:** 완료율(노쇼 카운트) 만 추적, 금전적 패널티 없음 (권장)
**Notes:** → CONTEXT.md D-22

---

## Area 7: 탐색 고도화 (SCOPE EXPANSION)

**User raised concern:** "worker가 일자리를 찾을 때 원하는 시간을 지정할 수 있게 되어있는데, 여기에 더해서 카카오 지도 api 연동해서 내 주변의 일자리를 지도 상에서도 찾을 수 있게 해주세요. 거리 설정 별 일자리가 필터링 되어서 쉽게 지원할 수 있어야 합니다."

**Warning presented to user:** 이 요청은 Phase 4 범위 (지원·근무 라이프사이클) 를 벗어남. REQUIREMENTS.md SEARCH-02는 v2로 명시되어 있음.

### Q7.1: 시간필터 + 카카오맵 지도 UI는 어떻게 처리할까요?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 4 deferred → 새 phase로 분리 (권장) | CONTEXT.md deferred 섹션에 기록, /gsd-add-phase로 '탐색 고도화' phase 추가 | |
| Phase 4 범위 확장 | ROADMAP.md Phase 4 범위 확장 + REQUIREMENTS.md SEARCH-02 v1 승격 | ✓ |
| 링크만 남기고 backlog로 | backlog 파일에 메모만 | |

**User's choice:** Phase 4 범위 확장
**Notes:** 사용자가 scope expansion을 명시적으로 승인. ROADMAP.md / REQUIREMENTS.md / PROJECT.md 모두 업데이트 필요. → CONTEXT.md D-23

### Q7.2: 카카오맵 SDK 키 발급과 수동 설정은 누가 하나요?

| Option | Description | Selected |
|--------|-------------|----------|
| 사용자(독발) 수동으로 (권장) | Kakao Developers 로그인, 앱 생성, JavaScript 키 발급, NEXT_PUBLIC_KAKAO_MAP_KEY에 추가 | ✓ |
| Claude가 지그재그 고민 | Phase 4 실행 중 필요하면 사용자에게 안내 | |

**User's choice:** 사용자(독발) 수동으로 (권장)
**Notes:** → CONTEXT.md D-24

### Q7.3: 탐색 UX 정책: 지도는 어디에?

| Option | Description | Selected |
|--------|-------------|----------|
| /home에 리스트/지도 토글 버튼 (권장) | 현재 /home 리스트에 [리스트|지도] 토글 추가. marker 탭시 종이소쿳 카드 등장 | ✓ |
| 새 라우트 /map 신설 | /home 유지, 별도 /map 생성 | |
| 스푸링 메인 화면을 지도로 교체 | /home 기본 문화와 지도를 상단 스푸링 섹션으로 선제공 | |

**User's choice:** /home에 리스트/지도 토글 버튼 (권장)
**Notes:** → CONTEXT.md D-25

### Q7.4: 시간 필터는 어떤 차원으로 한정할까요?

| Option | Description | Selected |
|--------|-------------|----------|
| 오늘/내일/이번주 프리셋 + 시간대 버킷 (오전/오후/야간) (권장) | Today/Tomorrow/Week 프리셋 + 4개 시간대 버킷 | ✓ |
| 날짜 범위 선택 + 시간 슬라이더 | 더 정밀하지만 UX 복잡 | |
| 단일 날짜 + 요일 멀티선택 | 고정 스케줄 찾는 Worker에 용이 | |

**User's choice:** 오늘/내일/이번주 프리셋 + 시간대 버킷 (권장)
**Notes:** 시간대 버킷은 오전/오후/저녁/야간 4개로 확장. → CONTEXT.md D-26

### Q7.5: 거리 필터는 지도와 어떤 관계?

| Option | Description | Selected |
|--------|-------------|----------|
| 리스트/지도 둘 다 공유: 1/3/5/10km 스테퍼버튼 (권장) | Phase 3의 radiusKm에 UI 추가. 리스트→getJobsByDistance, 지도→marker viewport + 반경 마커 | ✓ |
| 지도는 viewport 자동, 리스트만 거리 필터 | 지도는 현재 보이는 영역에서만 공고 로드 | |

**User's choice:** 리스트/지도 둘 다 공유: 1/3/5/10km 스테퍼버튼 (권장)
**Notes:** → CONTEXT.md D-27

---

## Deferred Ideas (이번 discuss-phase에서 기각됨)

- `checked_in` enum 값 즉시 제거 — Phase 5에서 재검토 (현재 사용처 없으므로 deprecate 주석만)
- 채팅 실시간 메시징 (CHAT-01/02 — v2)
- Worker-to-Worker 팀 근무
- 지원 거절 사유 입력 필드 (간소화 원칙 위배)
- Business가 Worker 프로필을 판단 기준으로 사용 (면접 대체 패턴 — PROJECT.md 위배)
- 네이티브 FCM / APNs push (v2)
- SMS / 카카오 알림톡 (v2)
- 지도 marker clustering (초기 구현에서는 단순 marker만)
- 지도 "전국" 옵션 (10km 초과)

## Claude's Discretion (user deferred to Claude)

- `checked_in` enum deprecation 처리 방식
- Business 수락 후 Push 메시지 문구
- Realtime channel 이름 규칙
- Application Server Action 파일 구조 (단일 vs 분리)
- `generateCheckoutQrToken` rate limit
- html5-qrcode 권한 거부 fallback UX
- Kakao map lazy loading 방식
- Marker 아이콘 디자인 (기본 vs custom SVG)
- Service worker 등록 위치
- Web Push 권한 요청 타이밍 UX
- 지원 버튼 비활성화 조건 (노쇼 누적 등)

---

*Log created: 2026-04-10 via /gsd-discuss-phase 4*
*Total decisions captured: 28 (D-01 to D-28)*
*Scope expansions approved: 3 (pending 모델, Kakao Maps, Web Push)*
