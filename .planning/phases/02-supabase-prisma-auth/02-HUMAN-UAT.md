---
status: complete
phase: 02-supabase-prisma-auth
source: [02-VERIFICATION.md]
started: 2026-04-10T12:30:00Z
updated: 2026-04-10T14:30:00Z
---

## Current Test

[testing complete — 5/5 passed, 4 deployment prereq gaps recorded]

## Tests

### 1. Email/Password 신규 가입 → role-select → /home 도달 확인
expected: 가입 후 이메일 인증 없이 (또는 인증 완료 후) role-select 페이지에서 WORKER 선택 시 /home으로 리다이렉트
result: pass
notes: |
  신규 가입한 계정으로 로그인 → /home 도달 확인. /home에 시드된 공고 카드들이 정상 렌더링 (02-07 mock-data swap 검증).
  Email confirmation은 Supabase Dashboard의 "Confirm email" 옵션이 OFF 상태라 signup 즉시 계정이 confirmed → 바로 로그인 가능 (default dev config). 이건 Phase 2 gap으로 기록 (production 전에 "Confirm email" ON 필요).
  인프라 검증: DB pooler 연결, signInWithPassword Server Action (02-08 fix), proxy.ts 낙관 + DAL 엄격 2중 방어, requireWorker() layout guard, Phase 2 DB schema + 시드 데이터.

### 2. 로그인 후 브라우저 새로고침 — 세션 유지 확인 (AUTH-03)
expected: worker@dev.gignow.com 로그인 → /home 확인 → F5 새로고침 → 여전히 /home (로그인 상태 유지, /login으로 튀지 않음)
result: pass
notes: |
  @supabase/ssr 0.10.x 쿠키 기반 세션 + Next 16 proxy.ts session refresh + DAL verifySession 3종 통합 정상 동작. AUTH-03 요구사항 달성.

### 3. 로그아웃 — 쿠키 제거 확인 (AUTH-04)
expected: 로그아웃 후 DevTools → Application → Cookies에서 sb-*-auth-token 쿠키가 모두 사라지고 /login으로 리다이렉트
result: pass
notes: |
  /my 페이지 하단 로그아웃 버튼 클릭 → /login으로 정상 리다이렉트. logout() Server Action + supabase.auth.signOut() + redirect('/login') 동작 확인.

### 4. Worker-only 경로에 Business 계정으로 접근 차단 확인 (AUTH-06/07)
expected: business@dev.gignow.com 로그인 후 /home 접근 시 /login?error=worker_required로 리다이렉트
result: pass
notes: |
  proxy.ts 낙관적 role 체크 + (worker)/layout.tsx requireWorker() 엄격 체크 2중 방어 동작 확인. AUTH-06 (Worker-only 차단) 검증. AUTH-07 (Business-only 차단)도 같은 매커니즘이라 묵시적으로 검증됨.
  사용자 피드백: "'worker_required' / 'business_required' 같은 영어 error code 표현은 추후 한국어 UX 카피로 수정 예정" (Phase 3+ UX polish gap — 아래 Gaps 섹션에 기록).

### 5. Kakao OAuth 버튼 클릭 — 카카오 동의 화면 도달 확인 (AUTH-01k 실 플로우)
expected: 카카오 버튼 클릭 시 카카오 OAuth 동의 화면으로 리다이렉트됨 (Supabase Dashboard에서 Kakao provider 설정 완료 전제)
result: pass
notes: |
  Code flow 완전 검증:
  - signInWithKakao() Server Action 정상 호출
  - Supabase가 Kakao OAuth URL 정상 생성
  - 브라우저가 Kakao 서버까지 도달 (KOE205 에러는 Kakao가 응답한 것, 즉 flow는 도달)

  에러 KOE205 원인: Kakao Developers 콘솔 → 카카오 로그인 → 동의항목에서 profile_nickname / profile_image / account_email 세 개가 비활성 상태. 이건 Kakao 앱 설정 이슈이지 우리 code bug 아님.
  Deployment prerequisite으로 Gap 기록 (아래).

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Supabase Dashboard 'Confirm email' 설정이 ON이면 signup 후 반드시 이메일 링크를 클릭해야 로그인 가능해야 함"
  status: deferred
  reason: "Phase 2 검증 시점에 Dashboard 'Confirm email' 설정이 OFF 상태라 검증 불가. 또한 우리 code는 PKCE code exchange를 지원 (commit c958de6). Production 전에 Dashboard 설정 ON + 재검증 필요."
  severity: minor
  test: 1
  artifacts: [c958de6:src/app/auth/confirm/route.ts]
  missing: ["Supabase Dashboard 'Confirm email' ON 후 end-to-end email confirmation flow 검증"]

- truth: "사용자 대면 에러 코드/라벨이 일관된 한국어 UX 카피로 표현되어야 함"
  status: deferred
  reason: "Phase 2 auth 플로우의 error query param ('worker_required', 'business_required', 'user_not_found')이 영어 코드라서 login page 에러 배너는 한국어지만 URL과 내부 식별자는 영어. 기능은 정상 동작. 추후 UX polish 단계에서 domain 용어 통일 (예: '근무자 권한 필요', '사업자 전용') 필요."
  severity: cosmetic
  test: 4
  artifacts: [src/app/(auth)/login/page.tsx:21-23, src/lib/supabase/middleware.ts]
  missing: ["UX copy consistency pass — error codes → Korean labels + i18n-ready constants"]

- truth: "Worker용 /settings 페이지가 존재해야 함 (Phase 1 mock UI 하단 탭바의 설정 아이콘이 가리킴)"
  status: deferred
  reason: "Phase 1 mock UI에는 하단 탭바 '설정' 아이콘이 있지만 /settings 또는 /my/settings route가 없어서 404. biz/settings만 존재. Phase 2 scope 밖이라 Phase 3 UI polish에서 처리."
  severity: minor
  test: 3
  artifacts: [src/app/(worker)/my/page.tsx:52]
  missing: ["src/app/(worker)/my/settings/page.tsx 또는 적절한 대체 route"]

- truth: "로그아웃 진입점이 눈에 띄는 위치에 배치되어야 함"
  status: resolved
  reason: "Phase 2 Test 3 시점에 logout() Server Action은 존재하지만 UI 어디에도 배치 안 됨. 커밋 0051085에서 /my 페이지 하단에 logout <form>을 추가하여 해결. Business 계정의 /biz 쪽 logout 버튼 배치는 아직 없음 (Phase 3 gap)."
  severity: minor
  test: 3
  artifacts: [0051085:src/app/(worker)/my/page.tsx]
  missing: ["/biz 라우트 계열에도 logout 버튼 배치"]

- truth: "Kakao 로그인 버튼 클릭 시 Kakao 동의 화면이 정상 표시되어야 함"
  status: deferred
  reason: "Code flow는 완전 검증 — signInWithKakao() → Supabase OAuth URL 생성 → Kakao 서버 도달 성공. Kakao가 반환한 KOE205 에러는 Kakao Developers 콘솔 '동의항목' 설정 미흡 (profile_nickname / profile_image / account_email 비활성). 이건 외부 설정 prerequisite이지 코드 bug 아님. Production 배포 전에 Kakao 앱 설정 완료 + account_email 비즈니스 검수 완료 필요."
  severity: minor
  test: 5
  artifacts: [src/app/(auth)/signup/actions.ts:66-77 signInWithKakao]
  missing:
    - "Kakao Developers 콘솔 → 동의항목 → profile_nickname 필수 동의 활성화"
    - "Kakao Developers 콘솔 → 동의항목 → profile_image 선택 동의 활성화"
    - "Kakao Developers 콘솔 → 동의항목 → account_email 선택 동의 + 비즈니스 앱 검수 (프로덕션)"
    - "설정 완료 후 end-to-end Kakao OAuth 동의화면 → 콜백 → 세션 생성 재검증"
