---
status: testing
phase: 02-supabase-prisma-auth
source: [02-VERIFICATION.md]
started: 2026-04-10T12:30:00Z
updated: 2026-04-10T13:15:00Z
---

## Current Test

number: 1
name: Email/Password 신규 가입 → role-select → /home 도달 확인
expected: |
  가입 후 이메일 인증 없이 (또는 인증 완료 후) role-select 페이지에서 WORKER 선택 시 /home으로 리다이렉트
awaiting: user response

## Tests

### 1. Email/Password 신규 가입 → role-select → /home 도달 확인
expected: 가입 후 이메일 인증 없이 (또는 인증 완료 후) role-select 페이지에서 WORKER 선택 시 /home으로 리다이렉트
result: [pending]

### 2. 로그인 후 브라우저 새로고침 — 세션 유지 확인 (AUTH-03)
expected: worker@dev.gignow.com 로그인 → /home 확인 → F5 새로고침 → 여전히 /home (로그인 상태 유지, /login으로 튀지 않음)
result: [pending]

### 3. 로그아웃 — 쿠키 제거 확인 (AUTH-04)
expected: 로그아웃 후 DevTools → Application → Cookies에서 sb-*-auth-token 쿠키가 모두 사라지고 /login으로 리다이렉트
result: [pending]

### 4. Worker-only 경로에 Business 계정으로 접근 차단 확인 (AUTH-06/07)
expected: business@dev.gignow.com 로그인 후 /home 접근 시 /login?error=worker_required로 리다이렉트
result: [pending]

### 5. Kakao OAuth 버튼 클릭 — 카카오 동의 화면 도달 확인 (AUTH-01k 실 플로우)
expected: 카카오 버튼 클릭 시 카카오 OAuth 동의 화면으로 리다이렉트됨 (Supabase Dashboard에서 Kakao provider 설정 완료 전제)
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
