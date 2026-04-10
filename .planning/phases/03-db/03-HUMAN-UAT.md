---
status: partial
phase: 03-db
source: [03-VERIFICATION.md]
started: 2026-04-10T19:10:00Z
updated: 2026-04-10T19:10:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. End-to-end Worker profile edit (WORK-01..04) — live browser
expected: Log in as `worker@dev.gignow.com` → `/my/profile/edit` → change name/nickname/bio/preferredCategories → save → reload page → values persist; upload a 2MB JPG → avatar appears in header + /my; try to upload a 6MB file → client rejects with 5MB error
why_human: React 19 useActionState + FormData + Supabase Storage upsert + @supabase/ssr cookie auth cannot be fully simulated via unit tests. The DAL + Storage RLS combo only executes under real browser cookies.
result: [pending]

### 2. End-to-end Business profile edit (BIZ-01..03) — live browser
expected: Log in as `business@dev.gignow.com` → `/biz/profile` → 1 profile visible; edit name/address/category/logo emoji/description/lat/lng → save → reload → values persist; log in as `admin@dev.gignow.com` → see 6+ BusinessProfile rows and confirm each form isolates fields by profileId
why_human: 1:many BusinessProfile rendering per user + per-profile form isolation can only be validated under real multi-profile seed data in the browser.
result: [pending]

### 3. POST-01 createJob end-to-end — full 5-step form
expected: Log in as `business@dev.gignow.com` → `/biz/posts/new` → fill 5-step form (title/category/hourlyPay/transportFee/workDate/startTime/endTime/headcount/address/dressCode/duties/requirements/whatToBring/tags) → publish → redirected to `/biz/posts/{id}` → new job visible on `/biz/posts` and on public `/` landing → `/posts/{id}` detail renders ALL populated Phase 3 sections (주요 업무, 지원 조건, 복장, 준비물, 태그)
why_human: Server Action + FormData + redirect() + revalidatePath chain under real auth session. Validates the end-to-end write→read loop.
result: [pending]

### 4. POST-03 updateJob + deleteJob end-to-end
expected: As `business@dev.gignow.com`, navigate to `/biz/posts/{id}` → modify fields → save → reload → modifications persist; click Delete on `/biz/posts/{id}` → confirm → redirected to `/biz/posts` with row removed
why_human: Same Server Action + cookie auth + revalidate loop as POST-01.
result: [pending]

### 5. Anonymous visitor landing page POST-04 pagination flow
expected: Open `/` in incognito/unauthenticated browser → see ≥1 job from DB in the list → scroll to bottom → more jobs lazy-load via IntersectionObserver → click a job card → `/posts/{id}` loads without redirect to `/login` → click 원탭 지원 → redirects to `/login?next=/posts/{id}`
why_human: Middleware isAuthPublic matching + IntersectionObserver + client/SSR cursor handoff require a real browser (jsdom does not provide IntersectionObserver).
result: [pending]

### 6. Worker /home geolocation + distance sort (D-06)
expected: Log in as `worker@dev.gignow.com` → `/home` → click '내 근처 공고 먼저 보기' → browser shows geolocation permission prompt → allow → subsequent scroll shows jobs sorted by distance (closer first); deny permission → Seoul City Hall fallback banner appears; click 위치 권한 다시 요청 → prompt reappears
why_human: navigator.geolocation permission prompt is a browser primitive.
result: [pending]

### 7. Worker avatar upload — Storage RLS path scoping
expected: As `worker@dev.gignow.com`, attempt to upload `avatars/{other-user-id}/avatar.png` directly via @supabase/supabase-js → expect 403 (Storage RLS blocks). As `worker@dev.gignow.com`, upload `avatars/{self}/avatar.png` → expect success.
why_human: Storage RLS enforcement under the authenticated JWT only reproduces under real auth session.
result: [pending]

### 8. pg_cron expiry — 5 minute sweep (POST-06 wall-clock)
expected: Insert a test job with workDate = today and startTime 6 minutes in the past → wait ≤ 5 minutes → query the row → status = 'expired'
why_human: pg_cron runs on Supabase's scheduler, not on test invocation. Requires wall-clock waiting. Lazy filter already covers the render-time side.
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
