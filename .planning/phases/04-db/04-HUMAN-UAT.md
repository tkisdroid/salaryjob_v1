---
phase: 04-db
status: draft
items: 5
created: 2026-04-10
---

# Phase 4 Human UAT Checklist

5 scenarios that cannot be automated (camera/HTTPS/real device/real API key/two-browser-tab Realtime).
Checker: run these before `/gsd-verify-work` closure.

## 1. Check-out QR 카메라 스캔 풀 플로우 (SHIFT-02)

**전제:**
- `.env.local`에 `APPLICATION_JWT_SECRET` 설정 완료.
- 모바일 브라우저 HTTPS (prod deploy 또는 ngrok 권장 — `getUserMedia`는 secure context 필수).
- Worker confirmed application 1건 + 동일 jobId의 Business 계정.

**단계:**
1. Biz 계정 로그인 → `/biz/posts/[jobId]` → "퇴근 QR 열기" 버튼 클릭 → 모달에 QR SVG + 카운트다운 표시됨 확인
2. Worker 계정 로그인 → `/my/applications/[id]/check-in` → 체크아웃 탭으로 전환 → 카메라 권한 허용
3. Worker 카메라로 Biz 모달 QR 스캔 → 인식 성공 후 confirm 화면
4. DB 확인: `applications.status='completed'`, `checkOutAt is not null`, `earnings > 0`
5. Worker 화면에 "완료" 탭에서 해당 application 표시 확인

**성공 기준:** 5단계 모두 통과.
**실패 기록:** ( ) Pass / ( ) Fail, 실패시 스크린샷 첨부.

---

## 2. Web Push 구독 + 수락 알림 + 클릭 + 410 cleanup (NOTIF-01)

**전제:**
- HTTPS, Chrome/Edge, 알림 권한 미리 차단되지 않은 상태.
- Worker + Biz 계정 + confirmed-pending application 1건.

**단계:**
1. Worker 로그인 → `/my` 첫 방문 → "알림을 켜보세요" 배너 확인 → 클릭 → `Notification.requestPermission()` 허용
2. DevTools → Application → Service Workers에 `/sw.js` active 상태 확인
3. Prisma Studio 또는 SQL: `SELECT * FROM public.push_subscriptions WHERE userId=<worker>` 1행 확인
4. 다른 탭에서 Biz가 해당 Worker의 application을 accept
5. OS 알림 "지원하신 '{공고명}'이 수락되었습니다" 표시 확인
6. 알림 클릭 → `/my/applications/[id]` 로 이동 확인
7. (cleanup 테스트) DevTools → Application → Push → Unsubscribe → 다시 Biz accept → DB의 push_subscriptions 해당 row 삭제 확인 (410 Gone 경로)

**성공 기준:** 1~7 모두 통과.
**실패 기록:** ( ) Pass / ( ) Fail.

---

## 3. Kakao Maps 지도 탐색 + 필터 (SEARCH-02)

**전제:**
- `NEXT_PUBLIC_KAKAO_MAP_KEY` 설정 + Kakao Developers 콘솔의 플랫폼 도메인에 `http://localhost:3000` 등록 완료.
- Seed 또는 manual로 active 공고 ≥ 5건 존재 (서울 강남 반경).

**단계:**
1. `/home` 접속 → "리스트" 기본 활성 확인
2. "지도" 토글 클릭 → 카카오맵 컨테이너 렌더 + 서울 중심 표시 + 공고 marker 1개 이상 렌더
3. 거리 필터 3km → 10km 변경 → marker 개수 증가 확인
4. Marker 클릭 → 하단 preview card (모바일) 또는 side drawer (데스크톱) 렌더
5. Preview card "상세보기" 클릭 → `/posts/[id]` 이동
6. 시간 필터 "내일" 프리셋 선택 → marker 목록이 내일 workDate 공고만 남는지 확인

**성공 기준:** 1~6 통과.
**실패 기록:** ( ) Pass / ( ) Fail.

---

## 4. Realtime postgres_changes 두 탭 (APPL-04)

**전제:**
- 동일 브라우저의 2개 탭 또는 2개 다른 브라우저 (Chrome 정상 + 시크릿).
- Worker + Biz 2개 계정 + pending application 1건.

**단계:**
1. Tab A: Worker로 `/my/applications` 열기 → pending 상태 application 1개 표시 확인
2. Tab B: Biz로 `/biz/posts/[jobId]/applicants` 열기
3. Tab B에서 "수락" 버튼 클릭
4. Tab A 화면이 자동으로 "수락됨" (confirmed) 으로 전이 확인 (60초 이내, polling fallback 기준)
5. Sonner toast 또는 배지 알림 표시 확인
6. Supabase SQL: `SELECT pubname, tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='applications'` 에 1행 확인

**성공 기준:** 1~6 모두 통과.
**실패 기록:** ( ) Pass / ( ) Fail.

---

## 5. Geofence 실 GPS (SHIFT-01)

**전제:**
- HTTPS 모바일 기기 + 매장 좌표를 알고 있는 테스트 Business.
- ST_DWithin 200m 경계 검증을 위해 매장 반경 100m 안과 300m 밖 두 위치 필요.

**단계:**
1. 테스트 Business 매장 반경 100m 안에서 Worker가 confirmed application의 `/check-in` 진입
2. "체크인" 클릭 → geolocation 허용 → 서버 ST_DWithin 통과 → 상태 `in_progress` 전이 확인
3. 매장 반경 300m 밖에서 재시도 (취소 후 새 application, 또는 DB reset)
4. "체크인" 클릭 → 에러 "현장에 도착한 뒤 다시 시도해주세요" 표시 확인

**성공 기준:** 3, 4 모두 (geofence 200m 경계 내부/외부 차이가 명확히 분리됨).
**실패 기록:** ( ) Pass / ( ) Fail.

---

## Sign-Off

- [ ] 1. QR 체크아웃 — BLOCKED ON USER: 모바일 HTTPS(ngrok/배포) + 카메라 권한 필요. 서버 side QR 생성과 jose HS256 verify는 tests/shift/checkout-jwt.test.ts 4/4 PASS로 자동 검증됨.
- [ ] 2. Web Push + 410 cleanup — BLOCKED ON USER: `.env.local`의 WEB_PUSH_VAPID_* 값이 Plan 04-10 실행 시 설정되어 있으나 수동 구독/알림 클릭/unsubscribe 흐름은 브라우저 세션 전환 필요. sendPushToUser 410 cleanup 경로는 tests/push/send-410-cleanup.test.ts로 자동 검증됨.
- [ ] 3. Kakao Maps + 필터 — BLOCKED ON USER: `.env.local`의 `NEXT_PUBLIC_KAKAO_MAP_KEY`가 Plan 04-10 실행 시 **빈 문자열** 상태. Kakao Developers 앱 등록 후 키 발급 + `http://localhost:3000` 도메인 추가 필요. 빈 키에서도 graceful degradation은 확인됨 (MapView가 Alert로 "지도 키 미설정" 안내).
- [ ] 4. Realtime 두 탭 — BLOCKED ON USER: Worker + Biz 2계정 동시 로그인 + 2 브라우저 탭 필요. 4a(postgres_changes 정상 경로) + 4b(polling fallback) 모두 수동. Plan 04-08/04-09 자동 테스트는 subscribe 함수가 subscribe()를 호출하는지만 확인하며, 실제 Realtime round-trip은 브라우저 환경에서만 검증 가능.
- [ ] 5. Geofence 실 GPS — BLOCKED ON USER: 매장 반경 100m 안/300m 밖 두 물리 위치 필요. ST_DWithin 서버 로직은 tests/shift/geofence.test.ts로 자동 검증됨.

**Checker:** _______________
**Date:** _______________

---

## Plan 04-10 Auto-Gate Status (2026-04-11)

Plan 04-10 (E2E verification) 실행 시점 자동 검증 결과 — HUMAN-UAT과 독립적으로 기록:

| Check | Result | Evidence |
|-------|--------|----------|
| Vitest full suite | 34 files / 109 tests PASS (5 todo) | `npm test` log |
| next build | 32/32 static pages + 모든 Phase 4 라우트 dynamic | `NODE_ENV=production npm run build` |
| TypeScript (next build typecheck) | 0 errors | same run |
| prisma/seed.ts | 8 applications (5 Phase 2 + 3 Phase 4 lifecycle) | `npx tsx prisma/seed.ts` |
| Supabase RLS on applications | ENABLED (5 policies) | Plan 04-03 migration applied |
| postgres_changes publication | applications 포함 | Plan 04-03 migration applied |
| pg_cron auto-accept | every 1 min scheduled | Plan 04-03 migration applied |
| pg_cron no-show detection | every 5 min scheduled | Plan 04-03 migration applied |

**Phase 4 exit gate**: 자동 검증 기준 100% GREEN. HUMAN-UAT 5 시나리오는 외부 키/모바일/HTTPS 전제 조건으로 **user에게 위임**. Phase 5 시작 전 최소 **시나리오 1 (QR 체크아웃)**, **시나리오 4a/4b (Realtime + polling fallback)** 완료 권장.
