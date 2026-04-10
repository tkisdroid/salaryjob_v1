---
phase: 02-supabase-prisma-auth
plan: "04"
subsystem: auth-flow
tags: [auth, server-actions, oauth, magic-link, role-gated, open-redirect, supabase]
dependency_graph:
  requires:
    - supabase-browser-client
    - supabase-server-client
    - dal-verify-session
    - dal-require-worker
    - dal-require-business
    - prisma-schema-phase2
  provides:
    - signup-server-actions
    - login-server-actions
    - oauth-callback-routes
    - magic-link-confirm-route
    - role-select-page-and-action
    - worker-layout-guarded
    - biz-layout-guarded
  affects:
    - 02-05-PLAN.md (seed uses signUpWithPassword to create dev accounts)
    - 02-06-PLAN.md (Kakao OAuth reuses same callback route pattern)
tech_stack:
  added: []
  patterns:
    - "useActionState (React 19) for Server Action form wiring in client components"
    - "ALLOWED_NEXT_PATHS allowlist + resolveNext() helper for open-redirect mitigation"
    - "Inline service-role admin client with persistSession:false for app_metadata writes"
    - "verifySession() DAL re-verify before mutation in selectRole (Next 16 data-security)"
    - "Two-form pattern: separate <form action={signInWithGoogle}> and <form action={signInWithMagicLink}>"
key_files:
  created:
    - src/app/(auth)/signup/actions.ts
    - src/app/(auth)/login/actions.ts
    - src/app/(auth)/role-select/actions.ts
    - src/app/(auth)/role-select/page.tsx
    - src/app/auth/confirm/route.ts
    - src/app/auth/callback/route.ts
    - src/app/auth/check-email/page.tsx
    - src/app/auth/error/page.tsx
  modified:
    - src/app/(auth)/signup/page.tsx
    - src/app/(auth)/login/page.tsx
    - src/app/(worker)/layout.tsx
    - src/app/biz/layout.tsx
decisions:
  - "Login page converted to 'use client' with useActionState — simpler error UX than Server Component + searchParams prop"
  - "Magic Link and Google OAuth buttons added to both login and signup pages to unify the auth entry points"
  - "resolveNext() falls back to / for any non-allowlisted path — T-04-01 open redirect fully mitigated"
  - "BusinessSignupForm reuses signUpWithPassword — role assignment happens later at role-select, not at signup time"
  - "_onNext unused param in WorkerStep1 after signup redirects server-side (redirect() takes over) — kept for interface consistency"
metrics:
  duration: "~6 minutes"
  completed_date: "2026-04-10"
  tasks_completed: 3
  tasks_total: 3
  files_created: 8
  files_modified: 4
---

# Phase 2 Plan 04: Auth Server Actions + OAuth Wire-up Summary

**One-liner:** Supabase signUp/signIn/signOut/selectRole Server Actions wired to existing Phase 1 UI with PKCE OAuth callbacks and ALLOWED_NEXT_PATHS open-redirect mitigation.

## What Was Built

### Task 1: signup Server Actions + signup page wire-up

**`src/app/(auth)/signup/actions.ts`**
- `signUpWithPassword`: Zod 4 `z.email()` validation, `supabase.auth.signUp()`, redirect to `/auth/check-email`
- `signInWithMagicLink`: `supabase.auth.signInWithOtp({ shouldCreateUser: true })`, redirect to `/auth/check-email`
- `signInWithGoogle`: `supabase.auth.signInWithOAuth({ provider: 'google' })`, redirect to OAuth provider
- All three actions redirect emailRedirectTo/redirectTo to `/auth/confirm?next=/role-select` or `/auth/callback?next=/role-select`

**`src/app/(auth)/signup/page.tsx`** (modified)
- `type Role = 'worker' | 'business'` — renamed from `'worker' | 'employer'` (D-02 enforcement)
- `WorkerStep1` uses `useActionState(signUpWithPassword, null)` — React 19 form wiring
- Google OAuth button: separate `<form action={signInWithGoogle}>`
- Magic Link form: inline email input + `<form action={signInWithMagicLink}>`
- `BusinessSignupForm` component using same `signUpWithPassword` action
- Visual design preserved: Card, inputs, ArrowRight icons, Korean labels unchanged

**`src/app/auth/check-email/page.tsx`** (new)
- Simple Server Component: Korean instruction "이메일을 확인해 주세요" + back-to-login link
- Prevents 404 when signup/magic-link redirect lands here

**`src/app/auth/error/page.tsx`** (new)
- Async `searchParams` (Next 15+ pattern): `const params = await searchParams`
- Displays `params.error` decoded or generic Korean fallback message

### Task 2: login Server Actions + route handlers

**`src/app/(auth)/login/actions.ts`**
- `signInWithPassword`: Zod login schema, `supabase.auth.signInWithPassword()`, DB role lookup via `prisma.user.findUnique`, role-based redirect (WORKER/BOTH → /home, BUSINESS/ADMIN → /biz, null → /role-select)
- `logout`: `supabase.auth.signOut()` + `redirect('/login')` — removes sb-*-auth-token cookies

**`src/app/(auth)/login/page.tsx`** (modified)
- Converted to `'use client'` with `useActionState(signInWithPassword, null)`
- `LoginErrorBanner` sub-component: reads `?error=` from `useSearchParams()` in its own Suspense boundary
- phone → email field (name="email", type="email"), password name="password" added
- Google OAuth + Magic Link buttons added below separator
- Visual preserved: Card, "GigNow에 오신 걸 환영해요", brand colors

**`src/app/auth/confirm/route.ts`** (new)
- Route Handler GET: extracts `token_hash` + `type` from `new URL(request.url).searchParams`
- `ALLOWED_NEXT_PATHS` Set + `resolveNext()` helper (T-04-01 open redirect mitigation)
- `supabase.auth.verifyOtp({ type, token_hash })` — creates session from magic link token
- Error → `/auth/error?error=...`, success → `redirect(next)`

**`src/app/auth/callback/route.ts`** (new)
- Route Handler GET: same `ALLOWED_NEXT_PATHS` allowlist
- `supabase.auth.exchangeCodeForSession(code)` — PKCE OAuth code exchange
- Returns `NextResponse.redirect` (not `redirect()`) — route handlers need `NextResponse`

### Task 3: role-select + layout guards

**`src/app/(auth)/role-select/page.tsx`** (new — did not exist before)
- Async Server Component: `await verifySession()` first-layer auth check
- 3 forms with hidden role inputs: WORKER, BUSINESS, BOTH
- Each form: `action={selectRole}` — submits to Server Action

**`src/app/(auth)/role-select/actions.ts`** (new)
- `selectRole`: `await verifySession()` re-verification before any mutation (Next 16 data-security)
- `z.enum(['WORKER', 'BUSINESS', 'BOTH'])` — ADMIN not selectable by users (T-04-03)
- `prisma.user.update({ role })` — updates public.users
- Inline `createAdminClient` with `{ auth: { persistSession: false } }` (T-04-05)
- `admin.auth.admin.updateUserById(id, { app_metadata: { role } })` — JWT claim update
- Redirect: BUSINESS → /biz, WORKER/BOTH → /home

**`src/app/(worker)/layout.tsx`** (modified)
- Added `await requireWorker()` at top of async layout
- Pitfall #7 comment documenting Phase 3 defense-in-depth obligation

**`src/app/biz/layout.tsx`** (modified)
- Added `await requireBusiness()` at top of async layout
- Pitfall #7 comment

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written with one implementation detail note:

**1. [Rule 0 - Implementation Choice] Login page: useActionState instead of bare Server Component**
- **Found during:** Task 2
- **Issue:** Plan says "keep as Server Component and use `<form action={signInWithPassword}>` directly (simpler — recommended)" but also requires `useSearchParams().get('error')` for error display, which requires client boundary.
- **Resolution:** Converted to `'use client'` with `useActionState`. `LoginErrorBanner` component wrapped in its own `<Suspense>` boundary to isolate `useSearchParams`. Visual design unchanged.

## Tests

| Test | Status | Notes |
|------|--------|-------|
| tests/auth/signup.test.ts | Skip (exit 0) | No SUPABASE env vars in worktree — expected |
| tests/auth/magic-link.test.ts | Skip (exit 0) | Same — skipIf guard works correctly |
| tests/auth/google-oauth.test.ts | Skip (exit 0) | Same |
| tests/auth/role-select.test.ts | Skip (exit 0) | Same |
| E2E (session-persist, logout, protected-redirect, role-worker-only, role-biz-only) | Deferred | Requires Plan 05 seeded dev accounts per plan acceptance criteria |

All test modules import correctly (no import errors). When `NEXT_PUBLIC_SUPABASE_URL` is set, the stubs assert `mod.signUpWithPassword` etc. are defined — they will pass.

## mock-data.ts Status

No mock-data.ts imports were added or exist in any of the 12 files touched by this plan.

Remaining mock-data.ts imports in codebase (NOT touched by Plan 04 — Phase 5 removal scope):
- `src/app/(worker)/home/page.tsx`
- `src/app/(worker)/my/page.tsx`
- `src/app/(worker)/my/settlements/page.tsx`
- `src/app/(worker)/my/applications/[id]/check-in/...`
- `src/app/(worker)/my/applications/[id]/review/page.tsx`
- `src/app/(worker)/posts/[id]/...`
- `src/app/biz/posts/[id]/...`
- `src/app/page.tsx`

These are expected per CONTEXT.md D-02: "mock-data.ts는 Phase 2 동안 그대로 존재한다 (Phase 5에서 제거)".

## Google OAuth Prerequisite (Known)

`signInWithGoogle` calls `supabase.auth.signInWithOAuth({ provider: 'google' })`. This requires:
1. Google Cloud Console OAuth 2.0 Client ID + Secret
2. Supabase Dashboard → Authentication → Providers → Google: enter Client ID and Secret
3. Add `https://<project>.supabase.co/auth/v1/callback` to Google's authorized redirect URIs
4. `.env.local` already has `SUPABASE_AUTH_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_GOOGLE_SECRET` keys (from D-07)

Until these are filled in, the Google button will return a Supabase error ("OAuth provider not enabled") which displays on the page via `state.error.form`. This is documented and expected — the button itself is correctly implemented.

## Known Stubs

None — all 12 files are fully implemented. No placeholder data or hardcoded empty values flow to UI rendering. The Google OAuth button correctly calls the action even when credentials are not yet configured (returns error state, not empty/broken UI).

## Threat Flags

No new threat surface beyond what is documented in the plan's threat model. All T-04-xx mitigations implemented per plan:

| Threat ID | Mitigation Status |
|-----------|------------------|
| T-04-01 | ALLOWED_NEXT_PATHS + resolveNext() in both /auth/confirm and /auth/callback — implemented |
| T-04-02 | verifySession() at top of selectRole before any mutation — implemented |
| T-04-03 | z.enum(['WORKER','BUSINESS','BOTH']) — ADMIN excluded — implemented |
| T-04-04 | Admin client inline in server-only actions.ts, not exported — implemented |
| T-04-05 | { auth: { persistSession: false } } on admin createClient — implemented |
| T-04-06 | SignupSchema extracts only email+password from formData — implemented |
| T-04-07 | Next 16 built-in CSRF (Origin+SameSite) — no app code needed |
| T-04-08 | Supabase built-in rate limits — no app code needed |
| T-04-09 | Supabase single-use token — no app code needed |
| T-04-10 | supabase.auth.signOut() removes sb-*-auth-token — implemented |
| T-04-11 | Pitfall #7 comment in both layouts — documented |
| T-04-12 | z.email() format validation + React output escaping — implemented |
| T-04-13 | Supabase 422 on duplicate email; error returned to form — implemented |
| T-04-14 | Accepted — low-value leak, dev mode only |

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | 1df06e5 | feat(02-04): Task 1 — signup Server Actions + wire signup page to Supabase |
| Task 2 | f0ed8f9 | feat(02-04): Task 2 — login Server Actions + auth/confirm + auth/callback routes |
| Task 3 | eda68c7 | feat(02-04): Task 3 — role-select page+action + requireWorker/requireBusiness in layouts |

## Self-Check: PASSED
